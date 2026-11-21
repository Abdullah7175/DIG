import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  MapPin, 
  Clock, 
  Gauge, 
  AlertTriangle, 
  Car, 
  RefreshCw, 
  Play, 
  Pause, 
  Settings,
  Calendar,
  Filter,
  Download,
  Trash2,
  BarChart3,
  Activity,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

/** Format a Date for <input type="datetime-local"> using local time (not UTC). */
function toDateTimeLocalValue(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function TrackingEvents() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds
  const [filters, setFilters] = useState({
    vehicle: '',
    event_type: 'all',
    limit: 50,
    start_date: '',
    end_date: ''
  });
  const [syncDates, setSyncDates] = useState({
    start_date: '',
    end_date: ''
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch tracking events
  const { data: events = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/tracking/events", filters],
    refetchInterval: autoRefresh ? refreshInterval * 1000 : false,
  });

  // Fetch tracking status
  const { data: status } = useQuery({
    queryKey: ["/api/tracking/status"],
    refetchInterval: 10000, // Check status every 10 seconds
  });

  // Fetch tracking statistics
  const { data: stats } = useQuery({
    queryKey: ["/api/tracking/stats"],
    refetchInterval: 60000, // Update stats every minute
  });

  // Manual sync mutation
  const syncMutation = useMutation({
    mutationFn: async (dates) => {
      const response = await fetch("/api/tracking/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dates),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || "Sync failed");
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Sync Completed",
        description: `${data.recordsProcessed} records processed successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tracking/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tracking/stats"] });
    },
    onError: (error) => {
      toast({
        title: "Sync Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Real-time control mutation
  const realtimeMutation = useMutation({
    mutationFn: async ({ action, interval_minutes }) => {
      const response = await fetch(`/api/tracking/realtime/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interval_minutes }),
      });
      if (!response.ok) throw new Error("Real-time control failed");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tracking/status"] });
    },
    onError: (error) => {
      toast({
        title: "Real-time Control Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Cleanup mutation
  const cleanupMutation = useMutation({
    mutationFn: async (daysToKeep) => {
      const response = await fetch("/api/tracking/cleanup", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days_to_keep: daysToKeep }),
      });
      if (!response.ok) throw new Error("Cleanup failed");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Cleanup Completed",
        description: `${data.recordsDeleted} records deleted successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tracking/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tracking/stats"] });
    },
    onError: (error) => {
      toast({
        title: "Cleanup Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Setup table mutation
  const setupTableMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/tracking/setup-table", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Table setup failed");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Setup Completed",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tracking/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tracking/stats"] });
    },
    onError: (error) => {
      toast({
        title: "Setup Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSync = () => {
    if (!syncDates.start_date || !syncDates.end_date) {
      toast({
        title: "Missing Dates",
        description: "Please select both start and end dates",
        variant: "destructive",
      });
      return;
    }
    syncMutation.mutate(syncDates);
  };

  const handleRealtimeToggle = () => {
    const action = status?.isRunning ? 'stop' : 'start';
    realtimeMutation.mutate({ action, interval_minutes: 5 });
  };

  const getEventBadgeColor = (eventType) => {
    switch (eventType.toLowerCase()) {
      case 'overspeed':
        return 'destructive';
      case 'geofence':
        return 'secondary';
      case 'panic':
        return 'destructive';
      case 'ignition':
        return 'default';
      default:
        return 'outline';
    }
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const formatSpeed = (speed) => {
    return `${speed} km/h`;
  };

  const formatCoordinates = (lat, lng) => {
    return `${parseFloat(lat).toFixed(6)}, ${parseFloat(lng).toFixed(6)}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vehicle Tracking Events</h1>
          <p className="text-gray-600 mt-2">Real-time monitoring of vehicle tracking events</p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Auto-refresh toggle */}
          <div className="flex items-center gap-2">
            <Button
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {autoRefresh ? "Pause" : "Start"} Auto-refresh
            </Button>
          </div>

          {/* Manual refresh */}
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>

          {/* Settings dialog */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4" />
                Settings
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Tracking Settings</DialogTitle>
                <DialogDescription>
                  Configure tracking data management
                </DialogDescription>
              </DialogHeader>
              
              <Tabs defaultValue="sync" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="sync">Sync</TabsTrigger>
                  <TabsTrigger value="realtime">Real-time</TabsTrigger>
                  <TabsTrigger value="setup">Setup</TabsTrigger>
                </TabsList>
                
                <TabsContent value="sync" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="start-date">Start Date</Label>
                    <Input
                      id="start-date"
                      type="datetime-local"
                      value={syncDates.start_date}
                      onChange={(e) => setSyncDates(prev => ({ ...prev, start_date: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-date">End Date</Label>
                    <Input
                      id="end-date"
                      type="datetime-local"
                      value={syncDates.end_date}
                      onChange={(e) => setSyncDates(prev => ({ ...prev, end_date: e.target.value }))}
                    />
                  </div>
                  <Button 
                    onClick={handleSync} 
                    disabled={syncMutation.isPending}
                    className="w-full"
                  >
                    {syncMutation.isPending ? "Syncing..." : "Manual Sync"}
                  </Button>
                </TabsContent>
                
                <TabsContent value="realtime" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Real-time Status</Label>
                    <div className="flex items-center gap-2">
                      <Badge variant={status?.isRunning ? "default" : "secondary"}>
                        {status?.isRunning ? "Running" : "Stopped"}
                      </Badge>
                      {status?.intervalMinutes && (
                        <span className="text-sm text-gray-600">
                          Every {status.intervalMinutes} minutes
                        </span>
                      )}
                    </div>
                  </div>
                  <Button 
                    onClick={handleRealtimeToggle}
                    disabled={realtimeMutation.isPending}
                    className="w-full"
                    variant={status?.isRunning ? "destructive" : "default"}
                  >
                    {realtimeMutation.isPending 
                      ? "Processing..." 
                      : status?.isRunning 
                        ? "Stop Real-time Updates" 
                        : "Start Real-time Updates"
                    }
                  </Button>
                </TabsContent>
                
                <TabsContent value="setup" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Database Setup</Label>
                    <p className="text-sm text-gray-600">
                      Create the tracking_events table if it doesn't exist
                    </p>
                  </div>
                  <Button 
                    onClick={() => setupTableMutation.mutate()}
                    disabled={setupTableMutation.isPending}
                    className="w-full mb-4"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    {setupTableMutation.isPending ? "Setting up..." : "Setup Database Table"}
                  </Button>
                  
                  <div className="space-y-2">
                    <Label>Data Retention</Label>
                    <p className="text-sm text-gray-600">
                      Delete tracking data older than specified days
                    </p>
                  </div>
                  <Button 
                    onClick={() => cleanupMutation.mutate(30)}
                    disabled={cleanupMutation.isPending}
                    variant="destructive"
                    className="w-full"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {cleanupMutation.isPending ? "Cleaning..." : "Delete Data Older Than 30 Days"}
                  </Button>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Events</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEvents?.toLocaleString()}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Events</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todayEvents?.toLocaleString()}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Speed Events</CardTitle>
              <Gauge className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.speedingEvents?.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">All events with speed data</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Status</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant={status?.isRunning ? "default" : "secondary"}>
                    {status?.isRunning ? "Live" : "Ready"}
                  </Badge>
                </div>
                {!status?.isRunning && (
                  <Button
                    size="sm"
                    onClick={() => realtimeMutation.mutate({ action: 'start', interval_minutes: 5 })}
                    disabled={realtimeMutation.isPending}
                    className="text-xs"
                  >
                    {realtimeMutation.isPending ? "Starting..." : "Start Live Updates"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date-filter">Start Date</Label>
              <Input
                id="start-date-filter"
                type="datetime-local"
                value={filters.start_date}
                onChange={(e) => setFilters(prev => ({ ...prev, start_date: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="end-date-filter">End Date</Label>
              <Input
                id="end-date-filter"
                type="datetime-local"
                value={filters.end_date}
                onChange={(e) => setFilters(prev => ({ ...prev, end_date: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="vehicle-filter">Vehicle</Label>
              <Input
                id="vehicle-filter"
                placeholder="Enter vehicle name..."
                value={filters.vehicle}
                onChange={(e) => setFilters(prev => ({ ...prev, vehicle: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="event-filter">Event Type</Label>
              <Select
                value={filters.event_type}
                onValueChange={(value) => setFilters(prev => ({ ...prev, event_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All events" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All events</SelectItem>
                  <SelectItem value="OverSpeed">OverSpeed</SelectItem>
                  <SelectItem value="Geofence">Geofence</SelectItem>
                  <SelectItem value="Panic">Panic</SelectItem>
                  <SelectItem value="Ignition">Ignition</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="limit-filter">Limit</Label>
              <Select
                value={filters.limit.toString()}
                onValueChange={(value) => setFilters(prev => ({ ...prev, limit: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25 events</SelectItem>
                  <SelectItem value="50">50 events</SelectItem>
                  <SelectItem value="100">100 events</SelectItem>
                  <SelectItem value="200">200 events</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex flex-col gap-2">
              <Button
                onClick={() => {
                  const now = new Date();
                  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
                  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 0);

                  setFilters(prev => ({
                    ...prev,
                    start_date: toDateTimeLocalValue(startOfDay),
                    end_date: toDateTimeLocalValue(endOfDay),
                  }));
                }}
                variant="default"
                size="sm"
              >
                Today
              </Button>
              <Button
                onClick={() => {
                  const now = new Date();
                  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

                  setFilters(prev => ({
                    ...prev,
                    start_date: toDateTimeLocalValue(oneHourAgo),
                    end_date: toDateTimeLocalValue(now),
                  }));
                }}
                variant="outline"
                size="sm"
              >
                Last Hour
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters({ 
                  vehicle: '', 
                  event_type: 'all', 
                  limit: 50,
                  start_date: '',
                  end_date: ''
                })}
              >
                Clear All
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
          <CardDescription>
            Fetch data from the external API for the selected date range
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center">
            <Button
              onClick={() => {
                if (filters.start_date && filters.end_date) {
                  syncMutation.mutate({
                    start_date: filters.start_date,
                    end_date: filters.end_date
                  });
                } else {
                  toast({
                    title: "Missing Date Range",
                    description: "Please select both start and end dates to fetch data",
                    variant: "destructive",
                  });
                }
              }}
              disabled={syncMutation.isPending}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              {syncMutation.isPending ? "Fetching..." : "Fetch Data for Date Range"}
            </Button>
            
            <div className="text-sm text-gray-600">
              {filters.start_date && filters.end_date ? (
                <>Fetch data from {new Date(filters.start_date).toLocaleString()} to {new Date(filters.end_date).toLocaleString()}</>
              ) : (
                "Select date range above to fetch data"
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events List */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Recent Tracking Events</CardTitle>
              <CardDescription>
                {autoRefresh && `Auto-refreshing every ${refreshInterval} seconds`}
              </CardDescription>
            </div>
            <Badge variant="outline">
              {events.length} events
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex items-center space-x-4 p-4 border rounded-lg">
                    <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No tracking events found</h3>
              <p className="text-gray-600">Try adjusting your filters or check if real-time updates are running.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
                <div key={event.id} className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                      {event.event_desc === 'OverSpeed' ? (
                        <Gauge className="h-5 w-5 text-red-600" />
                      ) : (
                        <MapPin className="h-5 w-5 text-blue-600" />
                      )}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {event.name}
                      </h3>
                      <Badge variant={getEventBadgeColor(event.event_desc)}>
                        {event.event_desc}
                      </Badge>
                      {event.speed > 60 && (
                        <Badge variant="destructive">
                          <Gauge className="h-3 w-3 mr-1" />
                          {formatSpeed(event.speed)}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-600">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDateTime(event.dt_tracker)}
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {formatCoordinates(event.lat, event.lng)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Gauge className="h-3 w-3" />
                        {formatSpeed(event.speed)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const mapsUrl = `https://maps.google.com/maps?q=${event.lat},${event.lng}`;
                        window.open(mapsUrl, '_blank');
                      }}
                    >
                      View on Map
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
