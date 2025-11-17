import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Search, Plus, Edit, Trash2, RefreshCw, MapPin, Wifi, WifiOff, AlertCircle, CheckCircle, Clock, 
  Navigation, Smartphone, Database, Settings, QrCode, Copy, Download, Upload, Filter, Eye, EyeOff,
  Power, Battery, Signal, Gauge, Calendar, User, Phone, Mail, Globe, Shield, Zap, Activity,
  Car, Truck, Bus, Motorcycle, Ship, Plane, Train, Bike, Scooter, Van, Ambulance, Fire,
  MoreHorizontal, Star, Archive, Lock, Unlock, Play, Pause, Square, RotateCcw, Save
} from 'lucide-react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const DeviceRegistration = ({ devices, onDeviceAdded, onDeviceSelect }) => {
  const [vehicles, setVehicles] = useState([]);
  const [trackerCompanies, setTrackerCompanies] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deviceForm, setDeviceForm] = useState({
    name: '',
    uniqueId: '',
    model: '',
    category: 'bus',
    imei: '',
    phone: '',
    contact: '',
    trackerCompanyId: '',
    protocol: 'osmand',
    port: '5033',
    attributes: {},
    // Advanced device settings
    disabled: false,
    lastUpdate: null,
    positionId: null,
    groupId: null,
    calendarId: null,
    status: 'offline',
    motion: false,
    overspeed: false,
    motionStreak: false,
    overspeedGeofence: false,
    overspeedNotificaton: false,
    overspeedCalendar: false,
    // Device configuration
    config: {
      devicePassword: '',
      deviceDataTimeout: 30,
      deviceAckTimeout: 30,
      deviceInactivityTimeout: 300,
      deviceOfflineTimeout: 300,
      deviceOfflineSpeedThreshold: 5,
      deviceOfflineSpeedLimit: 0,
      deviceOfflineSpeedLimitTime: 0,
      deviceOfflineSpeedLimitDistance: 0,
      deviceOfflineSpeedLimitAccuracy: 0,
      deviceOfflineSpeedLimitAngle: 0,
      deviceOfflineSpeedLimitOdometer: 0,
      deviceOfflineSpeedLimitFuel: 0,
      deviceOfflineSpeedLimitDriver: 0,
      deviceOfflineSpeedLimitPassenger: 0,
      deviceOfflineSpeedLimitHarshAcceleration: 0,
      deviceOfflineSpeedLimitHarshBraking: 0,
      deviceOfflineSpeedLimitHarshCornering: 0,
      deviceOfflineSpeedLimitIdle: 0,
      deviceOfflineSpeedLimitEngine: 0,
      deviceOfflineSpeedLimitMaintenance: 0,
      deviceOfflineSpeedLimitAlarm: 0,
      deviceOfflineSpeedLimitGeofence: 0,
      deviceOfflineSpeedLimitCommand: 0,
      deviceOfflineSpeedLimitCustom: 0,
      deviceOfflineSpeedLimitTextMessage: 0,
      deviceOfflineSpeedLimitDriverChanged: 0,
      deviceOfflineSpeedLimitOverspeed: 0,
      deviceOfflineSpeedLimitMotion: 0,
      deviceOfflineSpeedLimitHarshAccelerationStart: 0,
      deviceOfflineSpeedLimitHarshAccelerationEnd: 0,
      deviceOfflineSpeedLimitHarshBrakingStart: 0,
      deviceOfflineSpeedLimitHarshBrakingEnd: 0,
      deviceOfflineSpeedLimitHarshCorneringStart: 0,
      deviceOfflineSpeedLimitHarshCorneringEnd: 0,
      deviceOfflineSpeedLimitLowBattery: 0,
      deviceOfflineSpeedLimitLowFuel: 0,
      deviceOfflineSpeedLimitLowCoolant: 0,
      deviceOfflineSpeedLimitLowOil: 0,
      deviceOfflineSpeedLimitLowTire: 0,
      deviceOfflineSpeedLimitCheckEngine: 0,
      deviceOfflineSpeedLimitTransmission: 0,
      deviceOfflineSpeedLimitAirbag: 0,
      deviceOfflineSpeedLimitCrash: 0,
      deviceOfflineSpeedLimitPanic: 0,
      deviceOfflineSpeedLimitJamming: 0,
      deviceOfflineSpeedLimitTampering: 0,
      deviceOfflineSpeedLimitDisconnected: 0,
      deviceOfflineSpeedLimitConnected: 0,
      deviceOfflineSpeedLimitRoaming: 0,
      deviceOfflineSpeedLimitPowerCut: 0,
      deviceOfflineSpeedLimitPowerRestored: 0
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // grid, list, map
  const [filterStatus, setFilterStatus] = useState('all'); // all, online, offline, unknown
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortBy, setSortBy] = useState('name'); // name, status, lastUpdate, category
  const [sortOrder, setSortOrder] = useState('asc'); // asc, desc
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch vehicles and tracker companies
  const { data: vehiclesData, isLoading: vehiclesLoading } = useQuery({
    queryKey: ["/api/vehicles", { limit: 1000 }],
  });

  const { data: trackerCompaniesData, isLoading: companiesLoading } = useQuery({
    queryKey: ["/api/tracker-companies"],
  });

  useEffect(() => {
    if (vehiclesData) {
      setVehicles(vehiclesData.vehicles || []);
    }
  }, [vehiclesData]);

  useEffect(() => {
    if (trackerCompaniesData) {
      setTrackerCompanies(trackerCompaniesData || []);
    }
  }, [trackerCompaniesData]);

  const handleVehicleSelect = (vehicle) => {
    setSelectedVehicle(vehicle);
    setDeviceForm(prev => ({
      ...prev,
      name: vehicle.vehicle_register_number,
      uniqueId: `VH${vehicle.id.toString().padStart(6, '0')}`,
      model: vehicle.make_company || 'Unknown'
    }));
  };

  const handleInputChange = (field, value) => {
    setDeviceForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleConfigChange = (field, value) => {
    setDeviceForm(prev => ({
      ...prev,
      config: {
        ...prev.config,
        [field]: value
      }
    }));
  };

  // Device management functions
  const handleDeviceSelect = (device) => {
    if (selectedDevices.includes(device.id)) {
      setSelectedDevices(prev => prev.filter(id => id !== device.id));
    } else {
      setSelectedDevices(prev => [...prev, device.id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedDevices.length === filteredDevices.length) {
      setSelectedDevices([]);
    } else {
      setSelectedDevices(filteredDevices.map(d => d.id));
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedDevices.length === 0) {
      toast({
        title: "No devices selected",
        description: "Please select devices to perform bulk actions",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      await apiRequest('/api/tracking/devices/bulk', {
        method: 'POST',
        body: JSON.stringify({
          deviceIds: selectedDevices,
          action: action
        })
      });
      
      toast({
        title: "Success",
        description: `Bulk ${action} completed successfully`,
      });
      
      setSelectedDevices([]);
      queryClient.invalidateQueries(['/api/tracking/devices']);
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to perform bulk ${action}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeviceCommand = async (deviceId, command) => {
    try {
      setLoading(true);
      await apiRequest('/api/tracking/devices/command', {
        method: 'POST',
        body: JSON.stringify({
          deviceId,
          command
        })
      });
      
      toast({
        title: "Command sent",
        description: `Command sent to device successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send command to device",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort devices
  const filteredDevices = devices.filter(device => {
    const matchesSearch = device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         device.uniqueId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || device.status === filterStatus;
    const matchesCategory = filterCategory === 'all' || device.category === filterCategory;
    
    return matchesSearch && matchesStatus && matchesCategory;
  }).sort((a, b) => {
    let aValue = a[sortBy];
    let bValue = b[sortBy];
    
    if (sortBy === 'lastUpdate') {
      aValue = new Date(aValue || 0);
      bValue = new Date(bValue || 0);
    }
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  // Device status helpers
  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'offline': return 'bg-red-500';
      case 'unknown': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'online': return <Wifi className="h-4 w-4" />;
      case 'offline': return <WifiOff className="h-4 w-4" />;
      case 'unknown': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'car': return <Car className="h-4 w-4" />;
      case 'truck': return <Truck className="h-4 w-4" />;
      case 'bus': return <Bus className="h-4 w-4" />;
      case 'motorcycle': return <Motorcycle className="h-4 w-4" />;
      case 'ship': return <Ship className="h-4 w-4" />;
      case 'plane': return <Plane className="h-4 w-4" />;
      case 'train': return <Train className="h-4 w-4" />;
      case 'bike': return <Bike className="h-4 w-4" />;
      case 'scooter': return <Scooter className="h-4 w-4" />;
      case 'van': return <Van className="h-4 w-4" />;
      case 'ambulance': return <Ambulance className="h-4 w-4" />;
      case 'fire': return <Fire className="h-4 w-4" />;
      default: return <Car className="h-4 w-4" />;
    }
  };

  const createDeviceMutation = useMutation({
    mutationFn: async (deviceData) => {
      return await apiRequest('/api/tracking/devices', {
        method: 'POST',
        body: JSON.stringify(deviceData)
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Tracking device created successfully!",
      });
      setSuccess('Tracking device created successfully!');
      setDeviceForm({
        name: '',
        uniqueId: '',
        model: '',
        category: 'bus',
        imei: '',
        phone: '',
        contact: '',
        trackerCompanyId: '',
        protocol: 'osmand',
        port: '5033',
        attributes: {}
      });
      setSelectedVehicle(null);
      setShowAddDialog(false);
      
      // Invalidate and refetch devices
      queryClient.invalidateQueries({ queryKey: ['/api/tracking/devices'] });
      
      if (onDeviceAdded) {
        onDeviceAdded();
      }
    },
    onError: (error) => {
      console.error('Error creating device:', error);
      setError(error.message || 'Failed to create tracking device');
      toast({
        title: "Error",
        description: error.message || 'Failed to create tracking device',
        variant: "destructive",
      });
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedVehicle) {
      setError('Please select a vehicle first');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await createDeviceMutation.mutateAsync({
          vehicleId: selectedVehicle.id,
          ...deviceForm
      });
    } finally {
      setLoading(false);
    }
  };

  const getVehicleTrackingStatus = (vehicle) => {
    const device = devices.find(d => d.uniqueId === `VH${vehicle.id.toString().padStart(6, '0')}`);
    if (device) {
      return {
        status: device.status,
        hasDevice: true,
        deviceId: device.id,
        device: device
      };
    }
    return {
      status: 'not_tracked',
      hasDevice: false,
      deviceId: null,
      device: null
    };
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'offline': return 'bg-red-500';
      case 'unknown': return 'bg-gray-500';
      case 'not_tracked': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'online': return 'Online';
      case 'offline': return 'Offline';
      case 'unknown': return 'Unknown';
      case 'not_tracked': return 'Not Tracked';
      default: return 'Unknown';
    }
  };

  const filteredVehicles = vehicles.filter(vehicle =>
    vehicle.vehicle_register_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vehicle.make_company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vehicle.model_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Text copied to clipboard",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Device Registration</h2>
          <p className="text-muted-foreground">
            Register tracking devices for your vehicles to enable real-time monitoring
          </p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Device
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Register New Tracking Device</DialogTitle>
              <DialogDescription>
                Configure a new tracking device for vehicle monitoring
              </DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="vehicle" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="vehicle">Select Vehicle</TabsTrigger>
                <TabsTrigger value="device" disabled={!selectedVehicle}>Device Config</TabsTrigger>
              </TabsList>
              
              <TabsContent value="vehicle" className="space-y-4">
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search vehicles..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
      </div>

                  <div className="grid gap-4 max-h-96 overflow-y-auto">
                    {filteredVehicles.map((vehicle) => {
              const trackingStatus = getVehicleTrackingStatus(vehicle);
              return (
                        <Card 
                  key={vehicle.id}
                          className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                            selectedVehicle?.id === vehicle.id ? 'ring-2 ring-primary' : ''
                          } ${trackingStatus.hasDevice ? 'border-green-200' : ''}`}
                  onClick={() => handleVehicleSelect(vehicle)}
                >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="space-y-1">
                                <h4 className="font-semibold">{vehicle.vehicle_register_number}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {vehicle.make_company} {vehicle.model_number}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Owner: {vehicle.owner?.name || 'Unknown'}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Driver: {vehicle.driver?.name || 'Not assigned'}
                                </p>
                              </div>
                              <div className="flex flex-col items-end space-y-2">
                                <Badge 
                                  variant={trackingStatus.hasDevice ? "default" : "secondary"}
                                  className={getStatusColor(trackingStatus.status)}
                    >
                      {getStatusText(trackingStatus.status)}
                                </Badge>
                  {trackingStatus.hasDevice && (
                                  <div className="text-xs text-muted-foreground">
                                    Device ID: {trackingStatus.deviceId}
                    </div>
                  )}
                </div>
                            </div>
                          </CardContent>
                        </Card>
              );
            })}
          </div>
        </div>
              </TabsContent>
              
              <TabsContent value="device" className="space-y-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Device Name</Label>
                      <Input
                  id="name"
                  value={deviceForm.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="Enter device name"
                  required
                />
              </div>

                    <div className="space-y-2">
                      <Label htmlFor="uniqueId">Unique ID</Label>
                      <Input
                  id="uniqueId"
                  value={deviceForm.uniqueId}
                        onChange={(e) => handleInputChange('uniqueId', e.target.value)}
                        placeholder="Enter unique device ID"
                  required
                />
                    </div>
              </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="model">Device Model</Label>
                      <Input
                  id="model"
                  value={deviceForm.model}
                        onChange={(e) => handleInputChange('model', e.target.value)}
                  placeholder="Enter device model"
                />
              </div>

                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Select value={deviceForm.category} onValueChange={(value) => handleInputChange('category', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bus">Bus</SelectItem>
                          <SelectItem value="ambulance">Ambulance</SelectItem>
                          <SelectItem value="car">Car</SelectItem>
                          <SelectItem value="truck">Truck</SelectItem>
                          <SelectItem value="motorcycle">Motorcycle</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Device Details</h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="imei">IMEI Number</Label>
                        <Input
                          id="imei"
                          value={deviceForm.imei}
                          onChange={(e) => handleInputChange('imei', e.target.value)}
                          placeholder="Enter IMEI number"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          value={deviceForm.phone}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                          placeholder="Enter phone number"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contact">Contact Person</Label>
                      <Input
                        id="contact"
                        value={deviceForm.contact}
                        onChange={(e) => handleInputChange('contact', e.target.value)}
                        placeholder="Enter contact person name"
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Technical Configuration</h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="trackerCompany">Tracker Company</Label>
                        <Select 
                          value={deviceForm.trackerCompanyId} 
                          onValueChange={(value) => handleInputChange('trackerCompanyId', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select tracker company" />
                          </SelectTrigger>
                          <SelectContent>
                            {trackerCompanies.map((company) => (
                              <SelectItem key={company.id} value={company.id.toString()}>
                                {company.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="protocol">Protocol</Label>
                        <Select value={deviceForm.protocol} onValueChange={(value) => handleInputChange('protocol', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select protocol" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="osmand">Osmand</SelectItem>
                            <SelectItem value="gt06">GT06</SelectItem>
                            <SelectItem value="h02">H02</SelectItem>
                            <SelectItem value="teltonika">Teltonika</SelectItem>
                            <SelectItem value="totem">Totem</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="port">Port</Label>
                      <Input
                        id="port"
                        value={deviceForm.port}
                        onChange={(e) => handleInputChange('port', e.target.value)}
                        placeholder="Enter port number"
                      />
                    </div>
              </div>

              {error && (
                    <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                  {error}
                </div>
              )}

              {success && (
                    <div className="p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-md">
                  {success}
                </div>
              )}

                  <div className="flex justify-end space-x-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setShowAddDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                type="submit" 
                      disabled={loading || createDeviceMutation.isPending}
              >
                      {loading || createDeviceMutation.isPending ? 'Creating Device...' : 'Create Device'}
                    </Button>
                  </div>
            </form>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      {/* Device List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Registered Devices
          </CardTitle>
          <CardDescription>
            Manage your tracking devices and their configurations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {devices && devices.length > 0 ? (
              devices.map((device) => (
                <Card key={device.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h4 className="font-semibold">{device.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        ID: {device.uniqueId} | Model: {device.model}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Protocol: {device.protocol} | Port: {device.port}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={device.status === 'online' ? 'default' : 'secondary'}
                        className={getStatusColor(device.status)}
                      >
                        {getStatusText(device.status)}
                      </Badge>
                      <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No devices registered yet</p>
                <p className="text-sm">Click "Add Device" to register your first tracking device</p>
          </div>
        )}
      </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeviceRegistration;

