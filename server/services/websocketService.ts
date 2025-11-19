import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { getTraccarService } from './traccarService.js';
import { db } from '../db.js';
import { 
  tracking_positions, 
  tracking_events, 
  vehicles 
} from '../../shared/schema.js';
import { eq } from 'drizzle-orm';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: number;
  deviceIds?: number[];
  isAlive?: boolean;
}

interface WebSocketMessage {
  type: 'positions' | 'events' | 'ping' | 'pong' | 'subscribe' | 'unsubscribe';
  data?: any;
  deviceIds?: number[];
}

class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Map<WebSocket, AuthenticatedWebSocket> = new Map();
  private traccarWs: WebSocket | null = null;
  private isConnectedToTraccar = false;
  private reconnectInterval: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 5000; // Start with 5 seconds

  constructor() {
    this.setupTraccarConnection();
  }

  public initialize(server: any) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/api/tracking/websocket'
    });

    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      this.handleClientConnection(ws, req);
    });

    console.log('WebSocket service initialized');
    
    // Start ping interval to keep connections alive
    this.startPingInterval();
  }

  private handleClientConnection(ws: WebSocket, req: IncomingMessage) {
    const authenticatedWs = ws as AuthenticatedWebSocket;
    authenticatedWs.isAlive = true;
    
    // Check authentication via cookies or query parameters
    const cookies = req.headers.cookie;
    let url: URL;
    try {
      url = new URL(req.url || '', `http://${req.headers.host}`);
    } catch (error) {
      console.error('Invalid WebSocket URL:', req.url);
      ws.close(1002, 'Invalid URL');
      return;
    }
    const tokenParam = url.searchParams.get('token');
    
    let hasValidAuth = false;
    
    // Check for token in cookies
    if (cookies && cookies.includes('token=')) {
      const tokenMatch = cookies.match(/token=([^;]+)/);
      if (tokenMatch) {
        hasValidAuth = true;
      }
    }
    
    // Check for token in query parameters (for development/testing)
    if (!hasValidAuth && tokenParam) {
      hasValidAuth = true;
    }
    
    // For development, allow connections without strict authentication
    if (!hasValidAuth) {
      hasValidAuth = true;
    }
    
    if (!hasValidAuth) {
      console.log('WebSocket connection rejected: No authentication token');
      ws.close(1008, 'Authentication required');
      return;
    }
    
    this.clients.set(ws, authenticatedWs);
    
    // Log connection only once per session (reduce spam)
    if (this.clients.size === 1 || this.clients.size % 10 === 0) {
      console.log(`WebSocket client connected (total: ${this.clients.size})`);
    }

    // Handle ping/pong for connection health
    ws.on('pong', () => {
      authenticatedWs.isAlive = true;
    });

    ws.on('message', (data: Buffer) => {
      try {
        const message: WebSocketMessage = JSON.parse(data.toString());
        this.handleClientMessage(authenticatedWs, message);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
        this.sendError(ws, 'Invalid message format');
      }
    });

    // Send welcome message after a short delay to ensure connection is fully established
    // Use requestAnimationFrame-like approach for better timing
    const sendWelcomeMessage = () => {
      // Check connection state before sending
      if (ws.readyState === WebSocket.OPEN) {
        try {
          this.sendMessage(ws, {
            type: 'connected',
            data: { message: 'Connected to tracking WebSocket' }
          });
        } catch (error) {
          // Connection might be closing, ignore silently
        }
      } else if (ws.readyState === WebSocket.CONNECTING) {
        // Still connecting, try again in a moment
        setTimeout(sendWelcomeMessage, 50);
      }
      // If CLOSING or CLOSED, don't send
    };
    
    // Use setTimeout with 0ms to ensure it runs after the connection is fully established
    setTimeout(sendWelcomeMessage, 0);

    ws.on('close', (code, reason) => {
      this.clients.delete(ws);
      // Only log normal disconnections, suppress 1001 (Going Away) spam
      if (code !== 1001) {
        console.log(`Client disconnected: code=${code}, reason=${reason.toString()}`);
      }
    });

    ws.on('error', (error) => {
      // Only log errors if connection is not already closing
      if (ws.readyState !== WebSocket.CLOSING && ws.readyState !== WebSocket.CLOSED) {
        console.error('WebSocket error:', error);
      }
      this.clients.delete(ws);
    });
  }

  private handleClientMessage(ws: AuthenticatedWebSocket, message: WebSocketMessage) {
    switch (message.type) {
      case 'ping':
        this.sendMessage(ws, { type: 'pong' });
        break;
      
      case 'subscribe':
        if (message.deviceIds && Array.isArray(message.deviceIds)) {
          ws.deviceIds = message.deviceIds;
          this.sendMessage(ws, {
            type: 'subscribed',
            data: { deviceIds: message.deviceIds }
          });
        }
        break;
      
      case 'unsubscribe':
        ws.deviceIds = [];
        this.sendMessage(ws, {
          type: 'unsubscribed',
          data: { message: 'Unsubscribed from all devices' }
        });
        break;
      
      default:
        this.sendError(ws, `Unknown message type: ${message.type}`);
    }
  }

  private setupTraccarConnection() {
    // Connect to Traccar asynchronously - don't block app startup
    // Use setTimeout to ensure this doesn't block the main thread
    // Increased delay to 10 seconds to give Traccar time to fully start
    setTimeout(() => {
      this.connectToTraccar().catch(error => {
        console.log('Traccar service not available, continuing without it:', error instanceof Error ? error.message : String(error));
      });
    }, 10000); // Delay by 10 seconds to let Traccar fully start
  }

  private async connectToTraccar() {
    try {
      const traccarService = getTraccarService();
      
      // Ensure we're authenticated before connecting
      // If authentication fails, log but don't crash
      try {
        await traccarService.ensureAuthenticated();
      } catch (authError) {
        console.log('Traccar authentication failed, skipping WebSocket connection:', authError instanceof Error ? authError.message : String(authError));
        return; // Exit early if authentication fails
      }
      
      const wsUrl = traccarService.getWebSocketUrl();
      
      console.log('Attempting to connect to Traccar WebSocket:', wsUrl.replace(/token=[^&]+/, 'token=***'));
      
      this.traccarWs = new WebSocket(wsUrl);
      
      this.traccarWs.on('open', () => {
        console.log('Connected to Traccar WebSocket');
        this.isConnectedToTraccar = true;
        this.reconnectAttempts = 0; // Reset on successful connection
        this.reconnectDelay = 5000; // Reset delay
        this.clearReconnectInterval();
      });
      
      this.traccarWs.on('message', (data: Buffer) => {
        this.handleTraccarMessage(data);
      });
      
      this.traccarWs.on('close', (code, reason) => {
        console.log('Disconnected from Traccar WebSocket:', code, reason.toString());
        this.isConnectedToTraccar = false;
        // Only schedule reconnect if it's not a connection refused error
        if (code !== 1006) {
          this.scheduleReconnect();
        }
      });
      
      this.traccarWs.on('error', (error) => {
        console.log('Traccar WebSocket error (service may not be available):', error.message);
        this.isConnectedToTraccar = false;
      });
      
    } catch (error) {
      console.log('Error connecting to Traccar WebSocket (service may not be available):', error instanceof Error ? error.message : String(error));
      // Don't schedule reconnect for connection errors
    }
  }

  private handleTraccarMessage(data: Buffer) {
    try {
      const message = JSON.parse(data.toString());
      
      if (message.positions) {
        this.processPositions(message.positions);
        this.broadcastToClients({
          type: 'positions',
          data: message.positions
        });
      }
      
      if (message.events) {
        this.processEvents(message.events);
        this.broadcastToClients({
          type: 'events',
          data: message.events
        });
      }
      
    } catch (error) {
      console.error('Error processing Traccar message:', error);
    }
  }

  // Cache vehicle lookups to avoid repeated database queries
  private vehicleCache: Map<number, number> = new Map(); // traccar_device_id -> vehicle_id
  private vehicleCacheExpiry: Map<number, number> = new Map(); // traccar_device_id -> expiry timestamp
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private async getVehicleIdByTraccarDeviceId(deviceId: number): Promise<number | null> {
    // Check cache first
    const cached = this.vehicleCache.get(deviceId);
    const expiry = this.vehicleCacheExpiry.get(deviceId);
    if (cached && expiry && Date.now() < expiry) {
      return cached;
    }

    // Query database
    const [vehicle] = await db
      .select({ id: vehicles.id })
      .from(vehicles)
      .where(eq(vehicles.traccar_device_id, deviceId))
      .limit(1);

    if (vehicle) {
      // Cache the result
      this.vehicleCache.set(deviceId, vehicle.id);
      this.vehicleCacheExpiry.set(deviceId, Date.now() + this.CACHE_TTL);
      return vehicle.id;
    }

    return null;
  }

  // Clean up expired cache entries periodically
  private cleanupCache() {
    const now = Date.now();
    const entries = Array.from(this.vehicleCacheExpiry.entries());
    for (const [deviceId, expiry] of entries) {
      if (now >= expiry) {
        this.vehicleCache.delete(deviceId);
        this.vehicleCacheExpiry.delete(deviceId);
      }
    }
  }

  private async processPositions(positions: any[]) {
    try {
      // Limit the number of positions processed to prevent memory issues
      const limitedPositions = positions.slice(0, 50); // Reduced from 100 to 50
      
      // Clean cache periodically
      if (Math.random() < 0.1) { // 10% chance to clean cache
        this.cleanupCache();
      }

      // Batch process positions to reduce memory pressure
      const batchSize = 10;
      for (let i = 0; i < limitedPositions.length; i += batchSize) {
        const batch = limitedPositions.slice(i, i + batchSize);
        
        // Process batch in parallel but limit concurrency
        await Promise.all(batch.map(async (position) => {
          const vehicleId = await this.getVehicleIdByTraccarDeviceId(position.deviceId);
          
          if (vehicleId) {
            // Store position in database (with error handling)
            try {
              await db.insert(tracking_positions).values({
                vehicle_id: vehicleId,
                traccar_position_id: position.id,
                fix_time: new Date(position.fixTime),
                latitude: position.latitude.toString(),
                longitude: position.longitude.toString(),
                speed: position.speed?.toString(),
                course: position.course?.toString(),
                accuracy: position.accuracy?.toString(),
                valid: position.valid,
                attributes: JSON.stringify(position.attributes || {}),
              });
            } catch (insertError) {
              // Skip duplicate positions or other insert errors
              // Don't log every duplicate to reduce memory from logs
              return;
            }

            // Update vehicle's last position (only if insert succeeded)
            try {
              await db
                .update(vehicles)
                .set({
                  last_position_update: new Date(position.fixTime),
                  current_status: position.valid ? 'online' : 'offline',
                  last_latitude: position.latitude.toString(),
                  last_longitude: position.longitude.toString(),
                  last_speed: position.speed?.toString(),
                  last_course: position.course?.toString(),
                  updated_at: new Date(),
                })
                .where(eq(vehicles.id, vehicleId));
            } catch (updateError) {
              // Silently fail to avoid log spam
              return;
            }
          }
        }));
      }
    } catch (error) {
      console.error('Error processing positions:', error);
    }
  }

  private async processEvents(events: any[]) {
    try {
      // Limit the number of events processed to prevent memory issues
      const limitedEvents = events.slice(0, 25); // Reduced from 50 to 25
      
      // Batch process events
      const batchSize = 5;
      for (let i = 0; i < limitedEvents.length; i += batchSize) {
        const batch = limitedEvents.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (event) => {
          const vehicleId = await this.getVehicleIdByTraccarDeviceId(event.deviceId);
          
          if (vehicleId) {
            // Store event in database (with error handling)
            try {
              await db.insert(tracking_events).values({
                vehicle_id: vehicleId,
                traccar_event_id: event.id,
                event_type: event.type,
                event_time: new Date(event.eventTime),
                latitude: event.latitude?.toString(),
                longitude: event.longitude?.toString(),
                speed: event.speed?.toString(),
                course: event.course?.toString(),
                attributes: JSON.stringify(event.attributes || {}),
              });
            } catch (insertError) {
              // Skip duplicate events silently to reduce log memory
              return;
            }
          }
        }));
      }
    } catch (error) {
      console.error('Error processing events:', error);
    }
  }

  private broadcastToClients(message: WebSocketMessage) {
    this.clients.forEach((client, ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        // Filter by subscribed device IDs if client has specific subscriptions
        if (client.deviceIds && client.deviceIds.length > 0) {
          if (message.data && Array.isArray(message.data)) {
            const filteredData = message.data.filter((item: any) => 
              client.deviceIds!.includes(item.deviceId)
            );
            if (filteredData.length > 0) {
              this.sendMessage(ws, {
                ...message,
                data: filteredData
              });
            }
          }
        } else {
          // Send all data if no specific subscriptions
          this.sendMessage(ws, message);
        }
      }
    });
  }

  private sendMessage(ws: WebSocket, message: any) {
    try {
      if (ws.readyState === WebSocket.OPEN) {
        const messageStr = JSON.stringify(message);
        ws.send(messageStr);
      } else {
        console.warn(`Cannot send message, WebSocket state: ${ws.readyState}`);
      }
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      // Don't throw, just log the error
    }
  }

  private sendError(ws: WebSocket, error: string) {
    this.sendMessage(ws, {
      type: 'error',
      data: { error }
    });
  }

  private scheduleReconnect() {
    if (this.reconnectInterval) {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max Traccar reconnection attempts reached. Traccar service appears to be unavailable.');
      return;
    }

    this.reconnectAttempts++;
    // Exponential backoff: 5s, 10s, 20s, 40s, max 60s
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 60000);
    
    console.log(`Scheduling Traccar reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms...`);
    
    this.reconnectInterval = setTimeout(() => {
      this.reconnectInterval = null;
      if (!this.isConnectedToTraccar) {
        this.connectToTraccar().catch(() => {
          // Error already logged in connectToTraccar
        });
      }
    }, delay);
  }

  private clearReconnectInterval() {
    if (this.reconnectInterval) {
      clearTimeout(this.reconnectInterval);
      this.reconnectInterval = null;
    }
  }

  private startPingInterval() {
    this.pingInterval = setInterval(() => {
      this.clients.forEach((client, ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          if (!client.isAlive) {
            console.log('Client did not respond to ping, terminating connection');
            ws.terminate();
            this.clients.delete(ws);
            return;
          }
          client.isAlive = false;
          ws.ping();
        }
      });
    }, 30000); // Ping every 30 seconds
  }

  private stopPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  public broadcastPositionUpdate(deviceId: number, position: any) {
    this.broadcastToClients({
      type: 'positions',
      data: [position]
    });
  }

  public broadcastEventUpdate(deviceId: number, event: any) {
    this.broadcastToClients({
      type: 'events',
      data: [event]
    });
  }

  public getConnectedClientsCount(): number {
    return this.clients.size;
  }

  public isTraccarConnected(): boolean {
    return this.isConnectedToTraccar;
  }

  public shutdown() {
    console.log('Shutting down WebSocket service...');
    
    // Stop ping interval first
    this.stopPingInterval();
    
    // Clear reconnect interval
    this.clearReconnectInterval();
    
    // Close all client connections
    this.clients.forEach((client, ws) => {
      try {
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close(1001, 'Server shutting down');
        } else {
          ws.terminate();
        }
      } catch (error) {
        // Ignore errors when closing connections
      }
    });
    this.clients.clear();
    
    // Close Traccar WebSocket connection
    if (this.traccarWs) {
      try {
        if (this.traccarWs.readyState === WebSocket.OPEN || this.traccarWs.readyState === WebSocket.CONNECTING) {
          this.traccarWs.close(1001, 'Server shutting down');
        } else {
          this.traccarWs.terminate();
        }
      } catch (error) {
        // Ignore errors
      }
      this.traccarWs = null;
    }
    
    // Close WebSocket server
    if (this.wss) {
      try {
        this.wss.close(() => {
          console.log('WebSocket server closed');
        });
      } catch (error) {
        // Ignore errors
      }
      this.wss = null;
    }
    
    this.isConnectedToTraccar = false;
    console.log('WebSocket service shutdown complete');
  }
}

// Singleton instance
let websocketService: WebSocketService | null = null;

export function getWebSocketService(): WebSocketService {
  if (!websocketService) {
    websocketService = new WebSocketService();
  }
  return websocketService;
}

export default WebSocketService;
