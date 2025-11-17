import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Device {
  id: number;
  name: string;
  uniqueId: string;
  status: string;
  lastUpdate?: string;
  positionId?: number;
  groupId?: number;
  phone?: string;
  model?: string;
  contact?: string;
  category?: string;
  disabled?: boolean;
  attributes?: Record<string, any>;
}

interface Position {
  id: number;
  deviceId: number;
  protocol: string;
  deviceTime: string;
  fixTime: string;
  serverTime: string;
  outdated: boolean;
  valid: boolean;
  latitude: number;
  longitude: number;
  altitude: number;
  speed: number;
  course: number;
  address?: string;
  accuracy: number;
  network?: Record<string, any>;
  attributes?: Record<string, any>;
}

interface Event {
  id: number;
  type: string;
  eventTime: string;
  deviceId: number;
  positionId?: number;
  geofenceId?: number;
  maintenanceId?: number;
  attributes?: Record<string, any>;
}

interface Geofence {
  id: number;
  name: string;
  description?: string;
  area: string;
  calendarId?: number;
  attributes?: Record<string, any>;
}

interface Alert {
  id: number;
  type: string;
  eventTime: string;
  deviceId: number;
  positionId?: number;
  geofenceId?: number;
  maintenanceId?: number;
  attributes?: Record<string, any>;
  read?: boolean;
}

interface Report {
  id: number;
  type: string;
  startTime: string;
  endTime: string;
  deviceId: number;
  data: any;
}

interface TrackingState {
  devices: Record<number, Device>;
  positions: Record<number, Position>;
  events: Event[];
  geofences: Record<number, Geofence>;
  alerts: Alert[];
  reports: Report[];
  selectedDeviceId: number | null;
  selectedPosition: Position | null;
  loading: boolean;
  error: string | null;
  socketConnected: boolean;
  realTimeEnabled: boolean;
  mapView: {
    center: [number, number];
    zoom: number;
    selectedDevices: number[];
  };
}

const initialState: TrackingState = {
  devices: {},
  positions: {},
  events: [],
  geofences: {},
  alerts: [],
  reports: [],
  selectedDeviceId: null,
  selectedPosition: null,
  loading: false,
  error: null,
  socketConnected: false,
  realTimeEnabled: true,
  mapView: {
    center: [0, 0],
    zoom: 10,
    selectedDevices: []
  }
};

const trackingSlice = createSlice({
  name: 'tracking',
  initialState,
  reducers: {
    // Device management
    setDevices: (state, action: PayloadAction<Device[]>) => {
      state.devices = {};
      action.payload.forEach(device => {
        state.devices[device.id] = device;
      });
    },
    updateDevice: (state, action: PayloadAction<Device>) => {
      const device = action.payload;
      state.devices[device.id] = { ...state.devices[device.id], ...device };
    },
    addDevice: (state, action: PayloadAction<Device>) => {
      const device = action.payload;
      state.devices[device.id] = device;
    },
    removeDevice: (state, action: PayloadAction<number>) => {
      delete state.devices[action.payload];
    },
    selectDevice: (state, action: PayloadAction<number>) => {
      state.selectedDeviceId = action.payload;
    },
    clearSelectedDevice: (state) => {
      state.selectedDeviceId = null;
      state.selectedPosition = null;
    },

    // Position management
    setPositions: (state, action: PayloadAction<Record<number, Position>>) => {
      state.positions = action.payload;
    },
    updatePosition: (state, action: PayloadAction<Position>) => {
      const position = action.payload;
      state.positions[position.deviceId] = position;
      if (state.selectedDeviceId === position.deviceId) {
        state.selectedPosition = position;
      }
    },
    setSelectedPosition: (state, action: PayloadAction<Position>) => {
      state.selectedPosition = action.payload;
    },

    // Events management
    addEvents: (state, action: PayloadAction<Event[]>) => {
      state.events.unshift(...action.payload);
      // Keep only last 100 events
      if (state.events.length > 100) {
        state.events = state.events.slice(0, 100);
      }
    },
    clearEvents: (state) => {
      state.events = [];
    },
    removeEvent: (state, action: PayloadAction<number>) => {
      state.events = state.events.filter(event => event.id !== action.payload);
    },

    // Geofences management
    setGeofences: (state, action: PayloadAction<Geofence[]>) => {
      state.geofences = {};
      action.payload.forEach(geofence => {
        state.geofences[geofence.id] = geofence;
      });
    },
    addGeofence: (state, action: PayloadAction<Geofence>) => {
      const geofence = action.payload;
      state.geofences[geofence.id] = geofence;
    },
    updateGeofence: (state, action: PayloadAction<Geofence>) => {
      const geofence = action.payload;
      state.geofences[geofence.id] = { ...state.geofences[geofence.id], ...geofence };
    },
    removeGeofence: (state, action: PayloadAction<number>) => {
      delete state.geofences[action.payload];
    },

    // Alerts management
    addAlerts: (state, action: PayloadAction<Alert[]>) => {
      state.alerts.unshift(...action.payload);
      // Keep only last 50 alerts
      if (state.alerts.length > 50) {
        state.alerts = state.alerts.slice(0, 50);
      }
    },
    clearAlerts: (state) => {
      state.alerts = [];
    },
    markAlertAsRead: (state, action: PayloadAction<number>) => {
      const alert = state.alerts.find(alert => alert.id === action.payload);
      if (alert) {
        alert.read = true;
      }
    },

    // Reports management
    setReports: (state, action: PayloadAction<Report[]>) => {
      state.reports = action.payload;
    },
    addReport: (state, action: PayloadAction<Report>) => {
      state.reports.unshift(action.payload);
    },

    // Connection status
    setSocketConnected: (state, action: PayloadAction<boolean>) => {
      state.socketConnected = action.payload;
    },
    setRealTimeEnabled: (state, action: PayloadAction<boolean>) => {
      state.realTimeEnabled = action.payload;
    },

    // Map view management
    setMapCenter: (state, action: PayloadAction<[number, number]>) => {
      state.mapView.center = action.payload;
    },
    setMapZoom: (state, action: PayloadAction<number>) => {
      state.mapView.zoom = action.payload;
    },
    setSelectedDevices: (state, action: PayloadAction<number[]>) => {
      state.mapView.selectedDevices = action.payload;
    },

    // Loading and error states
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },

    // Reset tracking state
    resetTracking: () => initialState
  }
});

export const {
  setDevices,
  updateDevice,
  addDevice,
  removeDevice,
  selectDevice,
  clearSelectedDevice,
  setPositions,
  updatePosition,
  setSelectedPosition,
  addEvents,
  clearEvents,
  removeEvent,
  setGeofences,
  addGeofence,
  updateGeofence,
  removeGeofence,
  addAlerts,
  clearAlerts,
  markAlertAsRead,
  setReports,
  addReport,
  setSocketConnected,
  setRealTimeEnabled,
  setMapCenter,
  setMapZoom,
  setSelectedDevices,
  setLoading,
  setError,
  clearError,
  resetTracking
} = trackingSlice.actions;

export default trackingSlice.reducer;
