import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Save, 
  RefreshCw, 
  Wifi,
  WifiOff,
  Map,
  Bell,
  Shield,
  Database,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import traccarService from '../../services/traccarService';
import { useToast } from '@/hooks/use-toast';

const TrackingSettings = () => {
  const { toast } = useToast();
  
  const [settings, setSettings] = useState({
    serverUrl: 'http://localhost:8082',
    updateInterval: 30,
    mapProvider: 'openstreetmap',
    notifications: true,
    soundAlerts: true,
    autoRefresh: true,
    maxHistoryDays: 30
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('unknown');

  useEffect(() => {
    loadSettings();
    testConnection();
  }, []);

  const loadSettings = () => {
    try {
      const savedSettings = localStorage.getItem('trackingSettings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = () => {
    try {
      localStorage.setItem('trackingSettings', JSON.stringify(settings));
      toast({
        title: "Success",
        description: "Settings saved successfully",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive"
      });
    }
  };

  const testConnection = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Test connection to Traccar server
      const response = await fetch(`${settings.serverUrl}/api/server`);
      if (response.ok) {
        setConnectionStatus('connected');
        toast({
          title: "Connection Successful",
          description: "Successfully connected to Traccar server",
        });
      } else {
        setConnectionStatus('error');
        setError(`Server responded with status: ${response.status}`);
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      setConnectionStatus('error');
      setError('Failed to connect to Traccar server. Please check the server URL and ensure Traccar is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected': return <CheckCircle className="text-green-500" size={20} />;
      case 'error': return <AlertCircle className="text-red-500" size={20} />;
      default: return <Clock className="text-yellow-500" size={20} />;
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Connected';
      case 'error': return 'Connection Failed';
      default: return 'Testing...';
    }
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-600 bg-green-50';
      case 'error': return 'text-red-600 bg-red-50';
      default: return 'text-yellow-600 bg-yellow-50';
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <Settings size={24} className="text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">
            Tracking Settings
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={testConnection}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Test Connection
            </button>
            <button
              onClick={saveSettings}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Save size={16} />
              Save Settings
            </button>
          </div>
        </div>
        
        {/* Connection Status */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">Connection Status:</span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 ${getConnectionStatusColor()}`}>
            {getConnectionStatusIcon()}
            {getConnectionStatusText()}
          </span>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="space-y-6">
        {/* Server Configuration */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Database size={20} className="text-blue-600" />
            Server Configuration
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Traccar Server URL
              </label>
              <input
                type="url"
                value={settings.serverUrl}
                onChange={(e) => handleSettingChange('serverUrl', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="http://localhost:8082"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Update Interval (seconds)
              </label>
              <input
                      type="number"
                min="5"
                max="300"
                value={settings.updateInterval}
                onChange={(e) => handleSettingChange('updateInterval', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Map Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Map size={20} className="text-blue-600" />
            Map Settings
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Map Provider
              </label>
              <select
                value={settings.mapProvider}
                onChange={(e) => handleSettingChange('mapProvider', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="openstreetmap">OpenStreetMap</option>
                <option value="google">Google Maps</option>
                <option value="bing">Bing Maps</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Maximum History Days
              </label>
              <input
                      type="number"
                min="1"
                max="365"
                value={settings.maxHistoryDays}
                onChange={(e) => handleSettingChange('maxHistoryDays', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Bell size={20} className="text-blue-600" />
            Notification Settings
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Enable Notifications</label>
                <p className="text-xs text-gray-500">Show browser notifications for alerts</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifications}
                  onChange={(e) => handleSettingChange('notifications', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Sound Alerts</label>
                <p className="text-xs text-gray-500">Play sound for alert notifications</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.soundAlerts}
                  onChange={(e) => handleSettingChange('soundAlerts', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Auto Refresh</label>
                <p className="text-xs text-gray-500">Automatically refresh tracking data</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoRefresh}
                  onChange={(e) => handleSettingChange('autoRefresh', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <AlertCircle size={20} className="text-red-500" />
              <span className="font-medium text-red-800">Error</span>
            </div>
            <p className="text-red-700 mt-1">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackingSettings;