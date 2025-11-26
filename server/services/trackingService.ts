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

  /**
   * Fetch tracking data from external API
   */
  async fetchTrackingData(startDate?: Date, endDate?: Date): Promise<TrackingApiResponse[]> {
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
      
      console.log(`[TrackingService] Fetching data from: ${url}`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'HospitalManagementSystem/1.0'
        },
        timeout: 30000 // 30 second timeout
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Handle different response formats
      if (Array.isArray(data)) {
        return data;
      } else if (data && Array.isArray(data.data)) {
        return data.data;
      } else if (data && typeof data === 'object') {
        // Single object response
        return [data];
      }

      console.warn('[TrackingService] Unexpected API response format:', data);
      return [];

    } catch (error) {
      console.error('[TrackingService] Error fetching tracking data:', error);
      throw error;
    }
  }

  /**
   * Process and store tracking data in database
   */
  async processAndStoreData(apiData: TrackingApiResponse[]): Promise<number> {
    if (!apiData || apiData.length === 0) {
      console.log('[TrackingService] No data to process');
      return 0;
    }

    try {
      const processedData: InsertTrackingEvent[] = apiData.map(item => ({
        event_desc: item.event_desc || 'Unknown',
        name: item.name || 'Unknown',
        dt_tracker: new Date(item.dt_tracker),
        dt_server: new Date(item.dt_server),
        lat: item.lat,
        lng: item.lng,
        speed: parseInt(item.speed) || 0
      }));

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
  }): Promise<any[]> {
    try {
      let query = db.select().from(tracking_events);
      
      // Apply filters
      const conditions = [];
      
      if (filters.vehicle && filters.vehicle !== '') {
        conditions.push(eq(tracking_events.name, filters.vehicle));
      }
      
      if (filters.event_type && filters.event_type !== 'all' && filters.event_type !== '') {
        conditions.push(eq(tracking_events.event_desc, filters.event_type));
      }
      
      if (filters.start_date) {
        conditions.push(sql`${tracking_events.dt_tracker} >= ${filters.start_date}`);
      }
      
      if (filters.end_date) {
        conditions.push(sql`${tracking_events.dt_tracker} <= ${filters.end_date}`);
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      
      const events = await query
        .orderBy(desc(tracking_events.dt_tracker))
        .limit(filters.limit || 50);

      return events;
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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

    // Set up interval for continuous updates
    this.intervalId = setInterval(() => {
      this.fetchAndStoreCurrentData();
    }, intervalMinutes * 60 * 1000);
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
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
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
    } catch (error) {
      console.error('[TrackingService] Error in real-time update:', error);
      // Don't stop the service on error, just log and continue
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
