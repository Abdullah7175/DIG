import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { 
  TraccarDevice, 
  TraccarPosition, 
  TraccarEvent, 
  TraccarCommand, 
  TraccarGeofence, 
  TraccarUser, 
  TraccarGroup, 
  TraccarServer, 
  TraccarReport, 
  TraccarTripReport, 
  TraccarStopReport, 
  TraccarSummaryReport, 
  TraccarRouteReport, 
  TraccarStatistics, 
  TraccarApiResponse, 
  TraccarWebSocketMessage, 
  CreateDeviceRequest, 
  UpdateDeviceRequest, 
  CreateGeofenceRequest, 
  UpdateGeofenceRequest, 
  SendCommandRequest, 
  PositionQuery, 
  EventQuery, 
  ReportQuery 
} from './traccarTypes.js';

export interface TraccarConfig {
  baseUrl: string;
  username: string;
  password: string;
  timeout?: number;
}


export class TraccarService {
  private client: AxiosInstance;
  private authToken: string | null = null;

  constructor(private config: TraccarConfig) {
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout || 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for authentication
    this.client.interceptors.request.use(async (config: any) => {
      if (!this.authToken) {
        await this.authenticate();
      }
      if (this.authToken) {
        config.headers.Authorization = `Bearer ${this.authToken}`;
      }
      return config;
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401 && error.config) {
          // Token expired, re-authenticate
          await this.authenticate();
          if (this.authToken && error.config) {
            error.config.headers = error.config.headers || {};
            error.config.headers.Authorization = `Bearer ${this.authToken}`;
            return this.client.request(error.config);
          }
        }
        return Promise.reject(error);
      }
    );
  }

  private async authenticate(): Promise<void> {
    const maxRetries = 5;
    const baseDelay = 2000; // 2 seconds
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.client.post('/api/session', {
          email: this.config.username,
          password: this.config.password,
        });
        this.authToken = response.data.token;
        console.log('Traccar authentication successful');
        return; // Success, exit
      } catch (error: any) {
        const errorMessage = error?.response?.data?.message || error?.message || 'Unknown error';
        const statusCode = error?.response?.status || 'N/A';
        const isConnectionError = error?.code === 'ECONNREFUSED' || error?.code === 'ETIMEDOUT' || error?.message?.includes('fetch failed');
        
        if (isConnectionError && attempt < maxRetries) {
          // Connection error - Traccar might still be starting up
          const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff: 2s, 4s, 8s, 16s, 32s
          console.log(`Traccar not ready yet (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // Authentication error or max retries reached
        console.error(`Traccar authentication failed (${statusCode}):`, errorMessage);
        throw new Error(`Failed to authenticate with Traccar: ${errorMessage}`);
      }
    }
  }

  // Device Management
  async getDevices(): Promise<TraccarDevice[]> {
    const response = await this.client.get('/api/devices');
    return response.data;
  }

  async getDevice(id: number): Promise<TraccarDevice> {
    const response = await this.client.get(`/api/devices/${id}`);
    return response.data;
  }

  async createDevice(device: CreateDeviceRequest): Promise<TraccarDevice> {
    const response = await this.client.post('/api/devices', device);
    return response.data;
  }

  async updateDevice(id: number, device: UpdateDeviceRequest): Promise<TraccarDevice> {
    const response = await this.client.put(`/api/devices/${id}`, device);
    return response.data;
  }

  async deleteDevice(id: number): Promise<void> {
    await this.client.delete(`/api/devices/${id}`);
  }

  // Position Management
  async getPositions(deviceId?: number, from?: Date, to?: Date): Promise<TraccarPosition[]> {
    const params: any = {};
    if (deviceId) params.deviceId = deviceId;
    if (from) params.from = from.toISOString();
    if (to) params.to = to.toISOString();

    const response = await this.client.get('/api/positions', { params });
    return response.data;
  }

  async getLatestPositions(deviceIds?: number[]): Promise<TraccarPosition[]> {
    const params: any = {};
    if (deviceIds) params.deviceIds = deviceIds.join(',');

    const response = await this.client.get('/api/positions/latest', { params });
    return response.data;
  }

  // Event Management
  async getEvents(deviceId?: number, from?: Date, to?: Date): Promise<TraccarEvent[]> {
    const params: any = {};
    if (deviceId) params.deviceId = deviceId;
    if (from) params.from = from.toISOString();
    if (to) params.to = to.toISOString();

    const response = await this.client.get('/api/events', { params });
    return response.data;
  }

  // Reports
  async getTripsReport(deviceIds: number[], from: Date, to: Date): Promise<TraccarTripReport[]> {
    const params = {
      deviceIds: deviceIds.join(','),
      from: from.toISOString(),
      to: to.toISOString(),
    };

    const response = await this.client.get('/api/reports/trips', { params });
    return response.data;
  }

  async getStopsReport(deviceIds: number[], from: Date, to: Date): Promise<TraccarStopReport[]> {
    const params = {
      deviceIds: deviceIds.join(','),
      from: from.toISOString(),
      to: to.toISOString(),
    };

    const response = await this.client.get('/api/reports/stops', { params });
    return response.data;
  }

  async getSummaryReport(deviceIds: number[], from: Date, to: Date): Promise<TraccarSummaryReport[]> {
    const params = {
      deviceIds: deviceIds.join(','),
      from: from.toISOString(),
      to: to.toISOString(),
    };

    const response = await this.client.get('/api/reports/summary', { params });
    return response.data;
  }

  async getRouteReport(deviceIds: number[], from: Date, to: Date): Promise<TraccarRouteReport[]> {
    const params = {
      deviceIds: deviceIds.join(','),
      from: from.toISOString(),
      to: to.toISOString(),
    };

    const response = await this.client.get('/api/reports/route', { params });
    return response.data;
  }

  // Commands
  async sendCommand(deviceId: number, command: string, parameters: Record<string, any> = {}): Promise<void> {
    await this.client.post('/api/commands', {
      deviceId,
      type: command,
      parameters,
    });
  }

  // User Management
  async getUsers(): Promise<TraccarUser[]> {
    const response = await this.client.get('/api/users');
    return response.data;
  }

  async createUser(user: Partial<TraccarUser>): Promise<TraccarUser> {
    const response = await this.client.post('/api/users', user);
    return response.data;
  }

  // Server Information
  async getServerInfo(): Promise<TraccarServer> {
    const response = await this.client.get('/api/server');
    return response.data;
  }

  // Statistics
  async getStatistics(from?: Date, to?: Date): Promise<TraccarStatistics> {
    const params: any = {};
    if (from) params.from = from.toISOString();
    if (to) params.to = to.toISOString();

    const response = await this.client.get('/api/statistics', { params });
    return response.data;
  }

  // WebSocket URL for real-time updates
  getWebSocketUrl(): string {
    const wsUrl = this.config.baseUrl.replace('http', 'ws');
    // Traccar WebSocket requires authentication token
    // Ensure we're authenticated before getting the URL
    if (!this.authToken) {
      throw new Error('Not authenticated with Traccar. Call authenticate() first.');
    }
    return `${wsUrl}/api/socket?token=${this.authToken}`;
  }

  // Get authentication token (for WebSocket connections)
  getAuthToken(): string | null {
    return this.authToken;
  }

  // Ensure authentication before WebSocket connection
  async ensureAuthenticated(): Promise<void> {
    if (!this.authToken) {
      await this.authenticate();
    }
  }
}

// Singleton instance
let traccarService: TraccarService | null = null;

export function getTraccarService(): TraccarService {
  if (!traccarService) {
    const config: TraccarConfig = {
      // Support both TRACCAR_BASE_URL and TRACCAR_API_URL for compatibility
      baseUrl: process.env.TRACCAR_BASE_URL || process.env.TRACCAR_API_URL || 'http://localhost:8082',
      username: process.env.TRACCAR_USERNAME || 'admin',
      password: process.env.TRACCAR_PASSWORD || 'admin',
      timeout: parseInt(process.env.TRACCAR_TIMEOUT || '10000'),
    };
    traccarService = new TraccarService(config);
  }
  return traccarService;
}
