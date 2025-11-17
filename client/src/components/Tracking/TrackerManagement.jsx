import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Delete, 
  RefreshCw, 
  Navigation,
  Wifi,
  WifiOff,
  AlertCircle,
  Truck,
  Phone,
  MapPin
} from 'lucide-react';
import traccarService from '../../services/traccarService';
import { useToast } from '@/hooks/use-toast';

const TrackerManagement = () => {
  const { toast } = useToast();
  
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [newDevice, setNewDevice] = useState({ 
    name: '', 
    uniqueId: '', 
    model: '', 
    phone: '',
    contact: '',
    category: 'Vehicle'
  });

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      setError(null);
      const devicesData = await traccarService.getDevices();
      setDevices(devicesData || []);
    } catch (error) {
      console.error('Error fetching devices:', error);
      if (error.message.includes('401')) {
        setError('Traccar authentication required. Please configure Traccar login credentials.');
        toast({
          title: "Authentication Required",
          description: "Please configure Traccar login credentials to access device data",
          variant: "destructive"
        });
      } else {
        setError(error.message);
        toast({
          title: "Error",
          description: "Failed to fetch devices from Traccar",
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddDevice = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const deviceData = {
        name: newDevice.name,
        uniqueId: newDevice.uniqueId,
        model: newDevice.model || 'Generic GPS Tracker',
        phone: newDevice.phone,
        contact: newDevice.contact,
        category: newDevice.category,
        disabled: false
      };
      
      await traccarService.createDevice(deviceData);
      
      setNewDevice({ 
        name: '', 
        uniqueId: '', 
        model: '', 
        phone: '',
        contact: '',
        category: 'Vehicle'
      });
      setShowAddDialog(false);
      fetchDevices();
      
      toast({
        title: "Success",
        description: "Device added successfully",
      });
    } catch (error) {
      console.error('Error adding device:', error);
      setError(error.message);
      toast({
        title: "Error",
        description: "Failed to add device",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditDevice = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const deviceData = {
        name: editingDevice.name,
        uniqueId: editingDevice.uniqueId,
        model: editingDevice.model || 'Generic GPS Tracker',
        phone: editingDevice.phone,
        contact: editingDevice.contact,
        category: editingDevice.category || 'Vehicle',
        disabled: editingDevice.disabled || false
      };
      
      await traccarService.updateDevice(editingDevice.id, deviceData);
      
      setEditingDevice(null);
      setShowEditDialog(false);
      fetchDevices();
      
      toast({
        title: "Success",
        description: "Device updated successfully",
      });
    } catch (error) {
      console.error('Error updating device:', error);
      setError(error.message);
      toast({
        title: "Error",
        description: "Failed to update device",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDevice = async (deviceId) => {
    if (!window.confirm('Are you sure you want to delete this device?')) return;
    
    try {
      setLoading(true);
      setError(null);
      
      await traccarService.deleteDevice(deviceId);
      fetchDevices();
      
      toast({
        title: "Success",
        description: "Device deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting device:', error);
      setError(error.message);
      toast({
        title: "Error",
        description: "Failed to delete device",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getDeviceStatus = (device) => {
    // This would be determined by the last position update time
    // For now, we'll use a simple status based on device properties
    if (device.status === 'online') return 'online';
    if (device.status === 'offline') return 'offline';
    return 'unknown';
  };

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
      case 'online': return <Wifi size={16} className="text-green-500" />;
      case 'offline': return <WifiOff size={16} className="text-red-500" />;
      case 'unknown': return <AlertCircle size={16} className="text-yellow-500" />;
      default: return <AlertCircle size={16} className="text-gray-500" />;
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <Navigation size={24} className="text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">
              Device Management
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={fetchDevices}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              onClick={() => setShowAddDialog(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus size={16} />
              Add Device
            </button>
          </div>
        </div>
        
        {/* Stats */}
        <div className="flex gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {devices.length}
            </div>
            <div className="text-sm text-gray-500">
              Total Devices
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {devices.filter(d => getDeviceStatus(d) === 'online').length}
            </div>
            <div className="text-sm text-gray-500">
              Online
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {devices.filter(d => getDeviceStatus(d) === 'offline').length}
            </div>
            <div className="text-sm text-gray-500">
              Offline
            </div>
          </div>
        </div>
      </div>

      {/* Devices Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Device Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unique ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Model
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Update
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {devices.map((device) => {
                const status = getDeviceStatus(device);
                return (
                  <tr key={device.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Truck size={20} className="text-gray-400 mr-3" />
                        <div className="text-sm font-medium text-gray-900">
                          {device.name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {device.uniqueId}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {device.model || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <Phone size={16} className="text-gray-400 mr-2" />
                        {device.phone || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                        {getStatusIcon(status)}
                        <span className="ml-1">{status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {device.lastUpdate ? new Date(device.lastUpdate).toLocaleString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setEditingDevice(device);
                            setShowEditDialog(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="Edit Device"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteDevice(device.id)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="Delete Device"
                        >
                          <Delete size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Device Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Add New Device</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Device Name *
                </label>
                <input
                  type="text"
                  value={newDevice.name}
                  onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter device name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unique ID *
                </label>
                <input
                  type="text"
                  value={newDevice.uniqueId}
                  onChange={(e) => setNewDevice({ ...newDevice, uniqueId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter unique ID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Model
                </label>
                <input
                  type="text"
                  value={newDevice.model}
                  onChange={(e) => setNewDevice({ ...newDevice, model: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter model"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="text"
                  value={newDevice.phone}
                  onChange={(e) => setNewDevice({ ...newDevice, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact
                </label>
                <input
                  type="text"
                  value={newDevice.contact}
                  onChange={(e) => setNewDevice({ ...newDevice, contact: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter contact person"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowAddDialog(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddDevice}
                disabled={loading || !newDevice.name || !newDevice.uniqueId}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                Add Device
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Device Dialog */}
      {showEditDialog && editingDevice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Edit Device</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Device Name *
                </label>
                <input
                  type="text"
                  value={editingDevice.name}
                  onChange={(e) => setEditingDevice({ ...editingDevice, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unique ID *
                </label>
                <input
                  type="text"
                  value={editingDevice.uniqueId}
                  onChange={(e) => setEditingDevice({ ...editingDevice, uniqueId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Model
                </label>
                <input
                  type="text"
                  value={editingDevice.model || ''}
                  onChange={(e) => setEditingDevice({ ...editingDevice, model: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="text"
                  value={editingDevice.phone || ''}
                  onChange={(e) => setEditingDevice({ ...editingDevice, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact
                </label>
                <input
                  type="text"
                  value={editingDevice.contact || ''}
                  onChange={(e) => setEditingDevice({ ...editingDevice, contact: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowEditDialog(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleEditDevice}
                disabled={loading || !editingDevice?.name || !editingDevice?.uniqueId}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                Update Device
              </button>
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
};

export default TrackerManagement;
