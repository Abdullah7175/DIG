import { db } from "../db.js";
import { tracking_api_configs, tracker_companies } from "../../shared/schema.js";
import type { InsertTrackingApiConfig, TrackingApiConfig } from "../../shared/schema.js";
import { eq, and, desc, sql } from "drizzle-orm";
import { httpFetch } from "../utils/httpClient.js";

export interface TrackingApiResponse {
  event_desc: string;
  name: string;
  dt_tracker: string;
  dt_server: string;
  lat: string;
  lng: string;
  speed: string;
}

export interface ApiHealthStatus {
  isHealthy: boolean;
  lastCheck: Date | null;
  lastError: string | null;
  consecutiveFailures: number;
}

export class TrackingApiConfigService {
  /**
   * Get all active API configurations
   */
  async getAllConfigs(includeInactive = false): Promise<any[]> {
    try {
      const conditions = [];
      if (!includeInactive) {
        conditions.push(eq(tracking_api_configs.status, 'active'));
      }

      const configs = await db
        .select({
          id: tracking_api_configs.id,
          name: tracking_api_configs.name,
          tracker_company_id: tracking_api_configs.tracker_company_id,
          tracker_company_name: tracker_companies.name,
          api_url: tracking_api_configs.api_url,
          api_key: tracking_api_configs.api_key,
          api_type: tracking_api_configs.api_type,
          api_params: tracking_api_configs.api_params,
          url_template: tracking_api_configs.url_template,
          status: tracking_api_configs.status,
          auto_sync: tracking_api_configs.auto_sync,
          sync_interval_minutes: tracking_api_configs.sync_interval_minutes,
          last_sync_at: tracking_api_configs.last_sync_at,
          last_successful_sync_at: tracking_api_configs.last_successful_sync_at,
          last_sync_status: tracking_api_configs.last_sync_status,
          last_sync_error: tracking_api_configs.last_sync_error,
          last_health_check_at: tracking_api_configs.last_health_check_at,
          is_healthy: tracking_api_configs.is_healthy,
          consecutive_failures: tracking_api_configs.consecutive_failures,
          description: tracking_api_configs.description,
          created_at: tracking_api_configs.created_at,
          updated_at: tracking_api_configs.updated_at,
        })
        .from(tracking_api_configs)
        .leftJoin(tracker_companies, eq(tracking_api_configs.tracker_company_id, tracker_companies.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(tracking_api_configs.created_at));

      return configs;
    } catch (error: any) {
      console.error('[TrackingApiConfigService] Error fetching configs:', error);
      throw error;
    }
  }

  /**
   * Get a single API configuration by ID
   */
  async getConfigById(id: number): Promise<any | null> {
    try {
      const config = await db
        .select({
          id: tracking_api_configs.id,
          name: tracking_api_configs.name,
          tracker_company_id: tracking_api_configs.tracker_company_id,
          tracker_company_name: tracker_companies.name,
          api_url: tracking_api_configs.api_url,
          api_key: tracking_api_configs.api_key,
          api_type: tracking_api_configs.api_type,
          api_params: tracking_api_configs.api_params,
          url_template: tracking_api_configs.url_template,
          status: tracking_api_configs.status,
          auto_sync: tracking_api_configs.auto_sync,
          sync_interval_minutes: tracking_api_configs.sync_interval_minutes,
          last_sync_at: tracking_api_configs.last_sync_at,
          last_successful_sync_at: tracking_api_configs.last_successful_sync_at,
          last_sync_status: tracking_api_configs.last_sync_status,
          last_sync_error: tracking_api_configs.last_sync_error,
          last_health_check_at: tracking_api_configs.last_health_check_at,
          is_healthy: tracking_api_configs.is_healthy,
          consecutive_failures: tracking_api_configs.consecutive_failures,
          description: tracking_api_configs.description,
          created_at: tracking_api_configs.created_at,
          updated_at: tracking_api_configs.updated_at,
        })
        .from(tracking_api_configs)
        .leftJoin(tracker_companies, eq(tracking_api_configs.tracker_company_id, tracker_companies.id))
        .where(eq(tracking_api_configs.id, id))
        .limit(1);

      return config[0] || null;
    } catch (error: any) {
      console.error('[TrackingApiConfigService] Error fetching config:', error);
      throw error;
    }
  }

  /**
   * Create a new API configuration
   */
  async createConfig(data: Omit<InsertTrackingApiConfig, 'id' | 'created_at' | 'updated_at'>): Promise<TrackingApiConfig> {
    try {
      // Parse api_params - handle both string and object, convert to object for JSONB
      let apiParams: any = {};
      if (data.api_params !== undefined && data.api_params !== null) {
        if (typeof data.api_params === 'string') {
          try {
            apiParams = JSON.parse(data.api_params);
          } catch (e) {
            console.warn('[TrackingApiConfigService] Failed to parse api_params, using empty object:', e);
            apiParams = {};
          }
        } else if (typeof data.api_params === 'object') {
          apiParams = data.api_params;
        }
      }

      const configData: any = {
        ...data,
        api_params: apiParams, // JSONB column accepts objects directly
      };

      const [config] = await db
        .insert(tracking_api_configs)
        .values(configData as InsertTrackingApiConfig)
        .returning();

      return config;
    } catch (error: any) {
      console.error('[TrackingApiConfigService] Error creating config:', error);
      throw error;
    }
  }

  /**
   * Update an API configuration
   */
  async updateConfig(id: number, data: Partial<InsertTrackingApiConfig>): Promise<TrackingApiConfig> {
    try {
      // Parse api_params - handle both string and object, convert to object for JSONB
      const updateData: any = { ...data };
      if (updateData.api_params !== undefined && updateData.api_params !== null) {
        if (typeof updateData.api_params === 'string') {
          try {
            updateData.api_params = JSON.parse(updateData.api_params);
          } catch (e) {
            console.warn('[TrackingApiConfigService] Failed to parse api_params, using empty object:', e);
            updateData.api_params = {};
          }
        }
        // If it's already an object, use it directly (JSONB accepts objects)
      }

      const [config] = await db
        .update(tracking_api_configs)
        .set(updateData)
        .where(eq(tracking_api_configs.id, id))
        .returning();

      if (!config) {
        throw new Error(`API configuration with id ${id} not found`);
      }

      return config;
    } catch (error: any) {
      console.error('[TrackingApiConfigService] Error updating config:', error);
      throw error;
    }
  }

  /**
   * Delete an API configuration
   */
  async deleteConfig(id: number): Promise<void> {
    try {
      await db
        .delete(tracking_api_configs)
        .where(eq(tracking_api_configs.id, id));
    } catch (error: any) {
      console.error('[TrackingApiConfigService] Error deleting config:', error);
      throw error;
    }
  }

  /**
   * Update health status for an API configuration
   */
  async updateHealthStatus(
    id: number, 
    status: { isHealthy: boolean; error?: string }
  ): Promise<void> {
    try {
      const config = await this.getConfigById(id);
      if (!config) {
        throw new Error(`API configuration with id ${id} not found`);
      }

      const consecutiveFailures = status.isHealthy 
        ? 0 
        : (config.consecutive_failures || 0) + 1;

      await db
        .update(tracking_api_configs)
        .set({
          is_healthy: status.isHealthy,
          last_health_check_at: new Date(),
          consecutive_failures: consecutiveFailures,
          last_sync_error: status.error || null,
        })
        .where(eq(tracking_api_configs.id, id));
    } catch (error: any) {
      console.error('[TrackingApiConfigService] Error updating health status:', error);
      throw error;
    }
  }

  /**
   * Update sync status for an API configuration
   */
  async updateSyncStatus(
    id: number,
    status: { success: boolean; error?: string; recordsProcessed?: number }
  ): Promise<void> {
    try {
      const updateData: any = {
        last_sync_at: new Date(),
        last_sync_status: status.success ? 'success' : 'failed',
        last_sync_error: status.error || null,
      };

      if (status.success) {
        updateData.last_successful_sync_at = new Date();
        updateData.consecutive_failures = 0;
        updateData.is_healthy = true;
      }

      await db
        .update(tracking_api_configs)
        .set(updateData)
        .where(eq(tracking_api_configs.id, id));
    } catch (error: any) {
      console.error('[TrackingApiConfigService] Error updating sync status:', error);
      throw error;
    }
  }

  /**
   * Fetch tracking data from a specific API configuration
   */
  async fetchTrackingDataFromConfig(
    config: any,
    startDate: Date,
    endDate: Date
  ): Promise<TrackingApiResponse[]> {
    try {
      // Debug logging
      console.log('[TrackingApiConfigService] fetchTrackingDataFromConfig called with:', {
        configName: config?.name,
        apiType: config?.api_type,
        apiUrl: config?.api_url,
        hasUrlTemplate: !!config?.url_template,
        apiParamsType: typeof config?.api_params,
        apiParams: config?.api_params,
      });

      const formatDate = (date: Date) => {
        return date.toISOString().slice(0, 19).replace('T', ' ');
      };

      const startStr = encodeURIComponent(formatDate(startDate));
      const endStr = encodeURIComponent(formatDate(endDate));

      let url: string;

      // Helper function to safely parse api_params
      const parseApiParams = (apiParams: any): any => {
        try {
          if (!apiParams) return {};
          
          // If it's already an object (not an array), return it
          if (typeof apiParams === 'object' && !Array.isArray(apiParams) && apiParams !== null) {
            return apiParams;
          }
          
          // If it's a string, try to parse it
          if (typeof apiParams === 'string') {
            // Handle empty string
            if (apiParams.trim() === '') return {};
            
            // Try to parse as JSON
            try {
              const parsed = JSON.parse(apiParams);
              // Ensure it's an object, not an array or primitive
              if (typeof parsed === 'object' && !Array.isArray(parsed) && parsed !== null) {
                return parsed;
              }
              return {};
            } catch (parseError) {
              console.warn('[TrackingApiConfigService] Failed to parse api_params as JSON:', parseError, 'Value:', apiParams);
              return {};
            }
          }
          
          return {};
        } catch (error) {
          console.error('[TrackingApiConfigService] Error in parseApiParams:', error, 'apiParams type:', typeof apiParams, 'apiParams:', apiParams);
          return {};
        }
      };

      // Helper to check if url_template is actually a template (has placeholders)
      const isTemplate = (template: string): boolean => {
        return template.includes('{baseUrl}') || 
               template.includes('{apiKey}') || 
               template.includes('{startDate}') || 
               template.includes('{endDate}') ||
               template.includes('{api}') ||
               template.includes('{ver}') ||
               template.includes('{cmd}') ||
               /\{[a-zA-Z_][a-zA-Z0-9_]*\}/.test(template);
      };

      // Build URL based on API type
      if (config.url_template && isTemplate(config.url_template)) {
        // Use custom URL template (only if it has placeholders)
        const params = parseApiParams(config.api_params);
        url = config.url_template
          .replace('{baseUrl}', config.api_url)
          .replace('{apiKey}', config.api_key)
          .replace('{startDate}', startStr)
          .replace('{endDate}', endStr)
          .replace(/{(\w+)}/g, (match: string, key: string) => params[key] || match);
      } else if (config.api_type === 'esspl') {
        // ESSPL API format
        const params = parseApiParams(config.api_params);
        const apiName = params.api || 'user';
        const version = params.ver || '1.0';
        const cmd = params.cmd || 'OBJECT_GET_OSP';
        
        // Build base URL - check if api_url already includes the path
        let baseUrl = config.api_url;
        if (!baseUrl.includes('/api/api.php') && !baseUrl.includes('/api/')) {
          // Add the ESSPL API path if not present
          baseUrl = baseUrl.replace(/\/$/, '') + '/api/api.php';
        }
        
        url = `${baseUrl}?api=${apiName}&ver=${version}&key=${config.api_key}&cmd=${cmd},${startStr},${endStr}`;
      } else {
        // Standard format
        url = `${config.api_url}?start_date=${startStr}&end_date=${endStr}&key=${config.api_key}`;
      }

      console.log(`[TrackingApiConfigService] Fetching from API ${config.name}: ${url.replace(config.api_key, '***')}`);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      try {
        // Use custom httpFetch that handles both HTTP and HTTPS, including self-signed certificates
        const response = await httpFetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'HospitalManagementSystem/1.0',
          },
          signal: controller.signal,
          timeout: 30000,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          const errorText = await response.text().catch(() => response.statusText);
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        // Parse JSON response with better error handling
        let data: any;
        try {
          const responseText = await response.text();
          if (!responseText || responseText.trim() === '') {
            console.warn('[TrackingApiConfigService] Empty response from API');
            return [];
          }
          data = JSON.parse(responseText);
        } catch (jsonError: any) {
          console.error('[TrackingApiConfigService] Failed to parse API response as JSON:', jsonError);
          console.error('[TrackingApiConfigService] Response content type:', response.headers.get('content-type'));
          throw new Error(`Invalid JSON response from API: ${jsonError.message}`);
        }

        // Handle array response
        if (Array.isArray(data)) {
          return data;
        }

        // Handle object response with data property
        if (data.data && Array.isArray(data.data)) {
          return data.data;
        }

        // Handle object response with events property
        if (data.events && Array.isArray(data.events)) {
          return data.events;
        }

        // If it's a single object, wrap it in an array
        if (data && typeof data === 'object') {
          return [data];
        }

        return [];
      } catch (fetchError: any) {
        clearTimeout(timeout);
        if (fetchError.name === 'AbortError') {
          throw new Error('Request timeout after 30 seconds');
        }
        throw fetchError;
      }
    } catch (error: any) {
      console.error(`[TrackingApiConfigService] Error fetching from API ${config.name}:`, error);
      throw error;
    }
  }

  /**
   * Test API connection with optional date range and save to database
   */
  async testApiConnection(
    config: any, 
    startDate?: Date, 
    endDate?: Date,
    saveToDatabase: boolean = false
  ): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      // Use provided dates or default to last hour
      const testStartDate = startDate || (() => {
        const d = new Date();
        d.setHours(d.getHours() - 1);
        return d;
      })();
      const testEndDate = endDate || new Date();

      const apiData = await this.fetchTrackingDataFromConfig(config, testStartDate, testEndDate);
      
      // If saveToDatabase is true, save the data asynchronously (non-blocking)
      if (saveToDatabase && apiData.length > 0) {
        // Start saving in the background, don't wait for it
        (async () => {
          try {
            const trackingService = (await import("./trackingService.js")).trackingService;
            console.log(`[TrackingApiConfigService] Starting background save of ${apiData.length} records...`);
            const recordsSaved = await trackingService.processAndStoreData(apiData, config.tracker_company_id);
            console.log(`[TrackingApiConfigService] Background save completed: ${recordsSaved} records saved`);
          } catch (saveError: any) {
            console.error(`[TrackingApiConfigService] Error saving test data in background:`, saveError);
          }
        })().catch(err => {
          console.error(`[TrackingApiConfigService] Unhandled error in background save:`, err);
        });
      }
      
      return {
        success: true,
        data: {
          recordCount: apiData.length,
          recordsSaved: saveToDatabase ? 'saving_in_background' : 0,
          savedToDatabase: saveToDatabase,
          sampleRecord: apiData[0] || null,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error occurred',
      };
    }
  }

  /**
   * Fetch and save data from all active API configurations (non-blocking)
   * This is called automatically when merged-data API is hit or when config becomes active
   */
  async fetchAndSaveFromAllActiveConfigs(startDate?: Date, endDate?: Date): Promise<void> {
    try {
      // Get all active configs
      const configs = await this.getAllConfigs(false); // false = only active configs
      
      if (configs.length === 0) {
        console.log('[TrackingApiConfigService] No active API configs to fetch from');
        return;
      }

      console.log(`[TrackingApiConfigService] Fetching data from ${configs.length} active API config(s)...`);

      // Use provided dates or default to last 24 hours
      const fetchStartDate = startDate || (() => {
        const d = new Date();
        d.setHours(d.getHours() - 24);
        return d;
      })();
      const fetchEndDate = endDate || new Date();

      // Fetch from all active configs in parallel (non-blocking)
      const fetchPromises = configs.map(async (config) => {
        try {
          console.log(`[TrackingApiConfigService] Fetching from ${config.name}...`);
          const apiData = await this.fetchTrackingDataFromConfig(config, fetchStartDate, fetchEndDate);
          
          if (apiData.length > 0) {
            const trackingService = (await import("./trackingService.js")).trackingService;
            const recordsSaved = await trackingService.processAndStoreData(apiData, config.tracker_company_id);
            console.log(`[TrackingApiConfigService] Saved ${recordsSaved} records from ${config.name}`);
            
            // Update sync status
            await this.updateSyncStatus(config.id, {
              success: true,
              recordsProcessed: recordsSaved
            });
          } else {
            console.log(`[TrackingApiConfigService] No data returned from ${config.name}`);
            await this.updateSyncStatus(config.id, {
              success: true,
              recordsProcessed: 0
            });
          }
        } catch (error: any) {
          console.error(`[TrackingApiConfigService] Error fetching from ${config.name}:`, error);
          await this.updateSyncStatus(config.id, {
            success: false,
            error: error.message || 'Unknown error'
          });
        }
      });

      // Don't await - let it run in background
      Promise.all(fetchPromises).catch(err => {
        console.error('[TrackingApiConfigService] Error in background fetch:', err);
      });
    } catch (error: any) {
      console.error('[TrackingApiConfigService] Error in fetchAndSaveFromAllActiveConfigs:', error);
    }
  }

  /**
   * Fetch and save data from a single API config (used when config becomes active)
   */
  async fetchAndSaveFromConfig(configId: number, startDate?: Date, endDate?: Date): Promise<void> {
    try {
      const config = await this.getConfigById(configId);
      if (!config || config.status !== 'active') {
        return;
      }

      const fetchStartDate = startDate || (() => {
        const d = new Date();
        d.setHours(d.getHours() - 24);
        return d;
      })();
      const fetchEndDate = endDate || new Date();

      console.log(`[TrackingApiConfigService] Auto-fetching from newly active config: ${config.name}`);
      
      // Run in background
      (async () => {
        try {
          const apiData = await this.fetchTrackingDataFromConfig(config, fetchStartDate, fetchEndDate);
          
          if (apiData.length > 0) {
            const trackingService = (await import("./trackingService.js")).trackingService;
            const recordsSaved = await trackingService.processAndStoreData(apiData, config.tracker_company_id);
            console.log(`[TrackingApiConfigService] Auto-saved ${recordsSaved} records from ${config.name}`);
            
            await this.updateSyncStatus(config.id, {
              success: true,
              recordsProcessed: recordsSaved
            });
          }
        } catch (error: any) {
          console.error(`[TrackingApiConfigService] Error auto-fetching from ${config.name}:`, error);
          await this.updateSyncStatus(config.id, {
            success: false,
            error: error.message || 'Unknown error'
          });
        }
      })().catch(err => {
        console.error(`[TrackingApiConfigService] Unhandled error in auto-fetch:`, err);
      });
    } catch (error: any) {
      console.error(`[TrackingApiConfigService] Error in fetchAndSaveFromConfig:`, error);
    }
  }
}

export const trackingApiConfigService = new TrackingApiConfigService();

