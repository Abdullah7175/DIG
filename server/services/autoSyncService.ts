import { trackingApiConfigService } from "./trackingApiConfigService.js";
import { log } from "../utils/logger.js";

/**
 * Auto-sync service that fetches new tracking events every 15 seconds
 * This ensures the API always has the latest events available
 */
export class AutoSyncService {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private syncIntervalSeconds = 15; // 15 seconds as requested
  private lastSyncTime: Date | null = null;
  private consecutiveErrors = 0;
  private maxConsecutiveErrors = 5;

  /**
   * Start the auto-sync service
   */
  start(): void {
    if (this.isRunning) {
      log('[AutoSyncService] Auto-sync is already running');
      return;
    }

    log(`[AutoSyncService] Starting auto-sync service (interval: ${this.syncIntervalSeconds} seconds)`);
    this.isRunning = true;
    this.consecutiveErrors = 0;

    // Initial sync after 5 seconds (give server time to fully start)
    setTimeout(() => {
      this.performSync();
    }, 5000);

    // Set up interval for continuous syncing
    this.intervalId = setInterval(() => {
      this.performSync();
    }, this.syncIntervalSeconds * 1000);
  }

  /**
   * Stop the auto-sync service
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    log('[AutoSyncService] Stopping auto-sync service');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Perform a sync operation - fetch new events from all active configs with auto_sync enabled
   */
  private async performSync(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      // Calculate time range: fetch events from last 2 minutes to now
      // This ensures we get new events without fetching too much duplicate data
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMinutes(startDate.getMinutes() - 2); // Last 2 minutes

      // If we have a last sync time, use that as start to avoid duplicates
      if (this.lastSyncTime) {
        // Use last sync time minus 30 seconds as buffer to ensure we don't miss events
        const bufferStart = new Date(this.lastSyncTime.getTime() - 30000); // 30 seconds before last sync
        // Only use it if it's within the last 5 minutes (to avoid fetching too much old data)
        const fiveMinutesAgo = new Date();
        fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
        
        if (bufferStart > fiveMinutesAgo) {
          startDate.setTime(bufferStart.getTime());
        }
      }

      log(`[AutoSyncService] Syncing events from ${startDate.toISOString()} to ${endDate.toISOString()}`);

      // Fetch and save from all active configs with auto_sync enabled
      await trackingApiConfigService.fetchAndSaveFromAllActiveConfigs(startDate, endDate, true);

      // Update last sync time
      this.lastSyncTime = endDate;
      this.consecutiveErrors = 0;

      log(`[AutoSyncService] Sync completed successfully`);
    } catch (error: any) {
      this.consecutiveErrors++;
      const errorMessage = error?.message || 'Unknown error';
      log(`[AutoSyncService] Sync error (${this.consecutiveErrors}/${this.maxConsecutiveErrors}): ${errorMessage}`);

      // If too many consecutive errors, log a warning but don't stop
      if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
        log(`[AutoSyncService] WARNING: ${this.consecutiveErrors} consecutive errors. Auto-sync will continue but may need attention.`);
        // Reset counter to avoid spamming logs
        this.consecutiveErrors = Math.floor(this.maxConsecutiveErrors / 2);
      }
    }
  }

  /**
   * Get the current status of the auto-sync service
   */
  getStatus(): {
    isRunning: boolean;
    syncIntervalSeconds: number;
    lastSyncTime: Date | null;
    consecutiveErrors: number;
  } {
    return {
      isRunning: this.isRunning,
      syncIntervalSeconds: this.syncIntervalSeconds,
      lastSyncTime: this.lastSyncTime,
      consecutiveErrors: this.consecutiveErrors,
    };
  }
}

// Export singleton instance
export const autoSyncService = new AutoSyncService();

