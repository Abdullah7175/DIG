import React from 'react';
import { 
  MapPin, 
  Navigation, 
  Gauge, 
  Clock, 
  Battery, 
  Signal,
  Wifi,
  WifiOff,
  AlertCircle,
  CheckCircle,
  Truck,
  Activity
} from 'lucide-react';

const DeviceStatusPanel = ({ 
  devices = [], 
  positions = {}, 
  deviceStatuses = {},
  events = [],
  selectedDeviceId 
}) => {
  const selectedDevice = devices.find(device => device.id === selectedDeviceId);
  const selectedPosition = selectedDeviceId ? positions[selectedDeviceId] : null;
  const selectedDeviceStatus = selectedDeviceId ? deviceStatuses[selectedDeviceId] : null;
  const deviceEvents = events.filter(event => event.deviceId === selectedDeviceId).slice(0, 5);

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'bg-green-100 text-green-800';
      case 'offline': return 'bg-red-100 text-red-800';
      case 'unknown': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'online': return <CheckCircle size={16} className="text-green-500" />;
      case 'offline': return <WifiOff size={16} className="text-red-500" />;
      case 'unknown': return <AlertCircle size={16} className="text-yellow-500" />;
      default: return <Signal size={16} className="text-gray-500" />;
    }
  };

  const formatSpeed = (speed) => {
    if (!speed) return 'N/A';
    return `${parseFloat(speed).toFixed(1)} km/h`;
  };

  const formatCourse = (course) => {
    if (!course) return 'N/A';
    return `${course}°`;
  };

  const formatBattery = (battery) => {
    if (!battery) return 'N/A';
    return `${battery}%`;
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  };

  const getBatteryColor = (battery) => {
    if (!battery) return '#666';
    if (battery > 50) return '#4CAF50';
    if (battery > 20) return '#FF9800';
    return '#F44336';
  };

  if (!selectedDevice) {
    return (
      <div className="h-full bg-white rounded-lg shadow-sm border border-gray-200 flex items-center justify-center">
        <div className="text-center p-8">
          <MapPin size={48} className="text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Select a device to view details
          </h3>
          <p className="text-gray-600 text-sm">
            Click on a device marker on the map or select from the device list
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col">
      {/* Device Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
            selectedDevice.status === 'online' ? 'bg-green-500' : 'bg-red-500'
          }`}>
            <Truck size={24} className="text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">
              {selectedDevice.name}
            </h3>
            <p className="text-sm text-gray-500">
              ID: {selectedDevice.uniqueId}
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedDevice.status)}`}>
            {selectedDevice.status}
          </span>
        </div>
      </div>

      {/* Position Information */}
      <div className="flex-1 overflow-auto">
        {selectedPosition ? (
          <div className="p-4">
            <h4 className="text-md font-semibold text-gray-900 mb-3">Current Position</h4>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <MapPin size={16} className="text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Coordinates</p>
                  <p className="text-xs text-gray-500">
                    {parseFloat(selectedPosition.latitude).toFixed(6)}, {parseFloat(selectedPosition.longitude).toFixed(6)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Gauge size={16} className="text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Speed</p>
                  <p className="text-xs text-gray-500">{formatSpeed(selectedPosition.speed)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Navigation size={16} className="text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Course</p>
                  <p className="text-xs text-gray-500">{formatCourse(selectedPosition.course)}</p>
                </div>
              </div>

              {selectedPosition.altitude && (
                <div className="flex items-center gap-3">
                  <Signal size={16} className="text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Altitude</p>
                    <p className="text-xs text-gray-500">{selectedPosition.altitude} m</p>
                  </div>
                </div>
              )}

              {selectedPosition.battery && (
                <div className="flex items-center gap-3">
                  <Battery size={16} className="text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Battery</p>
                    <p className="text-xs text-gray-500">{formatBattery(selectedPosition.battery)}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Clock size={16} className="text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Last Update</p>
                  <p className="text-xs text-gray-500">{formatTime(selectedPosition.fixTime)}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-32 text-center p-4">
            <WifiOff size={32} className="text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">No position data available</p>
          </div>
        )}

        {/* Recent Events */}
        {deviceEvents.length > 0 && (
          <div className="p-4 border-t border-gray-200">
            <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Activity size={16} />
              Recent Events
            </h4>
            <div className="space-y-2">
              {deviceEvents.map((event, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-900 capitalize">
                      {event.type.replace(/([A-Z])/g, ' $1').trim()}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatTime(event.eventTime)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Device Information */}
        <div className="p-4 border-t border-gray-200">
          <h4 className="text-md font-semibold text-gray-900 mb-3">Device Information</h4>
          
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-900">Model</p>
              <p className="text-xs text-gray-500">{selectedDevice.model || 'N/A'}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-900">Phone</p>
              <p className="text-xs text-gray-500">{selectedDevice.phone || 'N/A'}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-900">Contact</p>
              <p className="text-xs text-gray-500">{selectedDevice.contact || 'N/A'}</p>
            </div>
            
            {selectedDevice.expirationTime && (
              <div>
                <p className="text-sm font-medium text-gray-900">Expiration</p>
                <p className="text-xs text-gray-500">{formatTime(selectedDevice.expirationTime)}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeviceStatusPanel;
