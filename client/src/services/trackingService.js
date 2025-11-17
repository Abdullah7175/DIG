import store from '../store';
import {
  setDevices,
  updateDevice,
  setPositions,
  updatePosition,
  addEvents,
  addAlerts,
  setSocketConnected,
  setLoading,
  setError,
  clearError
} from '../store/tracking';

class TrackingService {
  constructor() {
    this.socket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 5000;
    this.isConnecting = false;
  }

  // Initialize WebSocket connection
  connect() {
    // Disabled - using new Traccar integration instead
    console.log('Old trackingService WebSocket disabled - using new Traccar integration');
    return;
    
    if (this.isConnecting || (this.socket && this.socket.readyState === WebSocket.OPEN)) {
      return;
    }

    // Check if user is authenticated
    const user = this.getUser();
    if (!user) {
      console.log('User not authenticated, skipping WebSocket connection');
      return;
    }

    this.isConnecting = true;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const hostname = window.location.hostname || 'localhost';
    const port = window.location.port || (protocol === 'wss:' ? '443' : '5000');
    const wsUrl = `${protocol}//${hostname}:${port}/api/tracking/websocket`;
    
    try {
      this.socket = new WebSocket(wsUrl);
      this.setupEventHandlers();
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      store.dispatch(setError('Failed to connect to tracking service'));
      this.isConnecting = false;
    }
  }

  // Get user from localStorage
  getUser() {
    try {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  }

  // Setup WebSocket event handlers
  setupEventHandlers() {
    this.socket.onopen = () => {
      console.log('Tracking WebSocket connected');
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      store.dispatch(setSocketConnected(true));
      store.dispatch(clearError());
      
      // Request initial data
      this.requestInitialData();
    };

    this.socket.onclose = (event) => {
      console.log('Tracking WebSocket disconnected:', event.code, event.reason);
      this.isConnecting = false;
      store.dispatch(setSocketConnected(false));
      
      if (event.code === 1008) { // Authentication error
        console.log('WebSocket authentication failed');
        store.dispatch(setError('Authentication required for tracking service'));
        return;
      }
      
      // Attempt to reconnect if not a normal closure
      if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.scheduleReconnect();
      }
    };

    this.socket.onerror = (error) => {
      console.error('Tracking WebSocket error:', error);
      this.isConnecting = false;
      store.dispatch(setError('Connection error occurred'));
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };
  }

  // Handle incoming WebSocket messages
  handleMessage(data) {
    switch (data.type) {
      case 'devices':
        if (data.action === 'update') {
          store.dispatch(updateDevice(data.device));
        } else if (data.action === 'refresh') {
          store.dispatch(setDevices(data.devices));
        }
        break;

      case 'positions':
        if (data.action === 'update') {
          store.dispatch(updatePosition(data.position));
        } else if (data.action === 'refresh') {
          store.dispatch(setPositions(data.positions));
        }
        break;

      case 'events':
        store.dispatch(addEvents(data.events));
        break;

      case 'alerts':
        store.dispatch(addAlerts(data.alerts));
        break;

      case 'error':
        store.dispatch(setError(data.message));
        break;

      case 'connected':
        console.log('WebSocket connected:', data.data?.message);
        break;

      case 'pong':
        console.log('Received pong from server');
        break;

      default:
        console.log('Unknown message type:', data.type);
    }
  }

  // Request initial data from server
  requestInitialData() {
    // Fetch initial data via HTTP API instead of WebSocket
    this.fetchDevices();
    // Only fetch positions if we have devices
    this.fetchDevices().then(devices => {
      if (devices && devices.length > 0) {
        const deviceIds = devices.map(device => device.id);
        this.fetchPositions(deviceIds);
      }
    }).catch(error => {
      console.log('No devices available, skipping position fetch');
    });
    this.fetchEvents();
    this.fetchAlerts();
  }

  // Send message through WebSocket
  sendMessage(message) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message:', message);
    }
  }

  // Subscribe to specific devices
  subscribeToDevices(deviceIds) {
    this.sendMessage({
      type: 'subscribe',
      data: {
        devices: deviceIds
      }
    });
  }

  // Unsubscribe from devices
  unsubscribeFromDevices() {
    this.sendMessage({
      type: 'unsubscribe',
      data: {
        devices: true
      }
    });
  }

  // Request device data
  async fetchDevices() {
    try {
      store.dispatch(setLoading(true));
      const response = await fetch('/api/tracking/devices', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const devices = await response.json();
      store.dispatch(setDevices(devices));
      return devices;
    } catch (error) {
      console.error('Failed to fetch devices:', error);
      store.dispatch(setError('Failed to fetch devices'));
      throw error;
    } finally {
      store.dispatch(setLoading(false));
    }
  }

  // Request positions data
  async fetchPositions(deviceIds = []) {
    try {
      const queryParams = new URLSearchParams();
      if (deviceIds.length > 0) {
        queryParams.append('vehicleIds', deviceIds.join(','));
      }
      
      const response = await fetch(`/api/tracking/positions/latest?${queryParams}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const positions = await response.json();
      // Convert array to object keyed by deviceId
      const positionsObj = {};
      positions.forEach(position => {
        positionsObj[position.deviceId] = position;
      });
      store.dispatch(setPositions(positionsObj));
      return positions;
    } catch (error) {
      console.error('Failed to fetch positions:', error);
      store.dispatch(setError('Failed to fetch positions'));
      throw error;
    }
  }

  // Request events data
  async fetchEvents(deviceId = null, limit = 50) {
    try {
      const queryParams = new URLSearchParams();
      if (deviceId) queryParams.append('vehicleId', deviceId);
      queryParams.append('limit', limit);
      
      const response = await fetch(`/api/tracking/events?${queryParams}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const events = await response.json();
      store.dispatch(addEvents(events));
      return events;
    } catch (error) {
      console.error('Failed to fetch events:', error);
      store.dispatch(setError('Failed to fetch events'));
      throw error;
    }
  }

  // Request alerts data
  async fetchAlerts(limit = 50) {
    try {
      const response = await fetch(`/api/tracking/alerts?limit=${limit}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const alerts = await response.json();
      store.dispatch(addAlerts(alerts));
      return alerts;
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
      store.dispatch(setError('Failed to fetch alerts'));
      throw error;
    }
  }

  // Create new device
  async createDevice(deviceData) {
    try {
      const response = await fetch('/api/tracking/devices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(deviceData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      if (result.device) {
        store.dispatch(addDevice(result.device));
      }
      return result;
    } catch (error) {
      console.error('Failed to create device:', error);
      store.dispatch(setError('Failed to create device'));
      throw error;
    }
  }

  // Update device
  async updateDevice(deviceId, deviceData) {
    try {
      const response = await fetch(`/api/tracking/devices/${deviceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(deviceData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const device = await response.json();
      store.dispatch(updateDevice(device));
      return device;
    } catch (error) {
      console.error('Failed to update device:', error);
      store.dispatch(setError('Failed to update device'));
      throw error;
    }
  }

  // Delete device
  async deleteDevice(deviceId) {
    try {
      const response = await fetch(`/api/tracking/devices/${deviceId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      store.dispatch(removeDevice(deviceId));
      return true;
    } catch (error) {
      console.error('Failed to delete device:', error);
      store.dispatch(setError('Failed to delete device'));
      throw error;
    }
  }

  // Schedule reconnection attempt
  scheduleReconnect() {
    this.reconnectAttempts++;
    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
    
    setTimeout(() => {
      this.connect();
    }, this.reconnectInterval * this.reconnectAttempts);
  }

  // Disconnect WebSocket
  disconnect() {
    if (this.socket) {
      this.socket.close(1000, 'User disconnected');
      this.socket = null;
    }
    store.dispatch(setSocketConnected(false));
  }

  // Get connection status
  isConnected() {
    return this.socket && this.socket.readyState === WebSocket.OPEN;
  }

  // Ping server to check connection
  ping() {
    this.sendMessage({
      type: 'ping',
      timestamp: Date.now()
    });
  }
}

// Create singleton instance
const trackingService = new TrackingService();

export default trackingService;
