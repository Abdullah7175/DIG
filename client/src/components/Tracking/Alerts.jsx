import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Plus, 
  Edit, 
  Trash2, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle, 
  Clock, 
  Settings,
  Volume2,
  VolumeX
} from 'lucide-react';
import traccarService from '../../services/traccarService';
import { useToast } from '@/hooks/use-toast';

const TrackingAlerts = () => {
  const { toast } = useToast();
  
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingAlert, setEditingAlert] = useState(null);
  const [newAlert, setNewAlert] = useState({ 
    name: '',
    type: 'overspeed',
    enabled: true,
      sound: true
  });

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if user is authenticated
      const user = JSON.parse(localStorage.getItem('user') || 'null');
      if (!user) {
        console.log('User not authenticated, skipping alerts fetch');
        return;
      }
      
      const data = await traccarService.getNotifications();
      setAlerts(data || []);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      if (error.message.includes('401')) {
        setError('Traccar authentication required. Please configure Traccar login credentials.');
        toast({
          title: "Authentication Required",
          description: "Please configure Traccar login credentials to access alert data",
          variant: "destructive"
        });
      } else {
        setError('Failed to connect to Traccar backend. Please ensure Traccar is running on port 8082.');
        toast({
          title: "Error",
          description: "Failed to fetch alerts from Traccar",
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddAlert = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const alertData = {
        name: newAlert.name,
        type: newAlert.type,
        enabled: newAlert.enabled,
        sound: newAlert.sound
      };
      
      await traccarService.createNotification(alertData);
      
      setNewAlert({ name: '', type: 'overspeed', enabled: true, sound: true });
      setShowAddDialog(false);
      fetchAlerts();
      
      toast({
        title: "Success",
        description: "Alert added successfully",
      });
    } catch (error) {
      console.error('Error adding alert:', error);
      setError(error.message);
      toast({
        title: "Error",
        description: "Failed to add alert",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditAlert = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const alertData = {
        name: editingAlert.name,
        type: editingAlert.type,
        enabled: editingAlert.enabled,
        sound: editingAlert.sound
      };
      
      await traccarService.updateNotification(editingAlert.id, alertData);
      
      setEditingAlert(null);
      setShowEditDialog(false);
      fetchAlerts();
      
      toast({
        title: "Success",
        description: "Alert updated successfully",
      });
    } catch (error) {
      console.error('Error updating alert:', error);
      setError(error.message);
      toast({
        title: "Error",
        description: "Failed to update alert",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAlert = async (alertId) => {
    if (!window.confirm('Are you sure you want to delete this alert?')) return;
    
    try {
      setLoading(true);
      setError(null);
      
      await traccarService.deleteNotification(alertId);
      fetchAlerts();
      
      toast({
        title: "Success",
        description: "Alert deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting alert:', error);
      setError(error.message);
      toast({
        title: "Error",
        description: "Failed to delete alert",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getAlertTypeIcon = (type) => {
    switch (type) {
      case 'overspeed': return <AlertTriangle className="text-red-500" size={20} />;
      case 'geofence': return <Settings className="text-blue-500" size={20} />;
      case 'maintenance': return <Settings className="text-yellow-500" size={20} />;
      default: return <Bell className="text-gray-500" size={20} />;
    }
  };

  const getAlertTypeLabel = (type) => {
    switch (type) {
      case 'overspeed': return 'Overspeed';
      case 'geofence': return 'Geofence';
      case 'maintenance': return 'Maintenance';
      default: return type;
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <Bell size={24} className="text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">
              Alert Management
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={fetchAlerts}
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
              Add Alert
            </button>
          </div>
        </div>
        
        {/* Stats */}
        <div className="flex gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {alerts.length}
            </div>
            <div className="text-sm text-gray-500">
              Total Alerts
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {alerts.filter(a => a.enabled).length}
            </div>
            <div className="text-sm text-gray-500">
              Active
            </div>
          </div>
        </div>
      </div>

          {/* Alerts List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading && (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading alerts...</p>
          </div>
        )}

        {error && (
          <div className="p-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle size={20} className="text-red-500" />
                <span className="font-medium text-red-800">Error</span>
              </div>
              <p className="text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        {!loading && !error && alerts.length === 0 && (
          <div className="p-8 text-center">
            <Bell size={48} className="text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Alerts Found</h3>
            <p className="text-gray-600 mb-4">
              No alerts are currently configured. Create your first alert to get started.
            </p>
            <button
              onClick={() => setShowAddDialog(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Alert
            </button>
          </div>
        )}

        {!loading && !error && alerts.length > 0 && (
          <div className="divide-y divide-gray-200">
            {alerts.map((alert) => (
              <div key={alert.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      {getAlertTypeIcon(alert.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {alert.name}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          alert.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {alert.enabled ? 'Active' : 'Inactive'}
                        </span>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {getAlertTypeLabel(alert.type)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          {alert.sound ? <Volume2 size={14} /> : <VolumeX size={14} />}
                          <span>{alert.sound ? 'Sound On' : 'Sound Off'}</span>
                        </div>
                        {alert.lastTriggered && (
                          <div className="flex items-center gap-1">
                            <Clock size={14} />
                            <span>Last: {new Date(alert.lastTriggered).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingAlert(alert);
                        setShowEditDialog(true);
                      }}
                      className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg"
                      title="Edit Alert"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteAlert(alert.id)}
                      className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg"
                      title="Delete Alert"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Alert Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Alert</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={newAlert.name}
                  onChange={(e) => setNewAlert({...newAlert, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter alert name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={newAlert.type}
                  onChange={(e) => setNewAlert({...newAlert, type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="overspeed">Overspeed</option>
                  <option value="geofence">Geofence</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newAlert.enabled}
                    onChange={(e) => setNewAlert({...newAlert, enabled: e.target.checked})}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">Enabled</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newAlert.sound}
                    onChange={(e) => setNewAlert({...newAlert, sound: e.target.checked})}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">Sound</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddDialog(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddAlert}
                disabled={loading || !newAlert.name}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Adding...' : 'Add Alert'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Alert Dialog */}
      {showEditDialog && editingAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Alert</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={editingAlert.name}
                  onChange={(e) => setEditingAlert({...editingAlert, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={editingAlert.type}
                  onChange={(e) => setEditingAlert({...editingAlert, type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="overspeed">Overspeed</option>
                  <option value="geofence">Geofence</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingAlert.enabled}
                    onChange={(e) => setEditingAlert({...editingAlert, enabled: e.target.checked})}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">Enabled</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingAlert.sound}
                    onChange={(e) => setEditingAlert({...editingAlert, sound: e.target.checked})}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">Sound</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowEditDialog(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
              Cancel
              </button>
              <button
                onClick={handleEditAlert}
                disabled={loading || !editingAlert.name}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Updating...' : 'Update Alert'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrackingAlerts;