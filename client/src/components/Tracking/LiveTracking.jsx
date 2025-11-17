import React, { useEffect, useState, useCallback } from 'react';
import { 
  MapPin, 
  Wifi, 
  WifiOff, 
  AlertCircle,
  RefreshCw,
  Map,
  Truck,
  Clock,
  Navigation
} from 'lucide-react';
import LiveTrackingMap from './LiveTrackingMap';
import DeviceList from './DeviceList';
import DeviceStatusPanel from './DeviceStatusPanel';
import traccarService from '../../services/traccarService';
import { useVehiclePositions, useVehicleEvents, useDeviceStatus } from '../../hooks/useWebSocket';
import { useToast } from '@/hooks/use-toast';

const LiveTracking = () => {
  const { toast } = useToast();
  
  // State management
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  // WebSocket hooks for real-time data (with manual connection control)
  const { positions, isConnected: positionsConnected, error: positionsError, connect: connectPositions } = useVehiclePositions();
  const { events, isConnected: eventsConnected, error: eventsError, connect: connectEvents } = useVehicleEvents();
  const { deviceStatuses, isConnected: statusConnected, error: statusError, connect: connectStatus } = useDeviceStatus();

  // Check authentication and connect WebSockets
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const authenticated = !!user;
    setIsAuthenticated(authenticated);
    
    if (authenticated) {
      // Debounce WebSocket connections to prevent rapid reconnections
      const connectTimer = setTimeout(() => {
        // Connect WebSockets when user is authenticated
        // Only connect if not already connected
        if (!positionsConnected) connectPositions();
        if (!eventsConnected) connectEvents();
        if (!statusConnected) connectStatus();
      }, 100); // Small delay to prevent rapid connections
      
      return () => clearTimeout(connectTimer);
    }
  }, [connectPositions, connectEvents, connectStatus, positionsConnected, eventsConnected, statusConnected]);

  // Initialize tracking service
  useEffect(() => {
    const initializeTracking = async () => {
      try {
        // Check if user is authenticated
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        if (!user) {
          console.log('User not authenticated, skipping tracking initialization');
          return;
        }

        setLoading(true);
        setError(null);
        
        // Fetch devices from Traccar
        const devicesData = await traccarService.getDevices();
        setDevices(devicesData || []);
        
        // Set first device as selected if none selected
        if (devicesData && devicesData.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(devicesData[0].id);
        }
        
        setLastUpdate(new Date());
        
      } catch (error) {
        console.error('Failed to initialize tracking:', error);
        setError('Failed to connect to tracking service. Please check if Traccar backend is running.');
        toast({
          title: "Connection Error",
          description: "Failed to connect to tracking service",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    initializeTracking();
  }, []);

  // Handle WebSocket errors (only show if not connected)
  useEffect(() => {
    // Only show error if WebSocket is not connected AND there's an error
    if ((positionsError || eventsError || statusError) && 
        !positionsConnected && !eventsConnected && !statusConnected) {
      const errorMsg = positionsError || eventsError || statusError;
      setError(`WebSocket Error: ${errorMsg}`);
    } else if (positionsConnected || eventsConnected || statusConnected) {
      // Clear error if at least one WebSocket is connected
      setError(null);
    }
  }, [positionsError, eventsError, statusError, positionsConnected, eventsConnected, statusConnected]);

  const handleRefresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Refresh devices
      const devicesData = await traccarService.getDevices();
      setDevices(devicesData || []);
      
      setLastUpdate(new Date());
      
      toast({
        title: "Data Refreshed",
        description: "Tracking data has been updated",
      });
      
    } catch (error) {
      console.error('Failed to refresh data:', error);
      setError('Failed to refresh data');
      toast({
        title: "Refresh Error",
        description: "Failed to refresh tracking data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const handleDeviceSelect = useCallback((deviceId) => {
    setSelectedDeviceId(deviceId);
  }, []);

  // Get device array for compatibility
  const deviceArray = devices || [];

  // Show authentication message if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center max-w-md">
          <AlertCircle size={48} className="text-orange-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-4">Authentication Required</h2>
          <p className="text-gray-600">
            Please log in to access the vehicle tracking system.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 p-4 mb-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <MapPin size={24} className="text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">
              Live Vehicle Tracking
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Connection Status */}
            <div className="flex items-center gap-2">
              {positionsConnected && eventsConnected && statusConnected ? (
                <Wifi size={20} className="text-green-500" />
              ) : (
                <WifiOff size={20} className="text-red-500" />
              )}
              <span className={`text-sm font-medium ${
                positionsConnected && eventsConnected && statusConnected 
                  ? 'text-green-600' 
                  : 'text-red-600'
              }`}>
                {positionsConnected && eventsConnected && statusConnected 
                  ? 'Connected' 
                  : 'Disconnected'}
              </span>
            </div>
            
            {/* Last Update */}
            {lastUpdate && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock size={16} />
                <span>Updated: {lastUpdate.toLocaleTimeString()}</span>
              </div>
            )}
            
            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={loading}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                loading 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-blue-50 text-blue-600 hover:bg-blue-100 cursor-pointer'
              }`}
            >
              <RefreshCw 
                size={16} 
                className={loading ? 'animate-spin' : ''}
              />
              <span className="text-sm font-medium">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Left Sidebar - Device List */}
        <div className="w-80 min-w-80">
          <DeviceList 
            devices={deviceArray}
            positions={positions}
            deviceStatuses={deviceStatuses}
            selectedDeviceId={selectedDeviceId}
            onDeviceSelect={handleDeviceSelect}
          />
        </div>

        {/* Center - Map */}
        <div className="flex-1 min-w-0">
          <LiveTrackingMap
            devices={deviceArray}
            positions={positions}
            selectedDeviceId={selectedDeviceId}
            onDeviceSelect={handleDeviceSelect}
          />
        </div>

        {/* Right Sidebar - Device Status */}
        <div className="w-80 min-w-80">
          <DeviceStatusPanel
            devices={deviceArray}
            positions={positions}
            deviceStatuses={deviceStatuses}
            events={events}
            selectedDeviceId={selectedDeviceId}
          />
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg max-w-md z-50">
          <div className="flex items-center gap-2">
            <AlertCircle size={20} />
            <span className="font-medium">Error</span>
          </div>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Loading Indicator */}
      {loading && (
        <div className="fixed top-4 right-4 bg-white shadow-lg rounded-lg p-3 flex items-center gap-2 z-50">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-sm text-gray-600">Loading...</span>
        </div>
      )}

      {/* Empty State */}
      {!loading && deviceArray.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Truck size={64} className="text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Devices Found</h3>
            <p className="text-gray-600 mb-4">
              No tracking devices are currently available. Please check your Traccar configuration.
            </p>
            <button
              onClick={handleRefresh}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveTracking;