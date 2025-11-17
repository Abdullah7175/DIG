import React, { useState } from 'react';
import { 
  Search,
  Navigation,
  MapPin,
  Clock,
  Gauge,
  Battery,
  Wifi,
  WifiOff,
  AlertCircle,
  CheckCircle,
  Filter,
  Truck
} from 'lucide-react';

const DeviceList = ({ 
  devices = [], 
  positions = {}, 
  deviceStatuses = {},
  selectedDeviceId,
  onDeviceSelect 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

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
      default: return <Wifi size={16} className="text-gray-500" />;
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Never';
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const formatSpeed = (speed) => {
    if (!speed) return 'N/A';
    return `${parseFloat(speed).toFixed(1)} km/h`;
  };

  // Filter devices based on search term and status
  const filteredDevices = devices.filter(device => {
    const matchesSearch = device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         device.uniqueId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || device.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Sort devices by status (online first) and then by name
  const sortedDevices = [...filteredDevices].sort((a, b) => {
    const statusOrder = { online: 0, unknown: 1, offline: 2 };
    const aStatus = statusOrder[a.status] ?? 3;
    const bStatus = statusOrder[b.status] ?? 3;
    
    if (aStatus !== bStatus) {
      return aStatus - bStatus;
    }
    
    return a.name.localeCompare(b.name);
  });

  const handleDeviceSelect = (device) => {
    if (onDeviceSelect) {
      onDeviceSelect(device.id);
    }
  };

  const getDeviceStats = () => {
    const stats = devices.reduce((acc, device) => {
      acc[device.status] = (acc[device.status] || 0) + 1;
      return acc;
    }, {});
    
    return {
      total: devices.length,
      online: stats.online || 0,
      offline: stats.offline || 0,
      unknown: stats.unknown || 0
    };
  };

  const stats = getDeviceStats();

  return (
    <div className="h-full bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          Devices ({stats.total})
        </h3>
        
        {/* Search */}
        <div className="relative mb-3">
          <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search devices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Status Filter */}
        <div className="flex gap-2 flex-wrap">
          {[
            { key: 'all', label: 'All', count: stats.total },
            { key: 'online', label: 'Online', count: stats.online },
            { key: 'offline', label: 'Offline', count: stats.offline },
            { key: 'unknown', label: 'Unknown', count: stats.unknown }
          ].map(filter => (
            <button
              key={filter.key}
              onClick={() => setStatusFilter(filter.key)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                statusFilter === filter.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {filter.label} ({filter.count})
            </button>
          ))}
        </div>
      </div>

      {/* Device List */}
      <div className="flex-1 overflow-auto">
        {sortedDevices.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center p-5">
            <Navigation size={48} className="text-gray-300 mb-3" />
            <p className="text-gray-600 font-medium">No devices found</p>
            <p className="text-gray-500 text-sm">
              {searchTerm ? 'Try adjusting your search terms' : 'No devices match the current filter'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {sortedDevices.map((device) => {
              const position = positions[device.id];
              const deviceStatus = deviceStatuses[device.id];
              const isSelected = selectedDeviceId === device.id;
              
              return (
                <div
                  key={device.id}
                  onClick={() => handleDeviceSelect(device)}
                  className={`p-4 cursor-pointer transition-colors hover:bg-gray-50 ${
                    isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Device Icon */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      device.status === 'online' ? 'bg-green-500' : 'bg-red-500'
                    }`}>
                      <Truck size={16} className="text-white" />
                    </div>
                    
                    {/* Device Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900 truncate">
                          {device.name}
                        </h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(device.status)}`}>
                          {device.status}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-500 mb-2">
                        ID: {device.uniqueId}
                      </p>
                      
                      {position ? (
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <Gauge size={12} />
                            <span>{formatSpeed(position.speed)}</span>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <Clock size={12} />
                            <span>{formatTime(position.fixTime)}</span>
                          </div>
                          
                          {position.battery && (
                            <div className="flex items-center gap-1">
                              <Battery size={12} />
                              <span>{position.battery}%</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400">No position data</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DeviceList;
