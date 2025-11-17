// Traccar API Response Types

export interface TraccarDevice {
  id: number;
  name: string;
  uniqueId: string;
  status: string;
  lastUpdate: string;
  positionId?: number;
  groupId?: number;
  phone?: string;
  model?: string;
  contact?: string;
  category?: string;
  disabled?: boolean;
  attributes?: Record<string, any>;
}

export interface TraccarPosition {
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

export interface TraccarEvent {
  id: number;
  type: string;
  eventTime: string;
  deviceId: number;
  positionId?: number;
  geofenceId?: number;
  maintenanceId?: number;
  attributes?: Record<string, any>;
}

export interface TraccarCommand {
  id: number;
  deviceId: number;
  type: string;
  description?: string;
  attributes?: Record<string, any>;
}

export interface TraccarGeofence {
  id: number;
  name: string;
  description?: string;
  area: string;
  calendarId?: number;
  attributes?: Record<string, any>;
}

export interface TraccarUser {
  id: number;
  name: string;
  email: string;
  phone?: string;
  readonly?: boolean;
  administrator?: boolean;
  map?: string;
  latitude?: number;
  longitude?: number;
  zoom?: number;
  password?: string;
  twelveHourFormat?: boolean;
  coordinateFormat?: string;
  disabled?: boolean;
  expirationTime?: string;
  deviceLimit?: number;
  userLimit?: number;
  deviceReadonly?: boolean;
  limitCommands?: boolean;
  disableReports?: boolean;
  fixedEmail?: boolean;
  poiLayer?: string;
  attributes?: Record<string, any>;
}

export interface TraccarGroup {
  id: number;
  name: string;
  groupId?: number;
  attributes?: Record<string, any>;
}

export interface TraccarServer {
  id: number;
  registration: boolean;
  latitude: number;
  longitude: number;
  zoom: number;
  map: string;
  bingKey?: string;
  mapUrl?: string;
  distanceUnit: string;
  speedUnit: string;
  latitudeUnit: string;
  longitudeUnit: string;
  twelveHourFormat: boolean;
  attributes?: Record<string, any>;
}

export interface TraccarReport {
  deviceId: number;
  deviceName: string;
  groupId?: number;
  groupName?: string;
  maxSpeed: number;
  averageSpeed: number;
  distance: number;
  engineHours: number;
  fuelConsumption?: number;
  startOdometer?: number;
  endOdometer?: number;
  startTime: string;
  endTime?: string;
  startAddress?: string;
  endAddress?: string;
  driverName?: string;
  driverUniqueId?: string;
  startLatitude?: number;
  startLongitude?: number;
  endLatitude?: number;
  endLongitude?: number;
  attributes?: Record<string, any>;
}

export interface TraccarTripReport extends TraccarReport {
  // Additional trip-specific fields
}

export interface TraccarStopReport {
  deviceId: number;
  deviceName: string;
  groupId?: number;
  groupName?: string;
  latitude: number;
  longitude: number;
  address?: string;
  startTime: string;
  endTime: string;
  duration: number;
  engineHours: number;
  driverName?: string;
  driverUniqueId?: string;
  attributes?: Record<string, any>;
}

export interface TraccarSummaryReport extends TraccarReport {
  // Summary-specific fields
}

export interface TraccarRouteReport {
  deviceId: number;
  deviceName: string;
  groupId?: number;
  groupName?: string;
  startTime: string;
  endTime: string;
  distance: number;
  averageSpeed: number;
  maxSpeed: number;
  spentFuel?: number;
  driverName?: string;
  driverUniqueId?: string;
  positions: TraccarPosition[];
  attributes?: Record<string, any>;
}

export interface TraccarStatistics {
  devicesOnline: number;
  devicesTotal: number;
  messagesReceived: number;
  messagesStored: number;
  tripsStored: number;
  eventsStored: number;
  errorMessageStored: number;
  attributes?: Record<string, any>;
}

export interface TraccarConfig {
  traccarUrl: string;
  traccarUsername: string;
  traccarPassword: string;
  timeout?: number;
  retryAttempts?: number;
}

export interface TraccarApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface TraccarWebSocketMessage {
  type: string;
  positions?: TraccarPosition[];
  events?: TraccarEvent[];
  devices?: TraccarDevice[];
  [key: string]: any;
}

// Request types for creating/updating entities
export interface CreateDeviceRequest {
  name: string;
  uniqueId: string;
  model?: string;
  category?: string;
  groupId?: number;
  phone?: string;
  contact?: string;
  imei?: string;
  trackerCompanyId?: string;
  protocol?: string;
  port?: string;
  attributes?: Record<string, any>;
}

export interface UpdateDeviceRequest extends Partial<CreateDeviceRequest> {
  id: number;
}

export interface CreateGeofenceRequest {
  name: string;
  description?: string;
  area: string;
  calendarId?: number;
  attributes?: Record<string, any>;
}

export interface UpdateGeofenceRequest extends Partial<CreateGeofenceRequest> {
  id: number;
}

export interface SendCommandRequest {
  deviceId: number;
  type: string;
  description?: string;
  attributes?: Record<string, any>;
}

// Filter and query types
export interface PositionQuery {
  deviceId?: number;
  from?: string;
  to?: string;
  limit?: number;
}

export interface EventQuery {
  deviceId?: number;
  type?: string;
  from?: string;
  to?: string;
  limit?: number;
}

export interface ReportQuery {
  deviceIds: number[];
  from: string;
  to: string;
  type: 'trip' | 'stop' | 'summary' | 'route';
}