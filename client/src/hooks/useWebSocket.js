/**
 * WebSocket Hook for Real-time Traccar Updates
 * Handles WebSocket connection to Traccar backend for real-time data
 * Uses a shared singleton connection to prevent multiple connections
 */

import { useEffect, useRef, useState, useCallback } from 'react';

// Dynamic WebSocket URL based on current host
const getWebSocketUrl = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  // Use window.location.host which includes port, or fallback to explicit construction
  const host = window.location.host || `${window.location.hostname || 'localhost'}:${window.location.port || (protocol === 'wss:' ? '443' : '5000')}`;
  return `${protocol}//${host}/api/tracking/websocket`;
};

// Shared WebSocket connection singleton
class SharedWebSocketManager {
  constructor() {
    this.ws = null;
    this.listeners = new Set();
    this.reconnectTimeout = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectInterval = 5000;
    this.shouldReconnect = true;
    this.isConnecting = false;
    this.connectionStatus = 'disconnected';
  }

  addListener(listener) {
    this.listeners.add(listener);
    // If already connected, notify the new listener
    if (this.ws?.readyState === WebSocket.OPEN) {
      listener.onConnect?.();
    }
    // Connect if not already connected and not connecting
    if (!this.ws && !this.isConnecting && this.shouldReconnect) {
      this.connect();
    }
  }

  removeListener(listener) {
    this.listeners.delete(listener);
    // If no more listeners, disconnect
    if (this.listeners.size === 0) {
      this.disconnect();
    }
  }

  connect() {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    if (this.ws?.readyState === WebSocket.CONNECTING) {
      return;
    }

    // Check authentication
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (!user) {
      console.log('User not authenticated, skipping WebSocket connection');
      return;
    }

    this.isConnecting = true;
    this.connectionStatus = 'connecting';
    this.notifyListeners('status', 'connecting');

    try {
      const wsUrl = getWebSocketUrl();
      this.ws = new WebSocket(wsUrl);

      const connectionTimeout = setTimeout(() => {
        if (this.ws?.readyState !== WebSocket.OPEN) {
          console.warn('WebSocket connection timeout');
          this.ws?.close();
        }
      }, 10000);

      this.ws.onopen = () => {
        clearTimeout(connectionTimeout);
        this.isConnecting = false;
        this.connectionStatus = 'connected';
        this.reconnectAttempts = 0;
        this.notifyListeners('connect');
        this.notifyListeners('status', 'connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.notifyListeners('message', data);
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
          this.notifyListeners('error', 'Failed to parse message');
        }
      };

      this.ws.onclose = (event) => {
        clearTimeout(connectionTimeout);
        this.isConnecting = false;
        this.connectionStatus = 'disconnected';
        
        // Only log non-normal closures
        if (event.code !== 1001 && event.code !== 1005) {
          console.log('WebSocket disconnected:', event.code, event.reason || 'No reason');
        }
        
        this.notifyListeners('disconnect', event);
        this.notifyListeners('status', 'disconnected');

        // Attempt to reconnect if not manually closed
        if (this.shouldReconnect && 
            event.code !== 1001 && 
            event.code !== 1005 && 
            this.reconnectAttempts < this.maxReconnectAttempts &&
            this.listeners.size > 0) {
          this.reconnectAttempts++;
          const delay = Math.min(
            this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1), 
            30000
          );
          
          this.reconnectTimeout = setTimeout(() => {
            this.connect();
          }, delay);
        }
      };

      this.ws.onerror = (error) => {
        if (this.ws?.readyState !== WebSocket.OPEN) {
          console.error('WebSocket error:', error);
          this.notifyListeners('error', error);
        }
      };
    } catch (err) {
      this.isConnecting = false;
      this.connectionStatus = 'error';
      console.error('Failed to create WebSocket connection:', err);
      this.notifyListeners('error', err);
    }
  }

  disconnect() {
    this.shouldReconnect = false;
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.connectionStatus = 'disconnected';
    this.notifyListeners('status', 'disconnected');
  }

  notifyListeners(event, data) {
    this.listeners.forEach(listener => {
      try {
        switch (event) {
          case 'connect':
            listener.onConnect?.();
            break;
          case 'disconnect':
            listener.onDisconnect?.(data);
            break;
          case 'message':
            listener.onMessage?.(data);
            break;
          case 'error':
            listener.onError?.(data);
            break;
          case 'status':
            listener.onStatusChange?.(data);
            break;
        }
      } catch (err) {
        console.error('Error in WebSocket listener:', err);
      }
    });
  }

  sendMessage(message) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        const data = typeof message === 'string' ? message : JSON.stringify(message);
        this.ws.send(data);
        return true;
      } catch (err) {
        console.error('Failed to send WebSocket message:', err);
        return false;
      }
    }
    return false;
  }

  getConnectionStatus() {
    return this.connectionStatus;
  }

  isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Global singleton instance
const sharedWebSocketManager = new SharedWebSocketManager();

export const useWebSocket = (options = {}) => {
  const {
    onConnect = () => {},
    onDisconnect = () => {},
    onError = () => {},
    onMessage = () => {},
    autoConnect = true,
  } = options;

  const [isConnected, setIsConnected] = useState(sharedWebSocketManager.isConnected());
  const [connectionStatus, setConnectionStatus] = useState(sharedWebSocketManager.getConnectionStatus());
  const [lastMessage, setLastMessage] = useState(null);
  const [error, setError] = useState(null);
  
  const listenerRef = useRef({
    onConnect: () => {
      setIsConnected(true);
      onConnect();
    },
    onDisconnect: (event) => {
      setIsConnected(false);
      onDisconnect(event);
    },
    onMessage: (data) => {
      setLastMessage(data);
      onMessage(data);
    },
    onError: (err) => {
      setError(err);
      onError(err);
    },
    onStatusChange: (status) => {
      setConnectionStatus(status);
      setIsConnected(status === 'connected');
    },
  });

  useEffect(() => {
    // Update listener callbacks when they change
    listenerRef.current.onConnect = () => {
      setIsConnected(true);
      onConnect();
    };
    listenerRef.current.onDisconnect = (event) => {
      setIsConnected(false);
      onDisconnect(event);
    };
    listenerRef.current.onMessage = (data) => {
      setLastMessage(data);
      onMessage(data);
    };
    listenerRef.current.onError = (err) => {
      setError(err);
      onError(err);
    };
    listenerRef.current.onStatusChange = (status) => {
      setConnectionStatus(status);
      setIsConnected(status === 'connected');
    };
  }, [onConnect, onDisconnect, onError, onMessage]);

  useEffect(() => {
    if (autoConnect) {
      const user = JSON.parse(localStorage.getItem('user') || 'null');
      if (user) {
        sharedWebSocketManager.addListener(listenerRef.current);
      }
    }

    return () => {
      sharedWebSocketManager.removeListener(listenerRef.current);
    };
  }, [autoConnect]);

  const connect = useCallback(() => {
    sharedWebSocketManager.addListener(listenerRef.current);
  }, []);

  const disconnect = useCallback(() => {
    sharedWebSocketManager.removeListener(listenerRef.current);
  }, []);

  const sendMessage = useCallback((message) => {
    return sharedWebSocketManager.sendMessage(message);
  }, []);

  const reconnect = useCallback(() => {
    sharedWebSocketManager.disconnect();
    setTimeout(() => {
      sharedWebSocketManager.shouldReconnect = true;
      sharedWebSocketManager.connect();
    }, 1000);
  }, []);

  return {
    isConnected,
    connectionStatus,
    lastMessage,
    error,
    connect,
    disconnect,
    sendMessage,
    reconnect,
  };
};

/**
 * Hook for real-time vehicle positions
 */
export const useVehiclePositions = (deviceIds = []) => {
  const [positions, setPositions] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const handleMessage = useCallback((data) => {
    if (data.type === 'positions' && data.data) {
      const newPositions = {};
      data.data.forEach(position => {
        if (deviceIds.length === 0 || deviceIds.includes(position.deviceId)) {
          newPositions[position.deviceId] = position;
        }
      });
      setPositions(prev => ({ ...prev, ...newPositions }));
    }
  }, [deviceIds]);

  const { isConnected, error, connect } = useWebSocket({
    onMessage: handleMessage,
    autoConnect: false,
  });

  return {
    positions,
    isConnected,
    error,
    isLoading,
    connect,
  };
};

/**
 * Hook for real-time events
 */
export const useVehicleEvents = (deviceIds = []) => {
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleMessage = useCallback((data) => {
    if (data.type === 'events' && data.data) {
      const filteredEvents = data.data.filter(event => 
        deviceIds.length === 0 || deviceIds.includes(event.deviceId)
      );
      setEvents(prev => [...filteredEvents, ...prev].slice(0, 100));
    }
  }, [deviceIds]);

  const { isConnected, error, connect } = useWebSocket({
    onMessage: handleMessage,
    autoConnect: false,
  });

  return {
    events,
    isConnected,
    error,
    isLoading,
    connect,
  };
};

/**
 * Hook for real-time device status updates
 */
export const useDeviceStatus = (deviceIds = []) => {
  const [deviceStatuses, setDeviceStatuses] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const handleMessage = useCallback((data) => {
    if (data.type === 'devices' && data.data) {
      const newStatuses = {};
      data.data.forEach(device => {
        if (deviceIds.length === 0 || deviceIds.includes(device.id)) {
          newStatuses[device.id] = {
            id: device.id,
            status: device.status,
            lastUpdate: device.lastUpdate,
            online: device.status === 'online',
          };
        }
      });
      setDeviceStatuses(prev => ({ ...prev, ...newStatuses }));
    }
  }, [deviceIds]);

  const { isConnected, error, connect } = useWebSocket({
    onMessage: handleMessage,
    autoConnect: false,
  });

  return {
    deviceStatuses,
    isConnected,
    error,
    isLoading,
    connect,
  };
};
