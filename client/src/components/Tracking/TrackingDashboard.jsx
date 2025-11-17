import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from "@tanstack/react-query";
import { 
  MapPin, 
  Navigation, 
  Gauge, 
  Clock, 
  Battery, 
  Signal,
  RefreshCw,
  Maximize2,
  Minimize2,
  Truck,
  AlertCircle,
  CheckCircle,
  Activity,
  Users,
  Map,
  Shield,
  TrendingUp,
  TrendingDown,
  Eye,
  EyeOff,
  Route,
  Target,
  Settings
} from 'lucide-react';
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import LiveTrackingMap from './LiveTrackingMap';
import MapAccuracy from './MapAccuracy';
import MapLiveRoutes from './MapLiveRoutes';
import MapSelectedDevice from './MapSelectedDevice';
import MapGeofence from './MapGeofence';
import MapCurrentLocation from './MapCurrentLocation';
import MapScale from './MapScale';
import MapNotification from './MapNotification';

const TrackingDashboard = ({ 
  devices = [], 
  positions = {}, 
  events = [],
  selectedDevice, 
  onDeviceSelect,
  loading = false,
  error = null,
  wsConnected = false,
  refetchDevices
}) => {
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [mapInstance, setMapInstance] = useState(null);
  const [mapControls, setMapControls] = useState({
    showRoutes: true,
    showAccuracy: true,
    showGeofences: true,
    showEvents: true,
    showDeviceLabels: true,
    showSpeedColors: true
  });
  const [showEventsPanel, setShowEventsPanel] = useState(false);

  // Fetch latest positions for all devices
  const { data: latestPositions, isLoading: positionsLoading } = useQuery({
    queryKey: ['/api/tracking/positions/latest', { deviceIds: devices.map(d => d.id).join(',') }],
    queryFn: () => apiRequest(`/api/tracking/positions/latest?vehicleIds=${devices.map(d => d.id).join(',')}`),
    enabled: devices.length > 0,
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  // Fetch recent events
  const { data: recentEvents, isLoading: eventsLoading } = useQuery({
    queryKey: ['/api/tracking/events', { limit: 50 }],
    queryFn: () => apiRequest('/api/tracking/events?limit=50'),
    refetchInterval: 15000, // Refetch every 15 seconds
  });

  // Fetch alerts
  const { data: alerts, isLoading: alertsLoading } = useQuery({
    queryKey: ['/api/tracking/alerts', { acknowledged: false }],
    queryFn: () => apiRequest('/api/tracking/alerts?acknowledged=false&limit=20'),
    refetchInterval: 20000, // Refetch every 20 seconds
  });

  // Calculate statistics
  const stats = React.useMemo(() => {
    const totalDevices = devices.length;
    const onlineDevices = devices.filter(d => d.status === 'online').length;
    const offlineDevices = devices.filter(d => d.status === 'offline').length;
    const unknownDevices = devices.filter(d => d.status === 'unknown').length;
    
    const activeAlerts = alerts?.length || 0;
    const recentEventsCount = recentEvents?.length || 0;
    
    return {
      totalDevices,
      onlineDevices,
      offlineDevices,
      unknownDevices,
      activeAlerts,
      recentEventsCount
    };
  }, [devices, alerts, recentEvents]);

  // Get device position
  const getDevicePosition = (deviceId) => {
    return positions[deviceId] || latestPositions?.find(p => p.deviceId === deviceId);
  };

  // Format time ago
  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'offline': return 'bg-red-500';
      case 'unknown': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  // Get status text
  const getStatusText = (status) => {
    switch (status) {
      case 'online': return 'Online';
      case 'offline': return 'Offline';
      case 'unknown': return 'Unknown';
      default: return 'Unknown';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Tracking Dashboard</h2>
          <p className="text-muted-foreground">
            Real-time vehicle tracking and monitoring
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-muted-foreground">
              {wsConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <Button variant="outline" onClick={refetchDevices} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDevices}</div>
            <p className="text-xs text-muted-foreground">
              {stats.onlineDevices} online, {stats.offlineDevices} offline
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Online Devices</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.onlineDevices}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalDevices > 0 ? Math.round((stats.onlineDevices / stats.totalDevices) * 100) : 0}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.activeAlerts}</div>
            <p className="text-xs text-muted-foreground">
              Requiring attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Events</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.recentEventsCount}</div>
            <p className="text-xs text-muted-foreground">
              Last 24 hours
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="map" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="map" className="flex items-center gap-2">
            <Map className="h-4 w-4" />
            Live Map
          </TabsTrigger>
          <TabsTrigger value="devices" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Devices
          </TabsTrigger>
          <TabsTrigger value="events" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Events
          </TabsTrigger>
        </TabsList>

        <TabsContent value="map" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Map Controls */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Map Controls
                </CardTitle>
                <CardDescription>
                  Toggle map features and overlays
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="show-routes" className="flex items-center gap-2">
                    <Route className="h-4 w-4" />
                    Show Routes
                  </Label>
                  <Switch
                    id="show-routes"
                    checked={mapControls.showRoutes}
                    onCheckedChange={(checked) => 
                      setMapControls(prev => ({ ...prev, showRoutes: checked }))
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="show-accuracy" className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Show Accuracy
                  </Label>
                  <Switch
                    id="show-accuracy"
                    checked={mapControls.showAccuracy}
                    onCheckedChange={(checked) => 
                      setMapControls(prev => ({ ...prev, showAccuracy: checked }))
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="show-geofences" className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Show Geofences
                  </Label>
                  <Switch
                    id="show-geofences"
                    checked={mapControls.showGeofences}
                    onCheckedChange={(checked) => 
                      setMapControls(prev => ({ ...prev, showGeofences: checked }))
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="show-labels" className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Device Labels
                  </Label>
                  <Switch
                    id="show-labels"
                    checked={mapControls.showDeviceLabels}
                    onCheckedChange={(checked) => 
                      setMapControls(prev => ({ ...prev, showDeviceLabels: checked }))
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="show-speed" className="flex items-center gap-2">
                    <Gauge className="h-4 w-4" />
                    Speed Colors
                  </Label>
                  <Switch
                    id="show-speed"
                    checked={mapControls.showSpeedColors}
                    onCheckedChange={(checked) => 
                      setMapControls(prev => ({ ...prev, showSpeedColors: checked }))
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Map */}
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Live Tracking Map
                </CardTitle>
                <CardDescription>
                  Real-time vehicle positions and status
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="relative h-[600px]">
                  <LiveTrackingMap
                    devices={devices}
                    positions={positions}
                    selectedDeviceId={selectedDeviceId}
                    onDeviceSelect={setSelectedDeviceId}
                    showRoutes={mapControls.showRoutes}
                    showAccuracy={mapControls.showAccuracy}
                    showGeofences={mapControls.showGeofences}
                    showEvents={mapControls.showEvents}
                    onEventsClick={() => setShowEventsPanel(true)}
                    className="h-full"
                  />
                  
                  {/* Map Overlays */}
                  {mapInstance && (
                    <>
                      {mapControls.showAccuracy && (
                        <MapAccuracy 
                          positions={Object.values(positions)} 
                          mapInstance={mapInstance} 
                        />
                      )}
                      
                      {mapControls.showRoutes && (
                        <MapLiveRoutes 
                          devices={devices}
                          mapInstance={mapInstance}
                          selectedDeviceId={selectedDeviceId}
                        />
                      )}
                      
                      {mapControls.showGeofences && (
                        <MapGeofence 
                          mapInstance={mapInstance}
                          selectedGeofenceId={null}
                        />
                      )}
                      
                      {selectedDeviceId && selectedDevice && (
                        <MapSelectedDevice 
                          selectedDevice={selectedDevice}
                          position={positions[selectedDeviceId]}
                          mapInstance={mapInstance}
                        />
                      )}
                      
                      <MapCurrentLocation mapInstance={mapInstance} />
                      <MapScale mapInstance={mapInstance} />
                    </>
                  )}
                  
                  <MapNotification 
                    enabled={mapControls.showEvents}
                    onClick={() => setShowEventsPanel(true)}
                    eventCount={events.length}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="devices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Device Status
              </CardTitle>
              <CardDescription>
                Current status and location of all tracking devices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading devices...</p>
                  </div>
                ) : error ? (
                  <div className="text-center py-8">
                    <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
                    <p className="text-red-600">Failed to load devices</p>
                  </div>
                ) : devices.length === 0 ? (
                  <div className="text-center py-8">
                    <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Devices Found</h3>
                    <p className="text-muted-foreground">
                      No tracking devices are currently registered.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {devices.map((device) => {
                      const position = getDevicePosition(device.id);
                      return (
                        <Card key={device.id} className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className={`w-3 h-3 rounded-full ${getStatusColor(device.status)}`} />
                              <div>
                                <h4 className="font-semibold">{device.name}</h4>
                                <p className="text-sm text-muted-foreground">
                                  ID: {device.uniqueId} | Model: {device.model || 'Unknown'}
                                </p>
                                {position && (
                                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                                    <span>Speed: {position.speed || 0} km/h</span>
                                    <span>Course: {position.course || 0}°</span>
                                    <span>Updated: {formatTimeAgo(position.fixTime)}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant={device.status === 'online' ? 'default' : 'secondary'}
                                className={getStatusColor(device.status)}
                              >
                                {getStatusText(device.status)}
                              </Badge>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedDeviceId(device.id)}
                              >
                                <MapPin className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Events
              </CardTitle>
              <CardDescription>
                Latest tracking events and alerts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {eventsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading events...</p>
                  </div>
                ) : recentEvents?.length === 0 ? (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Events Found</h3>
                    <p className="text-muted-foreground">
                      No recent events have been recorded.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentEvents?.slice(0, 20).map((event) => (
                      <Card key={event.id} className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-blue-500 rounded-full" />
                            <div>
                              <p className="font-medium text-sm">{event.type}</p>
                              <p className="text-xs text-muted-foreground">
                                Device: {devices.find(d => d.id === event.deviceId)?.name || 'Unknown'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">
                              {formatTimeAgo(event.eventTime)}
                            </p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TrackingDashboard;
