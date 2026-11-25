import { db } from "../db.js";
import {
  tracker_objects,
  tracker_event_cache,
  tracker_sync_state,
  tracking_api_configs,
  vehicles,
  owners,
  tracker_payments,
  tracker_companies,
  vehicle_types,
} from "../../shared/schema.js";
import { and, desc, eq, lt, ne, notInArray, sql } from "drizzle-orm";
import { httpFetch } from "../utils/httpClient.js";

const EVENT_RETENTION_DAYS = 3;
const DEFAULT_SPEED_THRESHOLD = 50;

function normalizePlate(raw?: string | null): string {
  if (!raw) return "";
  return raw
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9-]/g, "");
}

/** Extract plate from names like "(Bus) W-11 (JF-0778)" or "(SBC) JP-5055" or "Lal Sher (JZ-1103)". */
export function extractPlateFromName(name?: string | null): string {
  if (!name) return "";
  const parenMatches = [...name.matchAll(/\(([^)]+)\)/g)].map((m) => m[1].trim());
  if (parenMatches.length > 0) {
    // Prefer last parenthetical that looks like a plate (has digit)
    for (let i = parenMatches.length - 1; i >= 0; i--) {
      const candidate = parenMatches[i];
      if (/\d/.test(candidate) && !/^(BUS|SBC|DUM)$/i.test(candidate)) {
        return normalizePlate(candidate);
      }
    }
  }
  return normalizePlate(name);
}

function parseMaybeDate(value: unknown): Date | null {
  if (value == null || value === "" || value === "0000-00-00" || value === "0000-00-00 00:00:00") {
    return null;
  }
  const str = String(value).trim();
  if (!str) return null;
  const date = str.includes("T") || str.includes("Z") || str.includes("+")
    ? new Date(str)
    : new Date(str.replace(" ", "T") + "Z");
  return isNaN(date.getTime()) ? null : date;
}

function formatApiDate(date: Date): string {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

function toBool(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (value == null) return fallback;
  const s = String(value).toLowerCase();
  if (s === "true" || s === "1") return true;
  if (s === "false" || s === "0") return false;
  return fallback;
}

function buildEssplUrl(config: any, cmd: string): string {
  let baseUrl = String(config.api_url || "").replace(/\/$/, "");
  if (!baseUrl.includes("/api/api.php") && !baseUrl.includes("/api/")) {
    baseUrl = `${baseUrl}/api/api.php`;
  }
  let params: any = {};
  try {
    if (typeof config.api_params === "string") params = JSON.parse(config.api_params || "{}");
    else if (config.api_params && typeof config.api_params === "object") params = config.api_params;
  } catch {
    params = {};
  }
  const apiName = params.api || "user";
  const version = params.ver || "1.0";
  return `${baseUrl}?api=${apiName}&ver=${version}&key=${config.api_key}&cmd=${cmd}`;
}

async function fetchEssplJson(config: any, cmd: string): Promise<any[]> {
  const url = buildEssplUrl(config, cmd);
  console.log(`[EssplFleet] GET ${url.replace(config.api_key, "***")}`);

  const response = await httpFetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "User-Agent": "DIG-FleetReports/1.0",
    },
    timeout: 60000,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText);
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  const text = await response.text();
  if (!text || !text.trim()) return [];

  let data: any;
  try {
    data = JSON.parse(text);
  } catch (e: any) {
    throw new Error(`Invalid JSON from ESSPL: ${e.message}`);
  }

  if (Array.isArray(data)) return data;
  if (data?.data && Array.isArray(data.data)) return data.data;
  if (data?.events && Array.isArray(data.events)) return data.events;
  if (data && typeof data === "object") return [data];
  return [];
}

async function getUsableConfigs(): Promise<any[]> {
  return db
    .select()
    .from(tracking_api_configs)
    .where(and(ne(tracking_api_configs.status, "inactive"), eq(tracking_api_configs.auto_sync, true)));
}

async function getOrCreateSyncState(configId: number, syncKey: string) {
  const existing = await db
    .select()
    .from(tracker_sync_state)
    .where(
      and(
        eq(tracker_sync_state.tracking_api_config_id, configId),
        eq(tracker_sync_state.sync_key, syncKey)
      )
    )
    .limit(1);

  if (existing[0]) return existing[0];

  const [created] = await db
    .insert(tracker_sync_state)
    .values({
      tracking_api_config_id: configId,
      sync_key: syncKey,
      last_event_id: "0",
      last_status: "init",
    })
    .returning();
  return created;
}

async function updateSyncState(
  configId: number,
  syncKey: string,
  patch: Partial<{
    last_event_id: string | null;
    last_success_at: Date | null;
    last_attempt_at: Date | null;
    last_status: string | null;
    last_error: string | null;
    meta: any;
  }>
) {
  await db
    .update(tracker_sync_state)
    .set({ ...patch, updated_at: new Date() })
    .where(
      and(
        eq(tracker_sync_state.tracking_api_config_id, configId),
        eq(tracker_sync_state.sync_key, syncKey)
      )
    );
}

async function buildVehiclePlateMap(): Promise<Map<string, number>> {
  const rows = await db
    .select({
      id: vehicles.id,
      plate: vehicles.vehicle_register_number,
    })
    .from(vehicles);

  const map = new Map<string, number>();
  for (const row of rows) {
    const key = normalizePlate(row.plate);
    if (key && !map.has(key)) map.set(key, row.id);
    const noDash = key.replace(/-/g, "");
    if (noDash && !map.has(noDash)) map.set(noDash, row.id);
  }
  return map;
}

export function deriveFleetStatus(obj: {
  active?: boolean | null;
  speed?: number | null;
  dt_tracker?: Date | null;
  params?: any;
  object_expire?: boolean | null;
}): string {
  const now = Date.now();
  const last = obj.dt_tracker ? obj.dt_tracker.getTime() : 0;
  const ageHours = last ? (now - last) / (1000 * 60 * 60) : Infinity;

  if (obj.object_expire) return "Inactive";
  if (obj.active === false || ageHours > 24 * 7) return "Inactive";
  if (ageHours > 24) return "Offline";

  const speed = obj.speed || 0;
  const acc = String(obj.params?.acc ?? "");
  if (speed > 0) return "Moving";
  if (acc === "1") return "Idle";
  return "Parked";
}

export class EssplFleetService {
  /**
   * Sync fleet objects from USER_GET_OBJECTS and match plate_number to DIG vehicles.
   */
  async syncObjectsFromConfigs(): Promise<{ configs: number; upserted: number; matched: number; removed: number }> {
    const configs = await getUsableConfigs();
    if (configs.length === 0) {
      console.log("[EssplFleet] No auto_sync API configs for object sync");
      return { configs: 0, upserted: 0, matched: 0, removed: 0 };
    }

    const plateMap = await buildVehiclePlateMap();
    let upserted = 0;
    let matched = 0;
    let removed = 0;

    for (const config of configs) {
      const syncKey = "USER_GET_OBJECTS";
      await getOrCreateSyncState(config.id, syncKey);
      await updateSyncState(config.id, syncKey, { last_attempt_at: new Date() });

      try {
        const rows = await fetchEssplJson(config, "USER_GET_OBJECTS");
        const seenImeis = new Set<string>();
        for (const raw of rows) {
          const imei = String(raw.imei || "").trim();
          if (!imei) continue;
          seenImeis.add(imei);

          const plate =
            normalizePlate(raw.plate_number) ||
            extractPlateFromName(raw.name) ||
            null;

          let vehicleId: number | null = null;
          if (plate) {
            vehicleId =
              plateMap.get(plate) ||
              plateMap.get(plate.replace(/-/g, "")) ||
              null;
          }

          const payload = {
            imei,
            plate_number: plate,
            name: raw.name ? String(raw.name).slice(0, 255) : null,
            device: raw.device ? String(raw.device) : null,
            sim_number: raw.sim_number ? String(raw.sim_number) : null,
            model: raw.model ? String(raw.model) : null,
            vin: raw.vin ? String(raw.vin) : null,
            protocol: raw.protocol ? String(raw.protocol) : null,
            active: toBool(raw.active, true),
            object_expire: toBool(raw.object_expire, false),
            object_expire_dt: parseMaybeDate(raw.object_expire_dt),
            lat: raw.lat != null && raw.lat !== "" ? String(raw.lat) : null,
            lng: raw.lng != null && raw.lng !== "" ? String(raw.lng) : null,
            speed: parseInt(String(raw.speed ?? 0), 10) || 0,
            altitude: raw.altitude != null ? parseInt(String(raw.altitude), 10) || null : null,
            angle: raw.angle != null ? parseInt(String(raw.angle), 10) || null : null,
            dt_tracker: parseMaybeDate(raw.dt_tracker),
            dt_server: parseMaybeDate(raw.dt_server),
            dt_last_stop: parseMaybeDate(raw.dt_last_stop),
            dt_last_idle: parseMaybeDate(raw.dt_last_idle),
            dt_last_move: parseMaybeDate(raw.dt_last_move),
            odometer: raw.odometer != null && raw.odometer !== "" ? String(raw.odometer) : null,
            engine_hours: raw.engine_hours != null && raw.engine_hours !== "" ? String(raw.engine_hours) : null,
            params: raw.params && typeof raw.params === "object" ? raw.params : {},
            loc_valid: raw.loc_valid != null ? toBool(raw.loc_valid, false) : null,
            vehicle_id: vehicleId,
            tracker_company_id: config.tracker_company_id || null,
            tracking_api_config_id: config.id,
            matched_at: vehicleId ? new Date() : null,
            last_synced_at: new Date(),
            updated_at: new Date(),
          };

          await db
            .insert(tracker_objects)
            .values(payload as any)
            .onConflictDoUpdate({
              target: tracker_objects.imei,
              set: payload as any,
            });

          upserted += 1;
          if (vehicleId) matched += 1;
        }

        // Drop objects this API no longer returns. Skip an empty response so a bad payload cannot wipe the table.
        let removedForConfig = 0;
        if (seenImeis.size > 0) {
          const deleted = await db
            .delete(tracker_objects)
            .where(
              and(
                eq(tracker_objects.tracking_api_config_id, config.id),
                notInArray(tracker_objects.imei, [...seenImeis])
              )
            )
            .returning({ id: tracker_objects.id });
          removedForConfig = deleted.length;
          removed += removedForConfig;
        } else {
          console.warn(`[EssplFleet] Config ${config.id} returned no objects; kept existing tracker_objects`);
        }

        await updateSyncState(config.id, syncKey, {
          last_success_at: new Date(),
          last_status: "success",
          last_error: null,
          meta: { upserted, matched, removed: removedForConfig, count: rows.length },
        });
      } catch (error: any) {
        console.error(`[EssplFleet] Object sync failed for config ${config.id}:`, error.message);
        await updateSyncState(config.id, syncKey, {
          last_status: "failed",
          last_error: error.message || "Unknown error",
        });
      }
    }

    console.log(`[EssplFleet] Object sync done: configs=${configs.length}, upserted=${upserted}, matched=${matched}, removed=${removed}`);
    return { configs: configs.length, upserted, matched, removed };
  }

  /**
   * Poll OBJECT_GET_LAST_EVENTS_ID_OSP and store only speed > threshold.
   */
  async pollOverspeedEvents(): Promise<{ inserted: number; skipped: number }> {
    const configs = await getUsableConfigs();
    let inserted = 0;
    let skipped = 0;

    for (const config of configs) {
      const threshold = config.speed_threshold ?? DEFAULT_SPEED_THRESHOLD;
      // Prefer ID poll (has event_id). OSP-only endpoints often omit event_id.
      const syncKey = "OBJECT_GET_LAST_EVENTS_ID";
      const state = await getOrCreateSyncState(config.id, syncKey);
      const lastId = state.last_event_id && state.last_event_id !== "0" ? state.last_event_id : "0";

      await updateSyncState(config.id, syncKey, { last_attempt_at: new Date() });

      try {
        // Seed with LAST_EVENTS (includes event_id). Then poll by id.
        const cmd =
          lastId === "0"
            ? "OBJECT_GET_LAST_EVENTS"
            : `OBJECT_GET_LAST_EVENTS_ID,${lastId}`;

        const rows = await fetchEssplJson(config, cmd);
        const objectByImei = await this.getObjectLookup();
        let maxEventId = lastId === "0" ? 0 : parseInt(lastId, 10) || 0;

        for (const raw of rows) {
          const eventId = raw.event_id != null ? String(raw.event_id) : null;
          if (eventId) {
            const n = parseInt(eventId, 10);
            if (!isNaN(n) && n > maxEventId) maxEventId = n;
          }

          const eventDesc = String(raw.event_desc || raw.type || "").toLowerCase();
          const isOverspeed =
            eventDesc.includes("overspeed") ||
            String(raw.type || "").toLowerCase() === "overspeed";
          if (!isOverspeed && lastId !== "0") {
            // ID poll returns all event types — keep cursor moving, skip non-overspeed
            skipped += 1;
            continue;
          }

          const speed = parseInt(String(raw.speed ?? 0), 10) || 0;
          if (speed <= threshold) {
            skipped += 1;
            continue;
          }

          const name = String(raw.name || "Unknown");
          const plate = extractPlateFromName(name) || null;
          const imei = raw.imei ? String(raw.imei) : null;
          const obj = imei ? objectByImei.get(imei) : undefined;

          const dtTracker = parseMaybeDate(raw.dt_tracker) || new Date();
          const dtServer = parseMaybeDate(raw.dt_server);

          try {
            if (eventId) {
              const existing = await db
                .select({ id: tracker_event_cache.id })
                .from(tracker_event_cache)
                .where(eq(tracker_event_cache.event_id, eventId))
                .limit(1);
              if (existing.length > 0) {
                skipped += 1;
                continue;
              }
            }

            await db.insert(tracker_event_cache).values({
              event_id: eventId,
              imei,
              event_type: raw.type ? String(raw.type) : "overspeed",
              event_desc: String(raw.event_desc || "OverSpeed").slice(0, 100),
              name: name.slice(0, 255),
              plate_number: plate || obj?.plate_number || null,
              dt_tracker: dtTracker,
              dt_server: dtServer,
              lat: raw.lat != null && raw.lat !== "" ? String(raw.lat) : null,
              lng: raw.lng != null && raw.lng !== "" ? String(raw.lng) : null,
              speed,
              altitude: raw.altitude != null ? parseInt(String(raw.altitude), 10) || null : null,
              angle: raw.angle != null ? parseInt(String(raw.angle), 10) || null : null,
              vehicle_id: obj?.vehicle_id || null,
              tracker_object_id: obj?.id || null,
              tracker_company_id: config.tracker_company_id || null,
              tracking_api_config_id: config.id,
              source_cmd: cmd.split(",")[0],
            } as any);

            inserted += 1;
          } catch (insertErr: any) {
            skipped += 1;
            console.warn("[EssplFleet] Skip event insert:", insertErr.message);
          }
        }

        // After first OSP seed, advance cursor using max known id from any later ID poll.
        // If still 0, next run will re-seed OSP (dedupe by event_id / natural skip).
        await updateSyncState(config.id, syncKey, {
          last_event_id: String(maxEventId || lastId),
          last_success_at: new Date(),
          last_status: "success",
          last_error: null,
          meta: { inserted, skipped, threshold, fetched: rows.length, cmd: cmd.split(",")[0] },
        });
      } catch (error: any) {
        console.error(`[EssplFleet] Overspeed poll failed for config ${config.id}:`, error.message);
        await updateSyncState(config.id, syncKey, {
          last_status: "failed",
          last_error: error.message || "Unknown error",
        });
      }
    }

    console.log(`[EssplFleet] Overspeed poll: inserted=${inserted}, skipped=${skipped}`);
    return { inserted, skipped };
  }

  /**
   * On-demand fetch for a date range (may temporarily store rows older than 3 days).
   * Nightly purge will remove them again.
   */
  async fetchOverspeedDateRange(
    startDate: Date,
    endDate: Date,
    configId?: number
  ): Promise<{ inserted: number; skipped: number }> {
    let configs = await getUsableConfigs();
    if (configId) configs = configs.filter((c) => c.id === configId);
    if (configs.length === 0) {
      // Fall back to any non-inactive config for manual report fetch
      configs = await db
        .select()
        .from(tracking_api_configs)
        .where(ne(tracking_api_configs.status, "inactive"));
      if (configId) configs = configs.filter((c) => c.id === configId);
    }

    let inserted = 0;
    let skipped = 0;
    const startStr = encodeURIComponent(formatApiDate(startDate));
    const endStr = encodeURIComponent(formatApiDate(endDate));
    const objectByImei = await this.getObjectLookup();

    for (const config of configs) {
      const threshold = config.speed_threshold ?? DEFAULT_SPEED_THRESHOLD;
      // Prefer events-with-speed date command; also try OBJECT_GET_OSP as fallback.
      const cmds = [
        `OBJECT_GET_LAST_EVENTS_ID_OSP,${startStr},${endStr}`,
        `OBJECT_GET_OSP,${startStr},${endStr}`,
      ];

      for (const cmd of cmds) {
        try {
          const rows = await fetchEssplJson(config, cmd);
          if (rows.length === 0) continue;

          for (const raw of rows) {
            const speedRaw = raw.speed ?? raw.Speed;
            // OBJECT_GET_OSP sample has no speed — skip those for overspeed cache
            if (speedRaw == null || speedRaw === "") {
              skipped += 1;
              continue;
            }
            const speed = parseInt(String(speedRaw), 10) || 0;
            if (speed <= threshold) {
              skipped += 1;
              continue;
            }

            const name = String(raw.name || raw.VehicleNo || "Unknown");
            const plate =
              extractPlateFromName(name) ||
              normalizePlate(raw.plate_number) ||
              null;
            const imei = raw.imei ? String(raw.imei) : null;
            const obj = imei ? objectByImei.get(imei) : undefined;
            const dtTracker =
              parseMaybeDate(raw.dt_tracker || raw.DateTime) || new Date();
            const eventId = raw.event_id != null ? String(raw.event_id) : null;

            if (eventId) {
              const existing = await db
                .select({ id: tracker_event_cache.id })
                .from(tracker_event_cache)
                .where(eq(tracker_event_cache.event_id, eventId))
                .limit(1);
              if (existing.length > 0) {
                skipped += 1;
                continue;
              }
            }

            await db.insert(tracker_event_cache).values({
              event_id: eventId,
              imei,
              event_type: "overspeed",
              event_desc: String(raw.event_desc || "OverSpeed").slice(0, 100),
              name: name.slice(0, 255),
              plate_number: plate || obj?.plate_number || null,
              dt_tracker: dtTracker,
              dt_server: parseMaybeDate(raw.dt_server),
              lat:
                raw.lat != null && raw.lat !== ""
                  ? String(raw.lat)
                  : raw.Latitude != null
                    ? String(raw.Latitude)
                    : null,
              lng:
                raw.lng != null && raw.lng !== ""
                  ? String(raw.lng)
                  : raw.Longitude != null
                    ? String(raw.Longitude)
                    : null,
              speed,
              vehicle_id: obj?.vehicle_id || null,
              tracker_object_id: obj?.id || null,
              tracker_company_id: config.tracker_company_id || null,
              tracking_api_config_id: config.id,
              source_cmd: cmd.split(",")[0],
            } as any);

            inserted += 1;
          }

          // If we got usable speed rows, no need for fallback cmd
          if (inserted > 0) break;
        } catch (error: any) {
          console.warn(`[EssplFleet] Date-range cmd failed (${cmd.split(",")[0]}):`, error.message);
        }
      }
    }

    return { inserted, skipped };
  }

  /** Delete event cache rows older than 3 days. Objects are never purged here. */
  async purgeOldEvents(): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - EVENT_RETENTION_DAYS);

    const deleted = await db
      .delete(tracker_event_cache)
      .where(lt(tracker_event_cache.dt_tracker, cutoff))
      .returning({ id: tracker_event_cache.id });

    console.log(`[EssplFleet] Purged ${deleted.length} event rows older than ${EVENT_RETENTION_DAYS} days`);
    return deleted.length;
  }

  private async getObjectLookup(): Promise<
    Map<string, { id: number; vehicle_id: number | null; plate_number: string | null }>
  > {
    const rows = await db
      .select({
        id: tracker_objects.id,
        imei: tracker_objects.imei,
        vehicle_id: tracker_objects.vehicle_id,
        plate_number: tracker_objects.plate_number,
      })
      .from(tracker_objects);

    const map = new Map<string, { id: number; vehicle_id: number | null; plate_number: string | null }>();
    for (const row of rows) {
      map.set(row.imei, {
        id: row.id,
        vehicle_id: row.vehicle_id,
        plate_number: row.plate_number,
      });
    }
    return map;
  }

  async getSyncStatus() {
    const states = await db.select().from(tracker_sync_state).orderBy(desc(tracker_sync_state.updated_at));
    const [{ count: objectCount }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(tracker_objects);
    const [{ count: eventCount }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(tracker_event_cache);
    return { states, objectCount, eventCount, retentionDays: EVENT_RETENTION_DAYS };
  }
}

export const essplFleetService = new EssplFleetService();
