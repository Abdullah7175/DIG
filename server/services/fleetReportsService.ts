import { db } from "../db.js";
import {
  tracker_objects,
  tracker_event_cache,
  vehicles,
  owners,
  tracker_payments,
  tracker_companies,
  vehicle_types,
} from "../../shared/schema.js";
import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { deriveFleetStatus, essplFleetService } from "./essplFleetService.js";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function formatDateTime(d?: Date | null): string {
  if (!d) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatDate(d?: Date | null): string {
  if (!d) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDuration(start: Date, end: Date): string {
  const ms = Math.max(0, end.getTime() - start.getTime());
  if (ms < 1000) return "instant";
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min} min ${sec} sec`;
}

function escapeCsv(value: unknown): string {
  if (value == null) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(headers: string[], rows: Record<string, unknown>[]): string {
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCsv(row[h])).join(","));
  }
  // BOM so Excel opens UTF-8 correctly
  return "\uFEFF" + lines.join("\n");
}

async function getLatestPaymentsByVehicle(): Promise<
  Map<number, { installation_date: Date | null; next_payment_due_date: Date | null; company_name: string | null }>
> {
  const rows = await db
    .select({
      vehicle_id: tracker_payments.vehicle_id,
      installation_date: tracker_payments.installation_date,
      next_payment_due_date: tracker_payments.next_payment_due_date,
      company_name: tracker_companies.name,
      payment_date: tracker_payments.payment_date,
    })
    .from(tracker_payments)
    .leftJoin(tracker_companies, eq(tracker_payments.tracker_company_id, tracker_companies.id))
    .orderBy(desc(tracker_payments.payment_date));

  const map = new Map<
    number,
    { installation_date: Date | null; next_payment_due_date: Date | null; company_name: string | null }
  >();
  for (const row of rows) {
    if (!map.has(row.vehicle_id)) {
      map.set(row.vehicle_id, {
        installation_date: row.installation_date as any,
        next_payment_due_date: row.next_payment_due_date as any,
        company_name: row.company_name,
      });
    }
  }
  return map;
}

export class FleetReportsService {
  async buildFleetStatusRows() {
    const paymentMap = await getLatestPaymentsByVehicle();

    const rows = await db
      .select({
        obj: tracker_objects,
        vehicle_register_number: vehicles.vehicle_register_number,
        engine_number: vehicles.engine_number,
        chassis_number: vehicles.chassis_number,
        make_company: vehicles.make_company,
        model_number: vehicles.model_number,
        vehicle_body_color: vehicles.vehicle_body_color,
        vehicle_type_name: vehicle_types.name,
        owner_name: owners.name,
        owner_cnic: owners.cnic,
        owner_contact: owners.contact,
        owner_address: owners.address,
      })
      .from(tracker_objects)
      .leftJoin(vehicles, eq(tracker_objects.vehicle_id, vehicles.id))
      .leftJoin(owners, eq(vehicles.owner_id, owners.id))
      .leftJoin(vehicle_types, eq(vehicles.vehicle_type_id, vehicle_types.id))
      .orderBy(asc(tracker_objects.plate_number), asc(tracker_objects.name));

    return rows.map((r, index) => {
      const payment = r.obj.vehicle_id ? paymentMap.get(r.obj.vehicle_id) : undefined;
      const status = deriveFleetStatus({
        active: r.obj.active,
        speed: r.obj.speed,
        dt_tracker: r.obj.dt_tracker,
        params: r.obj.params,
        object_expire: r.obj.object_expire,
      });

      const lat = r.obj.lat != null ? String(r.obj.lat) : "";
      const lng = r.obj.lng != null ? String(r.obj.lng) : "";

      return {
        "S.No": index + 1,
        "Vehicle Number": r.vehicle_register_number || r.obj.plate_number || "",
        "Engine Number": r.engine_number || "",
        "Chassis Number": r.chassis_number || "",
        "Vehicle Type": r.vehicle_type_name || "",
        "Vehicle Model": r.model_number || "",
        "Vehicle Make": r.make_company || "",
        "Vehicle Color": r.vehicle_body_color || "",
        "Owner Detail": r.owner_name || "",
        "CNIC Number": r.owner_cnic || "",
        "Mobile Number": r.owner_contact || "",
        "Complete Address": r.owner_address || "",
        "Installation Date": payment?.installation_date
          ? formatDate(new Date(payment.installation_date as any))
          : "",
        Status: status,
        "Service Tenure": payment?.next_payment_due_date
          ? formatDate(new Date(payment.next_payment_due_date as any))
          : "",
        "Lat, Long": lat && lng ? `${lat}, ${lng}` : "",
        "Last Date & Time": formatDateTime(r.obj.dt_tracker),
      };
    });
  }

  /**
   * Overspeed report from tracker_event_cache.
   * If range is older than retention, fetch on-demand first.
   */
  async buildOverspeedRows(startDate: Date, endDate: Date) {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    if (startDate < threeDaysAgo) {
      await essplFleetService.fetchOverspeedDateRange(startDate, endDate);
    }

    const paymentMap = await getLatestPaymentsByVehicle();

    const events = await db
      .select({
        event: tracker_event_cache,
        vehicle_register_number: vehicles.vehicle_register_number,
        engine_number: vehicles.engine_number,
        chassis_number: vehicles.chassis_number,
        make_company: vehicles.make_company,
        model_number: vehicles.model_number,
        vehicle_type_name: vehicle_types.name,
        owner_name: owners.name,
        owner_cnic: owners.cnic,
        owner_contact: owners.contact,
        owner_address: owners.address,
      })
      .from(tracker_event_cache)
      .leftJoin(vehicles, eq(tracker_event_cache.vehicle_id, vehicles.id))
      .leftJoin(owners, eq(vehicles.owner_id, owners.id))
      .leftJoin(vehicle_types, eq(vehicles.vehicle_type_id, vehicle_types.id))
      .where(
        and(
          gte(tracker_event_cache.dt_tracker, startDate),
          lte(tracker_event_cache.dt_tracker, endDate)
        )
      )
      .orderBy(desc(tracker_event_cache.dt_tracker));

    // Group consecutive same-vehicle overspeed points within 5 minutes into one row
    const grouped: typeof events[] = [];
    let current: typeof events = [];

    const flush = () => {
      if (current.length) {
        grouped.push(current);
        current = [];
      }
    };

    for (const row of events) {
      if (!current.length) {
        current = [row];
        continue;
      }
      const prev = current[current.length - 1];
      const sameVehicle =
        (row.event.vehicle_id && row.event.vehicle_id === prev.event.vehicle_id) ||
        (row.event.plate_number && row.event.plate_number === prev.event.plate_number) ||
        row.event.name === prev.event.name;
      const gapMs =
        Math.abs(prev.event.dt_tracker.getTime() - row.event.dt_tracker.getTime());
      if (sameVehicle && gapMs <= 5 * 60 * 1000) {
        current.push(row);
      } else {
        flush();
        current = [row];
      }
    }
    flush();

    return grouped.map((group) => {
      const sorted = [...group].sort(
        (a, b) => a.event.dt_tracker.getTime() - b.event.dt_tracker.getTime()
      );
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const speeds = sorted.map((g) => g.event.speed);
      const top = Math.max(...speeds);
      const avg = Math.round((speeds.reduce((a, b) => a + b, 0) / speeds.length) * 10) / 10;
      const payment = first.event.vehicle_id
        ? paymentMap.get(first.event.vehicle_id)
        : undefined;

      const lat = first.event.lat != null ? String(first.event.lat) : "";
      const lng = first.event.lng != null ? String(first.event.lng) : "";

      return {
        Date: formatDate(first.event.dt_tracker),
        "Vehicle Number":
          first.vehicle_register_number || first.event.plate_number || first.event.name || "",
        "Engine Number": first.engine_number || "",
        "Chassis Number": first.chassis_number || "",
        "Vehicle Type": first.vehicle_type_name || "",
        "Vehicle Model": first.model_number || "",
        "Vehicle Make": first.make_company || "",
        "Owner Detail": first.owner_name || "",
        "CNIC Number": first.owner_cnic || "",
        "Mobile Number": first.owner_contact || "",
        "Complete Address": first.owner_address || "",
        "Installation/Renewal Date": payment?.installation_date
          ? formatDate(new Date(payment.installation_date as any))
          : "",
        "Company Name": payment?.company_name || "",
        Start: formatDateTime(first.event.dt_tracker),
        End: formatDateTime(last.event.dt_tracker),
        Duration: formatDuration(first.event.dt_tracker, last.event.dt_tracker),
        "Top Speed": top,
        "Average Speed": avg,
        "Overspeed Position": lat && lng ? `${lat}, ${lng}` : "",
      };
    });
  }

  async exportFleetStatusCsv(): Promise<{ filename: string; content: string }> {
    const rows = await this.buildFleetStatusRows();
    const headers = [
      "S.No",
      "Vehicle Number",
      "Engine Number",
      "Chassis Number",
      "Vehicle Type",
      "Vehicle Model",
      "Vehicle Make",
      "Vehicle Color",
      "Owner Detail",
      "CNIC Number",
      "Mobile Number",
      "Complete Address",
      "Installation Date",
      "Status",
      "Service Tenure",
      "Lat, Long",
      "Last Date & Time",
    ];
    return {
      filename: `fleet_status_${formatDate(new Date())}.csv`,
      content: toCsv(headers, rows),
    };
  }

  async exportOverspeedCsv(
    startDate: Date,
    endDate: Date
  ): Promise<{ filename: string; content: string }> {
    const rows = await this.buildOverspeedRows(startDate, endDate);
    const headers = [
      "Date",
      "Vehicle Number",
      "Engine Number",
      "Chassis Number",
      "Vehicle Type",
      "Vehicle Model",
      "Vehicle Make",
      "Owner Detail",
      "CNIC Number",
      "Mobile Number",
      "Complete Address",
      "Installation/Renewal Date",
      "Company Name",
      "Start",
      "End",
      "Duration",
      "Top Speed",
      "Average Speed",
      "Overspeed Position",
    ];
    return {
      filename: `overspeed_report_${formatDate(startDate)}_to_${formatDate(endDate)}.csv`,
      content: toCsv(headers, rows),
    };
  }
}

export const fleetReportsService = new FleetReportsService();
