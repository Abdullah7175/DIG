import { log } from "../utils/logger.js";
import { essplFleetService } from "./essplFleetService.js";

/**
 * Separate from the old AutoSyncService / tracking_events pipeline.
 * - Objects: every 15 minutes + once around midnight
 * - Overspeed poll: every 2 minutes (speed > threshold only)
 * - Purge: once nightly (events older than 3 days)
 */
export class FleetSyncScheduler {
  private running = false;
  private objectTimer: NodeJS.Timeout | null = null;
  private overspeedTimer: NodeJS.Timeout | null = null;
  private midnightTimer: NodeJS.Timeout | null = null;
  private objectInFlight = false;
  private overspeedInFlight = false;

  start() {
    if (this.running) {
      log("[FleetSyncScheduler] Already running");
      return;
    }
    this.running = true;
    log("[FleetSyncScheduler] Starting (objects=15m, overspeed=2m, nightly purge)");

    // Initial delayed kicks so server boot is not blocked
    setTimeout(() => this.runObjectSync(), 20_000);
    setTimeout(() => this.runOverspeedPoll(), 35_000);

    this.objectTimer = setInterval(() => this.runObjectSync(), 15 * 60 * 1000);
    this.overspeedTimer = setInterval(() => this.runOverspeedPoll(), 2 * 60 * 1000);
    this.scheduleMidnightJobs();
  }

  stop() {
    this.running = false;
    if (this.objectTimer) clearInterval(this.objectTimer);
    if (this.overspeedTimer) clearInterval(this.overspeedTimer);
    if (this.midnightTimer) clearTimeout(this.midnightTimer);
    this.objectTimer = null;
    this.overspeedTimer = null;
    this.midnightTimer = null;
    log("[FleetSyncScheduler] Stopped");
  }

  getStatus() {
    return { running: this.running };
  }

  private scheduleMidnightJobs() {
    const now = new Date();
    const next = new Date(now);
    next.setHours(24, 5, 0, 0); // 00:05 local server time
    const delay = Math.max(60_000, next.getTime() - now.getTime());

    this.midnightTimer = setTimeout(async () => {
      try {
        log("[FleetSyncScheduler] Nightly object sync + purge starting");
        await essplFleetService.syncObjectsFromConfigs();
        await essplFleetService.purgeOldEvents();
      } catch (error: any) {
        log(`[FleetSyncScheduler] Nightly job error: ${error.message}`);
      } finally {
        if (this.running) this.scheduleMidnightJobs();
      }
    }, delay);

    log(`[FleetSyncScheduler] Nightly jobs scheduled in ${Math.round(delay / 60000)} minutes`);
  }

  private async runObjectSync() {
    if (!this.running || this.objectInFlight) return;
    this.objectInFlight = true;
    try {
      await essplFleetService.syncObjectsFromConfigs();
    } catch (error: any) {
      log(`[FleetSyncScheduler] Object sync error: ${error.message}`);
    } finally {
      this.objectInFlight = false;
    }
  }

  private async runOverspeedPoll() {
    if (!this.running || this.overspeedInFlight) return;
    this.overspeedInFlight = true;
    try {
      await essplFleetService.pollOverspeedEvents();
    } catch (error: any) {
      log(`[FleetSyncScheduler] Overspeed poll error: ${error.message}`);
    } finally {
      this.overspeedInFlight = false;
    }
  }
}

export const fleetSyncScheduler = new FleetSyncScheduler();
