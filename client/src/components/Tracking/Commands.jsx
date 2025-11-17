import React, { useState } from 'react';
import { useMutation, useQuery } from "@tanstack/react-query";
import { 
  Send, 
  Smartphone,
  Wifi,
  WifiOff,
  Battery,
  Volume2,
  VolumeX,
  Lock,
  Unlock,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Power,
  Settings,
  MapPin,
  Camera,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  MessageSquare,
  Download,
  Upload,
  Zap,
  Shield,
  Eye,
  EyeOff,
  Play,
  Pause,
  Square,
  RotateCcw,
  Save,
  Trash2,
  Edit,
  Copy,
  Filter,
  Search,
  MoreHorizontal,
  Star,
  Archive,
  Gauge,
  Activity,
  Navigation,
  Globe,
  Calendar,
  User,
  Mail,
  Phone as PhoneIcon,
  Car,
  Truck,
  Bus,
  Motorcycle,
  Ship,
  Plane,
  Train,
  Bike,
  Scooter,
  Van,
  Ambulance,
  Fire
} from 'lucide-react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Commands = ({ devices = [] }) => {
  const { toast } = useToast();
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [commandType, setCommandType] = useState('custom');
  const [customCommand, setCustomCommand] = useState('');
  const [commandParameters, setCommandParameters] = useState({});
  const [commandHistory, setCommandHistory] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Send command mutation
  const sendCommandMutation = useMutation({
    mutationFn: async (commandData) => {
      return await apiRequest('/api/tracking/commands', {
        method: 'POST',
        body: JSON.stringify(commandData)
      });
    },
    onSuccess: (data) => {
      setCommandHistory(prev => [{
        id: Date.now(),
        deviceId: selectedDevice,
        command: commandType,
        parameters: commandParameters,
        timestamp: new Date().toISOString(),
        status: 'sent'
      }, ...prev]);
      
      toast({
        title: "Success",
        description: "Command sent successfully!",
      });
    },
    onError: (error) => {
      setCommandHistory(prev => [{
        id: Date.now(),
        deviceId: selectedDevice,
        command: commandType,
        parameters: commandParameters,
        timestamp: new Date().toISOString(),
        status: 'failed',
        error: error.message
      }, ...prev]);
      
      toast({
        title: "Error",
        description: error.message || 'Failed to send command',
        variant: "destructive",
      });
    }
  });

  const predefinedCommands = [
    // Engine Control
    {
      type: 'engineStop',
      name: 'Engine Stop',
      description: 'Stop the vehicle engine',
      icon: <Power className="h-4 w-4" />,
      category: 'engine',
      parameters: {}
    },
    {
      type: 'engineResume',
      name: 'Engine Resume',
      description: 'Resume the vehicle engine',
      icon: <Power className="h-4 w-4" />,
      category: 'engine',
      parameters: {}
    },
    {
      type: 'engineStart',
      name: 'Engine Start',
      description: 'Start the vehicle engine',
      icon: <Power className="h-4 w-4" />,
      category: 'engine',
      parameters: {}
    },
    
    // Alarm Control
    {
      type: 'alarmArm',
      name: 'Arm Alarm',
      description: 'Arm the vehicle alarm system',
      icon: <Lock className="h-4 w-4" />,
      category: 'alarm',
      parameters: {}
    },
    {
      type: 'alarmDisarm',
      name: 'Disarm Alarm',
      description: 'Disarm the vehicle alarm system',
      icon: <Unlock className="h-4 w-4" />,
      category: 'alarm',
      parameters: {}
    },
    {
      type: 'panicAlarm',
      name: 'Panic Alarm',
      description: 'Trigger panic alarm',
      icon: <AlertCircle className="h-4 w-4" />,
      category: 'alarm',
      parameters: {}
    },
    
    // Device Control
    {
      type: 'requestPhoto',
      name: 'Request Photo',
      description: 'Take a photo using the device camera',
      icon: <Camera className="h-4 w-4" />,
      category: 'device',
      parameters: {}
    },
    {
      type: 'requestStatus',
      name: 'Request Status',
      description: 'Get current device status',
      icon: <RefreshCw className="h-4 w-4" />,
      category: 'device',
      parameters: {}
    },
    {
      type: 'requestLocation',
      name: 'Request Location',
      description: 'Get current device location',
      icon: <MapPin className="h-4 w-4" />,
      category: 'device',
      parameters: {}
    },
    {
      type: 'deviceReset',
      name: 'Device Reset',
      description: 'Reset the device to factory settings',
      icon: <RotateCcw className="h-4 w-4" />,
      category: 'device',
      parameters: {}
    },
    {
      type: 'deviceRestart',
      name: 'Device Restart',
      description: 'Restart the device',
      icon: <Power className="h-4 w-4" />,
      category: 'device',
      parameters: {}
    },
    
    // Communication
    {
      type: 'sendSms',
      name: 'Send SMS',
      description: 'Send SMS message to device',
      icon: <MessageSquare className="h-4 w-4" />,
      category: 'communication',
      parameters: {
        message: ''
      }
    },
    {
      type: 'makeCall',
      name: 'Make Call',
      description: 'Make a call to the device',
      icon: <Phone className="h-4 w-4" />,
      category: 'communication',
      parameters: {
        phoneNumber: ''
      }
    },
    {
      type: 'answerCall',
      name: 'Answer Call',
      description: 'Answer incoming call',
      icon: <Phone className="h-4 w-4" />,
      category: 'communication',
      parameters: {}
    },
    {
      type: 'hangupCall',
      name: 'Hangup Call',
      description: 'Hangup current call',
      icon: <PhoneOff className="h-4 w-4" />,
      category: 'communication',
      parameters: {}
    },
    
    // Configuration
    {
      type: 'setTimezone',
      name: 'Set Timezone',
      description: 'Set device timezone',
      icon: <Clock className="h-4 w-4" />,
      category: 'configuration',
      parameters: {
        timezone: 'UTC+5:30'
      }
    },
    {
      type: 'setOdometer',
      name: 'Set Odometer',
      description: 'Set device odometer value',
      icon: <Gauge className="h-4 w-4" />,
      category: 'configuration',
      parameters: {
        odometer: 0
      }
    },
    {
      type: 'setSpeedLimit',
      name: 'Set Speed Limit',
      description: 'Set speed limit for overspeed alerts',
      icon: <Gauge className="h-4 w-4" />,
      category: 'configuration',
      parameters: {
        speedLimit: 80
      }
    },
    {
      type: 'setGeofence',
      name: 'Set Geofence',
      description: 'Configure geofence settings',
      icon: <Shield className="h-4 w-4" />,
      category: 'configuration',
      parameters: {
        geofenceId: '',
        action: 'enter'
      }
    },
    
    // Data Management
    {
      type: 'downloadData',
      name: 'Download Data',
      description: 'Download stored data from device',
      icon: <Download className="h-4 w-4" />,
      category: 'data',
      parameters: {
        startDate: '',
        endDate: ''
      }
    },
    {
      type: 'uploadConfig',
      name: 'Upload Config',
      description: 'Upload configuration to device',
      icon: <Upload className="h-4 w-4" />,
      category: 'data',
      parameters: {
        configData: ''
      }
    },
    {
      type: 'clearData',
      name: 'Clear Data',
      description: 'Clear stored data from device',
      icon: <Trash2 className="h-4 w-4" />,
      category: 'data',
      parameters: {}
    },
    
    // Monitoring
    {
      type: 'startMonitoring',
      name: 'Start Monitoring',
      description: 'Start continuous monitoring',
      icon: <Play className="h-4 w-4" />,
      category: 'monitoring',
      parameters: {}
    },
    {
      type: 'stopMonitoring',
      name: 'Stop Monitoring',
      description: 'Stop continuous monitoring',
      icon: <Pause className="h-4 w-4" />,
      category: 'monitoring',
      parameters: {}
    },
    {
      type: 'setReportingInterval',
      name: 'Set Reporting Interval',
      description: 'Set device reporting interval',
      icon: <Clock className="h-4 w-4" />,
      category: 'monitoring',
      parameters: {
        interval: 30
      }
    },
    
    // Custom
    {
      type: 'custom',
      name: 'Custom Command',
      description: 'Send a custom command',
      icon: <Send className="h-4 w-4" />,
      category: 'custom',
      parameters: {}
    }
  ];

  // Command categories
  const commandCategories = [
    { value: 'all', label: 'All Commands', icon: <Settings className="h-4 w-4" /> },
    { value: 'engine', label: 'Engine Control', icon: <Power className="h-4 w-4" /> },
    { value: 'alarm', label: 'Alarm Control', icon: <AlertCircle className="h-4 w-4" /> },
    { value: 'device', label: 'Device Control', icon: <Smartphone className="h-4 w-4" /> },
    { value: 'communication', label: 'Communication', icon: <MessageSquare className="h-4 w-4" /> },
    { value: 'configuration', label: 'Configuration', icon: <Settings className="h-4 w-4" /> },
    { value: 'data', label: 'Data Management', icon: <Database className="h-4 w-4" /> },
    { value: 'monitoring', label: 'Monitoring', icon: <Activity className="h-4 w-4" /> },
    { value: 'custom', label: 'Custom', icon: <Send className="h-4 w-4" /> }
  ];

  // Filter commands by category
  const filteredCommands = selectedCategory === 'all' 
    ? predefinedCommands 
    : predefinedCommands.filter(cmd => cmd.category === selectedCategory);

  // Get command by type
  const getCommandByType = (type) => {
    return predefinedCommands.find(cmd => cmd.type === type);
  };

  // Get category icon
  const getCategoryIcon = (category) => {
    const cat = commandCategories.find(c => c.value === category);
    return cat ? cat.icon : <Settings className="h-4 w-4" />;
  };

  const handleSendCommand = () => {
    if (!selectedDevice) {
      toast({
        title: "Error",
        description: "Please select a device",
        variant: "destructive",
      });
      return;
    }

    if (commandType === 'custom' && !customCommand.trim()) {
      toast({
        title: "Error",
        description: "Please enter a custom command",
        variant: "destructive",
      });
      return;
    }

    const commandData = {
      deviceId: selectedDevice,
      command: commandType === 'custom' ? customCommand : commandType,
      parameters: commandParameters
    };

    sendCommandMutation.mutate(commandData);
  };

  const handleParameterChange = (key, value) => {
    setCommandParameters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'sent':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Device Commands</h2>
          <p className="text-muted-foreground">
            Send commands to your tracking devices
          </p>
        </div>
      </div>

      <Tabs defaultValue="send" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="send" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Send Command
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Command History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="send" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Command Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  Command Configuration
                </CardTitle>
                <CardDescription>
                  Configure and send commands to your devices
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Device Selection */}
                <div className="space-y-2">
                  <Label htmlFor="device">Select Device</Label>
                  <Select value={selectedDevice} onValueChange={setSelectedDevice}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a device" />
                    </SelectTrigger>
                    <SelectContent>
                      {devices.map((device) => (
                        <SelectItem key={device.id} value={device.id.toString()}>
                          {device.name} ({device.uniqueId})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Command Type */}
                <div className="space-y-2">
                  <Label htmlFor="commandType">Command Type</Label>
                  <Select value={commandType} onValueChange={setCommandType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select command type" />
                    </SelectTrigger>
                    <SelectContent>
                      {predefinedCommands.map((cmd) => (
                        <SelectItem key={cmd.type} value={cmd.type}>
                          <div className="flex items-center gap-2">
                            {cmd.icon}
                            {cmd.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Command Description */}
                {commandType && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      {predefinedCommands.find(cmd => cmd.type === commandType)?.description}
                    </p>
                  </div>
                )}

                {/* Custom Command Input */}
                {commandType === 'custom' && (
                  <div className="space-y-2">
                    <Label htmlFor="customCommand">Custom Command</Label>
                    <Input
                      id="customCommand"
                      value={customCommand}
                      onChange={(e) => setCustomCommand(e.target.value)}
                      placeholder="Enter custom command"
                    />
                  </div>
                )}

                {/* Command Parameters */}
                {commandType === 'setTimezone' && (
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select 
                      value={commandParameters.timezone || 'UTC+5:30'} 
                      onValueChange={(value) => handleParameterChange('timezone', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UTC+5:30">UTC+5:30 (IST)</SelectItem>
                        <SelectItem value="UTC+0:00">UTC+0:00 (GMT)</SelectItem>
                        <SelectItem value="UTC-5:00">UTC-5:00 (EST)</SelectItem>
                        <SelectItem value="UTC-8:00">UTC-8:00 (PST)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Additional Parameters */}
                <div className="space-y-2">
                  <Label>Additional Parameters (JSON)</Label>
                  <Textarea
                    value={JSON.stringify(commandParameters, null, 2)}
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value);
                        setCommandParameters(parsed);
                      } catch (error) {
                        // Invalid JSON, keep the text for editing
                      }
                    }}
                    placeholder='{"key": "value"}'
                    rows={4}
                  />
                </div>

                <Button 
                  onClick={handleSendCommand}
                  disabled={sendCommandMutation.isPending || !selectedDevice}
                  className="w-full"
                >
                  {sendCommandMutation.isPending ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send Command
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Quick Commands */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  Quick Commands
                </CardTitle>
                <CardDescription>
                  Send common commands with one click
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {predefinedCommands.filter(cmd => cmd.type !== 'custom' && cmd.type !== 'setTimezone').map((cmd) => (
                    <Button
                      key={cmd.type}
                      variant="outline"
                      className="h-auto p-4 flex flex-col items-center gap-2"
                      onClick={() => {
                        setCommandType(cmd.type);
                        setCommandParameters(cmd.parameters);
                        if (selectedDevice) {
                          sendCommandMutation.mutate({
                            deviceId: selectedDevice,
                            command: cmd.type,
                            parameters: cmd.parameters
                          });
                        }
                      }}
                      disabled={!selectedDevice || sendCommandMutation.isPending}
                    >
                      {cmd.icon}
                      <span className="text-xs text-center">{cmd.name}</span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Command History
              </CardTitle>
              <CardDescription>
                View previously sent commands and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {commandHistory.length === 0 ? (
                <div className="text-center py-8">
                  <Send className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Commands Sent</h3>
                  <p className="text-muted-foreground">
                    Commands you send will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {commandHistory.map((command) => (
                    <Card key={command.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(command.status)}
                          <div>
                            <h4 className="font-semibold">
                              {predefinedCommands.find(cmd => cmd.type === command.command)?.name || command.command}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              Device: {devices.find(d => d.id === command.deviceId)?.name || 'Unknown'} | 
                              Sent: {new Date(command.timestamp).toLocaleString()}
                            </p>
                            {command.error && (
                              <p className="text-xs text-red-600 mt-1">
                                Error: {command.error}
                              </p>
                            )}
                          </div>
                        </div>
                        <Badge className={getStatusColor(command.status)}>
                          {command.status}
                        </Badge>
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

export default Commands;
