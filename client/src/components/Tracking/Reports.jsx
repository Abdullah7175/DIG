import React, { useState } from 'react';
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  FileText, 
  Download, 
  Calendar,
  MapPin,
  Clock,
  TrendingUp,
  BarChart3,
  PieChart,
  Filter,
  RefreshCw,
  Route,
  Fuel,
  AlertTriangle,
  Activity,
  Zap,
  Gauge,
  Timer,
  Map,
  Users,
  Car,
  Truck,
  Bus,
  Bike,
  Settings,
  Eye,
  EyeOff,
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  Shield
} from 'lucide-react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

const Reports = ({ devices = [] }) => {
  const { toast } = useToast();
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [reportType, setReportType] = useState('trip');
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days ago
    to: new Date().toISOString().split('T')[0] // today
  });
  const [generatedReport, setGeneratedReport] = useState(null);
  const [showMap, setShowMap] = useState(true);
  const [showStatistics, setShowStatistics] = useState(true);
  const [showEvents, setShowEvents] = useState(true);
  const [showChart, setShowChart] = useState(true);
  const [showRoute, setShowRoute] = useState(true);
  const [showMarkers, setShowMarkers] = useState(true);
  const [showLabels, setShowLabels] = useState(false);
  const [showAddresses, setShowAddresses] = useState(false);
  const [showSpeed, setShowSpeed] = useState(false);
  const [showAccuracy, setShowAccuracy] = useState(false);
  const [showOdometer, setShowOdometer] = useState(false);
  const [showEngine, setShowEngine] = useState(false);
  const [showDriving, setShowDriving] = useState(false);
  const [showParking, setShowParking] = useState(false);
  const [showIdle, setShowIdle] = useState(false);
  const [showOffline, setShowOffline] = useState(false);
  const [showInvalid, setShowInvalid] = useState(false);
  const [showZeroSpeed, setShowZeroSpeed] = useState(false);
  const [showCoordinates, setShowCoordinates] = useState(false);
  const [showBlocked, setShowBlocked] = useState(false);
  const [showIgnition, setShowIgnition] = useState(false);
  const [showMaintenance, setShowMaintenance] = useState(false);
  const [showAlarm, setShowAlarm] = useState(false);
  const [showGeofence, setShowGeofence] = useState(false);
  const [showCommand, setShowCommand] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [showTextMessage, setShowTextMessage] = useState(false);
  const [showDriverChanged, setShowDriverChanged] = useState(false);
  const [showOverspeed, setShowOverspeed] = useState(false);
  const [showMotion, setShowMotion] = useState(false);
  const [showHarshAcceleration, setShowHarshAcceleration] = useState(false);
  const [showHarshBraking, setShowHarshBraking] = useState(false);
  const [showHarshCornering, setShowHarshCornering] = useState(false);
  const [showLowBattery, setShowLowBattery] = useState(false);
  const [showLowFuel, setShowLowFuel] = useState(false);
  const [showLowCoolant, setShowLowCoolant] = useState(false);
  const [showLowOil, setShowLowOil] = useState(false);
  const [showLowTire, setShowLowTire] = useState(false);
  const [showCheckEngine, setShowCheckEngine] = useState(false);
  const [showTransmission, setShowTransmission] = useState(false);
  const [showAirbag, setShowAirbag] = useState(false);
  const [showCrash, setShowCrash] = useState(false);
  const [showPanic, setShowPanic] = useState(false);
  const [showJamming, setShowJamming] = useState(false);
  const [showTampering, setShowTampering] = useState(false);
  const [showDisconnected, setShowDisconnected] = useState(false);
  const [showConnected, setShowConnected] = useState(false);
  const [showRoaming, setShowRoaming] = useState(false);
  const [showPowerCut, setShowPowerCut] = useState(false);
  const [showPowerRestored, setShowPowerRestored] = useState(false);
  const [showGeofenceEnter, setShowGeofenceEnter] = useState(false);
  const [showGeofenceExit, setShowGeofenceExit] = useState(false);
  const [showMaintenanceStart, setShowMaintenanceStart] = useState(false);
  const [showMaintenanceEnd, setShowMaintenanceEnd] = useState(false);
  const [showAlarmStart, setShowAlarmStart] = useState(false);
  const [showAlarmEnd, setShowAlarmEnd] = useState(false);
  const [showCommandResult, setShowCommandResult] = useState(false);
  const [showCustomStart, setShowCustomStart] = useState(false);
  const [showCustomEnd, setShowCustomEnd] = useState(false);
  const [showTextMessageStart, setShowTextMessageStart] = useState(false);
  const [showTextMessageEnd, setShowTextMessageEnd] = useState(false);
  const [showDriverChangedStart, setShowDriverChangedStart] = useState(false);
  const [showDriverChangedEnd, setShowDriverChangedEnd] = useState(false);
  const [showMotionStart, setShowMotionStart] = useState(false);
  const [showMotionEnd, setShowMotionEnd] = useState(false);
  const [showHarshAccelerationStart, setShowHarshAccelerationStart] = useState(false);
  const [showHarshAccelerationEnd, setShowHarshAccelerationEnd] = useState(false);
  const [showHarshBrakingStart, setShowHarshBrakingStart] = useState(false);
  const [showHarshBrakingEnd, setShowHarshBrakingEnd] = useState(false);
  const [showHarshCorneringStart, setShowHarshCorneringStart] = useState(false);
  const [showHarshCorneringEnd, setShowHarshCorneringEnd] = useState(false);
  const [showLowBatteryStart, setShowLowBatteryStart] = useState(false);
  const [showLowBatteryEnd, setShowLowBatteryEnd] = useState(false);
  const [showLowFuelStart, setShowLowFuelStart] = useState(false);
  const [showLowFuelEnd, setShowLowFuelEnd] = useState(false);
  const [showLowCoolantStart, setShowLowCoolantStart] = useState(false);
  const [showLowCoolantEnd, setShowLowCoolantEnd] = useState(false);
  const [showLowOilStart, setShowLowOilStart] = useState(false);
  const [showLowOilEnd, setShowLowOilEnd] = useState(false);
  const [showLowTireStart, setShowLowTireStart] = useState(false);
  const [showLowTireEnd, setShowLowTireEnd] = useState(false);
  const [showCheckEngineStart, setShowCheckEngineStart] = useState(false);
  const [showCheckEngineEnd, setShowCheckEngineEnd] = useState(false);
  const [showTransmissionStart, setShowTransmissionStart] = useState(false);
  const [showTransmissionEnd, setShowTransmissionEnd] = useState(false);
  const [showAirbagStart, setShowAirbagStart] = useState(false);
  const [showAirbagEnd, setShowAirbagEnd] = useState(false);
  const [showCrashStart, setShowCrashStart] = useState(false);
  const [showCrashEnd, setShowCrashEnd] = useState(false);
  const [showPanicStart, setShowPanicStart] = useState(false);
  const [showPanicEnd, setShowPanicEnd] = useState(false);
  const [showJammingStart, setShowJammingStart] = useState(false);
  const [showJammingEnd, setShowJammingEnd] = useState(false);
  const [showTamperingStart, setShowTamperingStart] = useState(false);
  const [showTamperingEnd, setShowTamperingEnd] = useState(false);
  const [showDisconnectedStart, setShowDisconnectedStart] = useState(false);
  const [showDisconnectedEnd, setShowDisconnectedEnd] = useState(false);
  const [showConnectedStart, setShowConnectedStart] = useState(false);
  const [showConnectedEnd, setShowConnectedEnd] = useState(false);
  const [showRoamingStart, setShowRoamingStart] = useState(false);
  const [showRoamingEnd, setShowRoamingEnd] = useState(false);
  const [showPowerCutStart, setShowPowerCutStart] = useState(false);
  const [showPowerCutEnd, setShowPowerCutEnd] = useState(false);
  const [showPowerRestoredStart, setShowPowerRestoredStart] = useState(false);
  const [showPowerRestoredEnd, setShowPowerRestoredEnd] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    reportOptions: true,
    eventTypes: false
  });

  // Report types matching Traccar
  const reportTypes = [
    { value: 'trip', label: 'Trip Report', icon: Route, description: 'Vehicle trips and stops' },
    { value: 'route', label: 'Route Report', icon: MapPin, description: 'Detailed route information' },
    { value: 'events', label: 'Events Report', icon: AlertTriangle, description: 'Device events and alerts' },
    { value: 'summary', label: 'Summary Report', icon: BarChart3, description: 'Statistical summary' },
    { value: 'chart', label: 'Chart Report', icon: TrendingUp, description: 'Speed and other charts' },
    { value: 'replay', label: 'Replay Report', icon: Play, description: 'Route replay with timeline' },
    { value: 'stops', label: 'Stops Report', icon: Clock, description: 'Vehicle stops and parking' },
    { value: 'daily', label: 'Daily Report', icon: Calendar, description: 'Daily activity summary' },
    { value: 'weekly', label: 'Weekly Report', icon: Calendar, description: 'Weekly activity summary' },
    { value: 'monthly', label: 'Monthly Report', icon: Calendar, description: 'Monthly activity summary' },
    { value: 'custom', label: 'Custom Report', icon: Settings, description: 'Custom report configuration' }
  ];

  // Generate report mutation
  const generateReportMutation = useMutation({
    mutationFn: async (reportData) => {
      return await apiRequest('/api/tracking/reports/generate', {
        method: 'POST',
        body: JSON.stringify(reportData)
      });
    },
    onSuccess: (data) => {
      setGeneratedReport(data);
      toast({
        title: "Success",
        description: "Report generated successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || 'Failed to generate report',
        variant: "destructive",
      });
    }
  });

  // Fetch existing reports
  const { data: existingReports, isLoading: reportsLoading, refetch: refetchReports } = useQuery({
    queryKey: ['/api/tracking/reports'],
    queryFn: () => apiRequest('/api/tracking/reports'),
  });

  const handleDeviceToggle = (deviceId) => {
    setSelectedDevices(prev => 
      prev.includes(deviceId) 
        ? prev.filter(id => id !== deviceId)
        : [...prev, deviceId]
    );
  };

  const handleSelectAllDevices = () => {
    if (selectedDevices.length === devices.length) {
      setSelectedDevices([]);
    } else {
      setSelectedDevices(devices.map(d => d.id));
    }
  };

  const handleGenerateReport = () => {
    if (selectedDevices.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one device",
        variant: "destructive",
      });
      return;
    }

    const reportOptions = {
      showMap,
      showStatistics,
      showEvents,
      showChart,
      showRoute,
      showMarkers,
      showLabels,
      showAddresses,
      showSpeed,
      showAccuracy,
      showOdometer,
      showEngine,
      showDriving,
      showParking,
      showIdle,
      showOffline,
      showInvalid,
      showZeroSpeed,
      showCoordinates,
      showBlocked,
      showIgnition,
      showMaintenance,
      showAlarm,
      showGeofence,
      showCommand,
      showCustom,
      showTextMessage,
      showDriverChanged,
      showOverspeed,
      showMotion,
      showHarshAcceleration,
      showHarshBraking,
      showHarshCornering,
      showLowBattery,
      showLowFuel,
      showLowCoolant,
      showLowOil,
      showLowTire,
      showCheckEngine,
      showTransmission,
      showAirbag,
      showCrash,
      showPanic,
      showJamming,
      showTampering,
      showDisconnected,
      showConnected,
      showRoaming,
      showPowerCut,
      showPowerRestored
    };

    generateReportMutation.mutate({
      vehicleIds: selectedDevices,
      reportType,
      from: dateRange.from,
      to: dateRange.to,
      options: reportOptions
    });
  };

  const handleDownloadReport = (reportData, format = 'json') => {
    const dataStr = format === 'json' 
      ? JSON.stringify(reportData, null, 2)
      : convertToCSV(reportData);
    
    const dataBlob = new Blob([dataStr], { 
      type: format === 'json' ? 'application/json' : 'text/csv' 
    });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tracking-report-${reportType}-${dateRange.from}-${dateRange.to}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const convertToCSV = (data) => {
    if (!data || data.length === 0) return '';
    
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => 
      Object.values(row).map(value => 
        typeof value === 'string' && value.includes(',') ? `"${value}"` : value
      ).join(',')
    );
    
    return [headers, ...rows].join('\n');
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatDistance = (meters) => {
    return (meters / 1000).toFixed(2) + ' km';
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Tracking Reports</h2>
          <p className="text-muted-foreground mt-1">
            Generate and download detailed tracking reports
          </p>
        </div>
        <Button variant="outline" onClick={refetchReports}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="generate" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="generate" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Generate Report
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Report History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Report Configuration */}
            <div className="xl:col-span-2">
          <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Report Configuration
                </CardTitle>
                <CardDescription>
                  Configure your tracking report parameters
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Report Type */}
                <div className="space-y-2">
                  <Label htmlFor="reportType" className="text-base font-semibold">Report Type</Label>
                  <Select value={reportType} onValueChange={setReportType}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select report type" />
                    </SelectTrigger>
                    <SelectContent>
                      {reportTypes.map((type) => {
                        const IconComponent = type.icon;
                        return (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <IconComponent className="h-4 w-4" />
                              <div>
                                <div className="font-medium">{type.label}</div>
                                <div className="text-xs text-muted-foreground">{type.description}</div>
                              </div>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                </Select>
                </div>

              {/* Date Range */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold">Date Range</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fromDate" className="text-sm">From Date</Label>
                      <Input
                        id="fromDate"
                        type="date"
                        value={dateRange.from}
                        onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="toDate" className="text-sm">To Date</Label>
                      <Input
                        id="toDate"
                        type="date"
                        value={dateRange.to}
                        onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                        className="h-10"
                      />
                    </div>
                  </div>
                </div>

              {/* Device Selection */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Select Devices</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAllDevices}
                    >
                      {selectedDevices.length === devices.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-2 border rounded-lg p-4 bg-muted/30">
                    {devices.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No devices available</p>
                    ) : (
                      devices.map((device) => (
                        <div key={device.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-background transition-colors">
                          <Checkbox
                            id={`device-${device.id}`}
                            checked={selectedDevices.includes(device.id)}
                            onCheckedChange={() => handleDeviceToggle(device.id)}
                          />
                          <Label htmlFor={`device-${device.id}`} className="text-sm cursor-pointer flex-1">
                            <span className="font-medium">{device.name}</span>
                            <span className="text-muted-foreground ml-2">({device.uniqueId})</span>
                          </Label>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Report Options */}
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => toggleSection('reportOptions')}
                    className="flex items-center justify-between w-full text-left"
                  >
                    <Label className="text-base font-semibold cursor-pointer">Report Options</Label>
                    <span className="text-muted-foreground">{expandedSections.reportOptions ? '−' : '+'}</span>
                  </button>
                  
                  {expandedSections.reportOptions && (
                    <div className="grid grid-cols-2 gap-3 pl-2 border-l-2 border-muted">
                      <div className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                        <Label htmlFor="showMap" className="flex items-center gap-2 cursor-pointer">
                          <Map className="h-4 w-4" />
                          <span className="text-sm">Show Map</span>
                        </Label>
                        <Switch
                          id="showMap"
                          checked={showMap}
                          onCheckedChange={setShowMap}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                        <Label htmlFor="showStatistics" className="flex items-center gap-2 cursor-pointer">
                          <BarChart3 className="h-4 w-4" />
                          <span className="text-sm">Show Statistics</span>
                        </Label>
                        <Switch
                          id="showStatistics"
                          checked={showStatistics}
                          onCheckedChange={setShowStatistics}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                        <Label htmlFor="showEvents" className="flex items-center gap-2 cursor-pointer">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="text-sm">Show Events</span>
                        </Label>
                        <Switch
                          id="showEvents"
                          checked={showEvents}
                          onCheckedChange={setShowEvents}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                        <Label htmlFor="showChart" className="flex items-center gap-2 cursor-pointer">
                          <TrendingUp className="h-4 w-4" />
                          <span className="text-sm">Show Chart</span>
                        </Label>
                        <Switch
                          id="showChart"
                          checked={showChart}
                          onCheckedChange={setShowChart}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                        <Label htmlFor="showRoute" className="flex items-center gap-2 cursor-pointer">
                          <Route className="h-4 w-4" />
                          <span className="text-sm">Show Route</span>
                        </Label>
                        <Switch
                          id="showRoute"
                          checked={showRoute}
                          onCheckedChange={setShowRoute}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                        <Label htmlFor="showMarkers" className="flex items-center gap-2 cursor-pointer">
                          <MapPin className="h-4 w-4" />
                          <span className="text-sm">Show Markers</span>
                        </Label>
                        <Switch
                          id="showMarkers"
                          checked={showMarkers}
                          onCheckedChange={setShowMarkers}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Event Types */}
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => toggleSection('eventTypes')}
                    className="flex items-center justify-between w-full text-left"
                  >
                    <Label className="text-base font-semibold cursor-pointer">Event Types</Label>
                    <span className="text-muted-foreground">{expandedSections.eventTypes ? '−' : '+'}</span>
                  </button>
                  
                  {expandedSections.eventTypes && (
                    <div className="grid grid-cols-2 gap-3 pl-2 border-l-2 border-muted">
                      <div className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                        <Label htmlFor="showDriving" className="flex items-center gap-2 cursor-pointer">
                          <Car className="h-4 w-4" />
                          <span className="text-sm">Driving</span>
                        </Label>
                        <Switch
                          id="showDriving"
                          checked={showDriving}
                          onCheckedChange={setShowDriving}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                        <Label htmlFor="showParking" className="flex items-center gap-2 cursor-pointer">
                          <Clock className="h-4 w-4" />
                          <span className="text-sm">Parking</span>
                        </Label>
                        <Switch
                          id="showParking"
                          checked={showParking}
                          onCheckedChange={setShowParking}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                        <Label htmlFor="showIdle" className="flex items-center gap-2 cursor-pointer">
                          <Timer className="h-4 w-4" />
                          <span className="text-sm">Idle</span>
                        </Label>
                        <Switch
                          id="showIdle"
                          checked={showIdle}
                          onCheckedChange={setShowIdle}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                        <Label htmlFor="showOffline" className="flex items-center gap-2 cursor-pointer">
                          <EyeOff className="h-4 w-4" />
                          <span className="text-sm">Offline</span>
                        </Label>
                        <Switch
                          id="showOffline"
                          checked={showOffline}
                          onCheckedChange={setShowOffline}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                        <Label htmlFor="showOverspeed" className="flex items-center gap-2 cursor-pointer">
                          <Gauge className="h-4 w-4" />
                          <span className="text-sm">Overspeed</span>
                        </Label>
                        <Switch
                          id="showOverspeed"
                          checked={showOverspeed}
                          onCheckedChange={setShowOverspeed}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                        <Label htmlFor="showGeofence" className="flex items-center gap-2 cursor-pointer">
                          <Shield className="h-4 w-4" />
                          <span className="text-sm">Geofence</span>
                        </Label>
                        <Switch
                          id="showGeofence"
                          checked={showGeofence}
                          onCheckedChange={setShowGeofence}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                        <Label htmlFor="showAlarm" className="flex items-center gap-2 cursor-pointer">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="text-sm">Alarm</span>
                        </Label>
                        <Switch
                          id="showAlarm"
                          checked={showAlarm}
                          onCheckedChange={setShowAlarm}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                        <Label htmlFor="showMaintenance" className="flex items-center gap-2 cursor-pointer">
                          <Settings className="h-4 w-4" />
                          <span className="text-sm">Maintenance</span>
                        </Label>
                        <Switch
                          id="showMaintenance"
                          checked={showMaintenance}
                          onCheckedChange={setShowMaintenance}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <Button 
                  onClick={handleGenerateReport}
                  disabled={generateReportMutation.isPending || selectedDevices.length === 0}
                  className="w-full h-11 text-base font-semibold"
                  size="lg"
                >
                  {generateReportMutation.isPending ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-4 w-4" />
                      Generate Report
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
            </div>

            {/* Generated Report */}
            <div className="xl:col-span-1">
            <Card className="shadow-sm sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Generated Report
                </CardTitle>
                <CardDescription>
                  View and download your generated report
                </CardDescription>
              </CardHeader>
              <CardContent>
                {generatedReport ? (
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleDownloadReport(generatedReport, 'json')}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download JSON
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadReport(generatedReport, 'csv')}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download CSV
                      </Button>
                    </div>

                    {/* Report Summary */}
                    <div className="space-y-3">
                      <h4 className="font-semibold">Report Summary</h4>
                      {reportType === 'trip' && (
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Total Trips:</span>
                            <span className="ml-2 font-medium">{generatedReport.length}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Total Distance:</span>
                            <span className="ml-2 font-medium">
                              {formatDistance(generatedReport.reduce((sum, trip) => sum + (trip.distance || 0), 0))}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Total Duration:</span>
                            <span className="ml-2 font-medium">
                              {formatDuration(generatedReport.reduce((sum, trip) => sum + (trip.duration || 0), 0))}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Avg Speed:</span>
                            <span className="ml-2 font-medium">
                              {(generatedReport.reduce((sum, trip) => sum + (trip.averageSpeed || 0), 0) / generatedReport.length).toFixed(1)} km/h
                            </span>
                          </div>
                        </div>
                      )}

                      {reportType === 'summary' && (
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Total Distance:</span>
                            <span className="ml-2 font-medium">{formatDistance(generatedReport.distance || 0)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Engine Hours:</span>
                            <span className="ml-2 font-medium">{formatDuration(generatedReport.engineHours || 0)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Max Speed:</span>
                            <span className="ml-2 font-medium">{generatedReport.maxSpeed || 0} km/h</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Avg Speed:</span>
                            <span className="ml-2 font-medium">{generatedReport.averageSpeed || 0} km/h</span>
                          </div>
                        </div>
                      )}

                      {/* Report Data Preview */}
                      <div className="max-h-64 overflow-y-auto border rounded-lg p-3">
                        <pre className="text-xs text-muted-foreground">
                          {JSON.stringify(generatedReport, null, 2).substring(0, 1000)}
                          {JSON.stringify(generatedReport, null, 2).length > 1000 && '...'}
                        </pre>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Report Generated</h3>
                    <p className="text-muted-foreground">
                      Configure your report parameters and click "Generate Report" to create a new report.
                    </p>
                  </div>
              )}
            </CardContent>
          </Card>
          </div>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Report History
              </CardTitle>
              <CardDescription>
                View previously generated reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reportsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading reports...</p>
                </div>
              ) : existingReports?.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Reports Found</h3>
                  <p className="text-muted-foreground">
                    No reports have been generated yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {existingReports?.map((report) => (
                    <Card key={report.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <FileText className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold">
                              {report.report_type.charAt(0).toUpperCase() + report.report_type.slice(1)} Report
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              Vehicle ID: {report.vehicle_id} | 
                              Period: {new Date(report.start_time).toLocaleDateString()} - {new Date(report.end_time).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Generated: {new Date(report.generated_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {report.report_type}
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadReport(JSON.parse(report.report_data), 'json')}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;