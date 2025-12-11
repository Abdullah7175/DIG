import { db } from "../db.js";
import { tracking_events } from "../../shared/schema.js";
import type { InsertTrackingEvent } from "../../shared/schema.js";
import { eq, lt, and, desc, sql } from "drizzle-orm";

// API configuration
const API_CONFIG = {
  baseUrl: "http://tracking.esspl.com.pk:8080/api/api.php",
  apiKey: "C717EAE19022F2E4D3684FC22192C283",
  version: "1.0",
  api: "user"
};

// Interface for API response data
interface TrackingApiResponse {
  event_desc: string;
  name: string;
  dt_tracker: string;
  dt_server: string;
  lat: string;
  lng: string;
  speed: string;
}

export class TrackingService {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private consecutiveFailures = 0;
  private maxConsecutiveFailures = 5;
  private backoffMultiplier = 1;

  /**
   * Fetch tracking data from external API with retry logic
   */
  async fetchTrackingData(startDate?: Date, endDate?: Date, retryCount = 0): Promise<TrackingApiResponse[]> {
    const maxRetries = 3;
    const baseDelay = 2000; // 2 seconds
    
    try {
      // Default to current day if no dates provided
      const start = startDate || new Date();
      const end = endDate || new Date();
      
      // Format dates for API (YYYY-MM-DD HH:mm:ss)
      const formatDate = (date: Date) => {
        return date.toISOString().slice(0, 19).replace('T', ' ');
      };

      const startStr = encodeURIComponent(formatDate(start));
      const endStr = encodeURIComponent(formatDate(end));

      const url = `${API_CONFIG.baseUrl}?api=${API_CONFIG.api}&ver=${API_CONFIG.version}&key=${API_CONFIG.apiKey}&cmd=OBJECT_GET_OSP,${startStr},${endStr}`;
      
      if (retryCount === 0) {
        console.log(`[TrackingService] Fetching data from: ${url}`);
      } else {
        console.log(`[TrackingService] Retry attempt ${retryCount}/${maxRetries} for: ${url}`);
      }

      const controller = new AbortController();
      // Increase timeout for retries
      const timeout = 30000 + (retryCount * 10000); // 30s, 40s, 50s, 60s
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      // Use custom httpFetch that handles both HTTP and HTTPS, including self-signed certificates
      const { httpFetch } = await import('../utils/httpClient.js');
      const response = await httpFetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'HospitalManagementSystem/1.0',
          'Connection': 'keep-alive'
        },
        signal: controller.signal,
        timeout: timeout
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data: any = await response.json();
      
      // Reset failure count on success
      this.consecutiveFailures = 0;
      this.backoffMultiplier = 1;
      
      // Handle different response formats
      if (Array.isArray(data)) {
        console.log(`[TrackingService] Successfully fetched ${data.length} records`);
        return data as TrackingApiResponse[];
      } else if (data && Array.isArray(data.data)) {
        console.log(`[TrackingService] Successfully fetched ${data.data.length} records`);
        return data.data as TrackingApiResponse[];
      } else if (data && typeof data === 'object') {
        // Single object response
        console.log(`[TrackingService] Successfully fetched 1 record`);
        return [data as TrackingApiResponse];
      }

      console.warn('[TrackingService] Unexpected API response format:', data);
      return [];

    } catch (error: any) {
      console.error(`[TrackingService] Error fetching tracking data (attempt ${retryCount + 1}):`, error.message);
      
      // Check if it's a timeout or connection error
      const isRetryableError = error.name === 'AbortError' || 
                              error.code === 'UND_ERR_CONNECT_TIMEOUT' ||
                              error.code === 'ECONNREFUSED' ||
                              error.code === 'ENOTFOUND' ||
                              error.code === 'ETIMEDOUT';
      
      if (isRetryableError && retryCount < maxRetries) {
        const delay = baseDelay * Math.pow(2, retryCount); // Exponential backoff
        console.log(`[TrackingService] Retrying in ${delay}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.fetchTrackingData(startDate, endDate, retryCount + 1);
      }
      
      // Track consecutive failures
      this.consecutiveFailures++;
      
      throw error;
    }
  }

  /**
   * Process and store tracking data in database
   */
  async processAndStoreData(apiData: TrackingApiResponse[], trackerCompanyId?: number): Promise<number> {
    if (!apiData || apiData.length === 0) {
      console.log('[TrackingService] No data to process');
      return 0;
    }

    try {
      const processedData: InsertTrackingEvent[] = apiData.map(item => {
        // Parse dates consistently - API returns dates like "2025-12-04 09:00:00" (local time, no timezone)
        // We need to parse them as UTC to match our query format
        let dtTracker: Date;
        let dtServer: Date;
        
        try {
          // API returns dates like "2025-12-04 09:00:00" (likely Pakistan time, UTC+5)
          // PostgreSQL timestamp stores without timezone, so we need to parse consistently
          // Parse as-is and let PostgreSQL store it - queries will match if we use same format
          const trackerStr = item.dt_tracker?.trim() || '';
          const serverStr = item.dt_server?.trim() || '';
          
          if (trackerStr.includes('T') || trackerStr.includes('Z') || trackerStr.includes('+')) {
            // Already has timezone info - parse directly
            dtTracker = new Date(trackerStr);
          } else {
            // No timezone - API returns "2025-12-04 08:25:52" (treat as UTC to match query format)
            // Parse as UTC to ensure consistency with query dates
            dtTracker = new Date(trackerStr.replace(' ', 'T') + 'Z');
          }
          
          if (serverStr.includes('T') || serverStr.includes('Z') || serverStr.includes('+')) {
            dtServer = new Date(serverStr);
          } else {
            // Parse as UTC to match tracker date format
            dtServer = new Date(serverStr.replace(' ', 'T') + 'Z');
          }
          
          // Validate dates
          if (isNaN(dtTracker.getTime())) {
            console.warn(`[TrackingService] Invalid dt_tracker: ${item.dt_tracker}, using current date`);
            dtTracker = new Date();
          }
          if (isNaN(dtServer.getTime())) {
            console.warn(`[TrackingService] Invalid dt_server: ${item.dt_server}, using current date`);
            dtServer = new Date();
          }
        } catch (e) {
          console.warn(`[TrackingService] Error parsing dates:`, e);
          dtTracker = new Date();
          dtServer = new Date();
        }
        
        return {
          event_desc: item.event_desc || 'Unknown',
          name: item.name || 'Unknown',
          dt_tracker: dtTracker,
          dt_server: dtServer,
          lat: item.lat,
          lng: item.lng,
          speed: parseInt(item.speed) || 0,
          tracker_company_id: trackerCompanyId || null
        };
      });

      // Insert data in batches for better performance
      const batchSize = 100;
      let totalInserted = 0;

      for (let i = 0; i < processedData.length; i += batchSize) {
        const batch = processedData.slice(i, i + batchSize);
        
        try {
          const result = await db
            .insert(tracking_events)
            .values(batch)
            .onConflictDoNothing() // Avoid duplicates if same data is fetched multiple times
            .returning({ id: tracking_events.id });
          
          totalInserted += result.length;
          console.log(`[TrackingService] Inserted batch ${Math.floor(i/batchSize) + 1}: ${result.length} records`);
        } catch (batchError) {
          console.error(`[TrackingService] Error inserting batch ${Math.floor(i/batchSize) + 1}:`, batchError);
          // Continue with next batch instead of failing completely
        }
      }

      console.log(`[TrackingService] Successfully processed ${totalInserted} tracking events`);
      return totalInserted;

    } catch (error) {
      console.error('[TrackingService] Error processing tracking data:', error);
      throw error;
    }
  }

  /**
   * Get tracking events with filters
   */
  async getFilteredEvents(filters: {
    limit?: number;
    vehicle?: string;
    event_type?: string;
    start_date?: string;
    end_date?: string;
    start_datetime?: string;
    end_datetime?: string;
    tracker_company_id?: number;
  }): Promise<any[]> {
    try {
      let query = db.select().from(tracking_events);
      
      // Apply filters
      const conditions = [];
      
      // Filter by tracker_company_id for consultants
      if (filters.tracker_company_id) {
        conditions.push(eq(tracking_events.tracker_company_id, filters.tracker_company_id));
      }
      
      if (filters.vehicle && filters.vehicle !== '') {
        conditions.push(eq(tracking_events.name, filters.vehicle));
      }
      
      if (filters.event_type && filters.event_type !== 'all' && filters.event_type !== '') {
        conditions.push(eq(tracking_events.event_desc, filters.event_type));
      }
      
      // Handle datetime filtering with priority to datetime over date
      // Use dt_tracker (when event happened) for date range filtering to match user's query intent
      // But order by created_at to show most recently inserted events first
      if (filters.start_datetime) {
        const startDate = new Date(filters.start_datetime);
        conditions.push(sql`${tracking_events.dt_tracker} >= ${startDate}::timestamp`);
      } else if (filters.start_date) {
        const startDate = new Date(filters.start_date + ' 00:00:00');
        conditions.push(sql`${tracking_events.dt_tracker} >= ${startDate}::timestamp`);
      }
      
      if (filters.end_datetime) {
        const endDate = new Date(filters.end_datetime);
        conditions.push(sql`${tracking_events.dt_tracker} <= ${endDate}::timestamp`);
      } else if (filters.end_date) {
        const endDate = new Date(filters.end_date + ' 23:59:59');
        conditions.push(sql`${tracking_events.dt_tracker} <= ${endDate}::timestamp`);
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }
      
      // Order by dt_tracker DESC to show most recent events first (by when they happened)
      // This ensures events are ordered chronologically by actual event time
      const events = await query
        .orderBy(desc(tracking_events.dt_tracker))
        .limit(filters.limit || 50);

      return events;
    } catch (error: any) {
      console.error('[TrackingService] Error fetching filtered events:', error);
      // Return empty array if table doesn't exist yet
      if (error.code === '42P01') { // Table doesn't exist
        console.warn('[TrackingService] tracking_events table does not exist yet');
        return [];
      }
      throw error;
    }
  }

  /**
   * Get latest tracking events from database
   */
  async getLatestEvents(limit: number = 50): Promise<any[]> {
    try {
      const events = await db
        .select()
        .from(tracking_events)
        .orderBy(tracking_events.created_at)
        .limit(limit);

      return events;
    } catch (error: any) {
      console.error('[TrackingService] Error fetching latest events:', error);
      // Return empty array if table doesn't exist yet
      if (error.code === '42P01') { // Table doesn't exist
        console.warn('[TrackingService] tracking_events table does not exist yet');
        return [];
      }
      throw error;
    }
  }

  /**
   * Get tracking events by vehicle name
   */
  async getEventsByVehicle(vehicleName: string, limit: number = 50): Promise<any[]> {
    try {
      const events = await db
        .select()
        .from(tracking_events)
        .where(eq(tracking_events.name, vehicleName))
        .orderBy(tracking_events.dt_tracker)
        .limit(limit);

      return events;
    } catch (error: any) {
      console.error('[TrackingService] Error fetching events by vehicle:', error);
      // Return empty array if table doesn't exist yet
      if (error.code === '42P01') { // Table doesn't exist
        console.warn('[TrackingService] tracking_events table does not exist yet');
        return [];
      }
      throw error;
    }
  }

  /**
   * Get tracking events by event type
   */
  async getEventsByType(eventType: string, limit: number = 50): Promise<any[]> {
    try {
      const events = await db
        .select()
        .from(tracking_events)
        .where(eq(tracking_events.event_desc, eventType))
        .orderBy(tracking_events.dt_tracker)
        .limit(limit);

      return events;
    } catch (error: any) {
      console.error('[TrackingService] Error fetching events by type:', error);
      // Return empty array if table doesn't exist yet
      if (error.code === '42P01') { // Table doesn't exist
        console.warn('[TrackingService] tracking_events table does not exist yet');
        return [];
      }
      throw error;
    }
  }

  /**
   * Start real-time data fetching (every 5 minutes)
   */
  startRealTimeUpdates(intervalMinutes: number = 5): void {
    if (this.isRunning) {
      console.log('[TrackingService] Real-time updates already running');
      return;
    }

    console.log(`[TrackingService] Starting real-time updates every ${intervalMinutes} minutes`);
    this.isRunning = true;

    // Initial fetch
    this.fetchAndStoreCurrentData();

    // Set up interval for continuous updates with dynamic interval based on failures
    const scheduleNext = () => {
      if (!this.isRunning) return;
      
      // Increase interval if there are consecutive failures
      const dynamicInterval = intervalMinutes * this.backoffMultiplier;
      const maxInterval = 30; // Max 30 minutes
      const actualInterval = Math.min(dynamicInterval, maxInterval);
      
      console.log(`[TrackingService] Next update scheduled in ${actualInterval} minutes (failures: ${this.consecutiveFailures})`);
      
      this.intervalId = setTimeout(() => {
        this.fetchAndStoreCurrentData().finally(() => {
          scheduleNext();
        });
      }, actualInterval * 60 * 1000);
    };

    scheduleNext();
  }

  /**
   * Stop real-time data fetching
   */
  stopRealTimeUpdates(): void {
    if (!this.isRunning) {
      console.log('[TrackingService] Real-time updates not running');
      return;
    }

    console.log('[TrackingService] Stopping real-time updates');
    this.isRunning = false;

    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }
    
    // Reset failure tracking
    this.consecutiveFailures = 0;
    this.backoffMultiplier = 1;
  }

  /**
   * Fetch and store current data (last hour)
   */
  private async fetchAndStoreCurrentData(): Promise<void> {
    try {
      console.log('[TrackingService] Fetching current tracking data...');
      
      // Fetch data from last hour to current time
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (60 * 60 * 1000)); // 1 hour ago

      const apiData = await this.fetchTrackingData(startDate, endDate);
      const insertedCount = await this.processAndStoreData(apiData);
      
      console.log(`[TrackingService] Real-time update completed: ${insertedCount} new records`);
      
      // Reset backoff on success
      if (this.consecutiveFailures > 0) {
        console.log(`[TrackingService] Connection restored after ${this.consecutiveFailures} failures`);
        this.consecutiveFailures = 0;
        this.backoffMultiplier = 1;
      }
      
    } catch (error: any) {
      console.error('[TrackingService] Error in real-time update:', error.message);
      
      // Increase backoff multiplier for consecutive failures
      if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
        this.backoffMultiplier = Math.min(this.backoffMultiplier * 1.5, 6); // Max 6x interval
        console.warn(`[TrackingService] Too many consecutive failures (${this.consecutiveFailures}), backing off to ${this.backoffMultiplier}x interval`);
      }
      
      // Don't stop the service on error, just log and continue with backoff
    }
  }

  /**
   * Get service status
   */
  getStatus(): { isRunning: boolean; intervalMinutes?: number; lastError?: string } {
    return {
      isRunning: this.isRunning,
      intervalMinutes: this.intervalId ? 5 : undefined
    };
  }

  /**
   * Manual sync for specific date range
   */
  async syncDateRange(startDate: Date, endDate: Date): Promise<number> {
    try {
      console.log(`[TrackingService] Manual sync from ${startDate.toISOString()} to ${endDate.toISOString()}`);
      
      const apiData = await this.fetchTrackingData(startDate, endDate);
      const insertedCount = await this.processAndStoreData(apiData);
      
      console.log(`[TrackingService] Manual sync completed: ${insertedCount} records processed`);
      return insertedCount;
    } catch (error) {
      console.error('[TrackingService] Error in manual sync:', error);
      throw error;
    }
  }

  /**
   * Clean up old data (older than specified days)
   */
  async cleanupOldData(daysToKeep: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await db
        .delete(tracking_events)
        .where(lt(tracking_events.created_at, cutoffDate))
        .returning({ id: tracking_events.id });

      console.log(`[TrackingService] Cleaned up ${result.length} old records (older than ${daysToKeep} days)`);
      return result.length;
    } catch (error) {
      console.error('[TrackingService] Error cleaning up old data:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const trackingService = new TrackingService();

// Optional: Auto-start real-time updates when server starts
// Uncomment the line below to automatically start real-time tracking
// trackingService.startRealTimeUpdates(5); // Every 5 minutes
