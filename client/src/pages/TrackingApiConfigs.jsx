import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Activity,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  TestTube,
  ArrowLeft,
  Eye,
  EyeOff,
  Calendar,
  Save,
  Database
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function TrackingApiConfigs() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditConfirmDialogOpen, setIsEditConfirmDialogOpen] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [configToDelete, setConfigToDelete] = useState(null);
  const [showApiKey, setShowApiKey] = useState({});
  const [trackerCompanies, setTrackerCompanies] = useState([]);
  const [testDates, setTestDates] = useState({
    start_date: '',
    start_time: '',
    end_date: '',
    end_time: ''
  });
  const [testResult, setTestResult] = useState(null);

  // Fetch tracker companies for dropdown
  useEffect(() => {
    const fetchTrackerCompanies = async () => {
      try {
        const response = await apiRequest('GET', '/api/tracker-companies?limit=1000');
        if (response.ok) {
          const data = await response.json();
          const companies = data.trackerCompanies || data.companies || [];
          setTrackerCompanies(companies.filter(c => c.status === 'active'));
        }
      } catch (error) {
        console.error('Failed to fetch tracker companies:', error);
      }
    };
    fetchTrackerCompanies();
  }, []);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    tracker_company_id: '',
    api_url: '',
    api_key: '',
    api_type: 'esspl',
    api_params: '{"api": "user", "ver": "1.0", "cmd": "OBJECT_GET_OSP"}',
    url_template: '',
    status: 'active',
    auto_sync: true,
    sync_interval_minutes: 15,
    speed_threshold: 50,
    description: ''
  });

  // Fetch all API configs (including inactive)
  const { data: configsData, isLoading, error: fetchError, refetch } = useQuery({
    queryKey: ["/api/tracking-api-configs"],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/tracking-api-configs?includeInactive=true');
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Failed to fetch API configs: ${response.status}`);
        }
        const data = await response.json();
        console.log('Fetched API configs:', data);
        return data.configs || [];
      } catch (error) {
        console.error('Error fetching API configs:', error);
        throw error;
      }
    },
    refetchInterval: 30000, // Refresh every 30 seconds for live status
    retry: 2,
  });

  const configs = configsData || [];
  
  // Debug logging
  useEffect(() => {
    console.log('Current API configs:', configs);
    console.log('Configs count:', configs.length);
  }, [configs]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiRequest('POST', '/api/tracking-api-configs', data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create API config');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "✅ API Configuration Created!",
        description: `"${formData.name || 'API Configuration'}" has been added successfully and is now available for use.`,
        duration: 6000,
      });
      setIsCreateDialogOpen(false);
      resetForm();
      // Invalidate and refetch immediately
      queryClient.invalidateQueries({ queryKey: ["/api/tracking-api-configs"] });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "❌ Creation Failed",
        description: error.message || "Failed to create API configuration. Please check your input and try again.",
        variant: "destructive",
        duration: 6000,
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await apiRequest('PATCH', `/api/tracking-api-configs/${id}`, data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update API config');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "✅ API Configuration Updated!",
        description: `"${formData.name || 'API Configuration'}" has been updated successfully. All changes have been saved.`,
        duration: 6000,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tracking-api-configs"] });
      setIsEditDialogOpen(false);
      setIsEditConfirmDialogOpen(false);
      setSelectedConfig(null);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "❌ Update Failed",
        description: error.message || "Failed to update API configuration. Please check your input and try again.",
        variant: "destructive",
        duration: 6000,
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const response = await apiRequest('DELETE', `/api/tracking-api-configs/${id}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete API config');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "✅ API Configuration Deleted!",
        description: `"${configToDelete?.name || 'API Configuration'}" has been permanently deleted from the system.`,
        duration: 6000,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tracking-api-configs"] });
      setIsDeleteDialogOpen(false);
      setConfigToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "❌ Deletion Failed",
        description: error.message || "Failed to delete API configuration. Please try again later.",
        variant: "destructive",
        duration: 6000,
      });
    },
  });

  // Test API mutation with date range
  const testMutation = useMutation({
    mutationFn: async ({ id, start_date, end_date, save_to_db = false }) => {
      const response = await apiRequest('POST', `/api/tracking-api-configs/${id}/test`, {
        start_date,
        end_date,
        save_to_db
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'API test failed');
      }
      return response.json();
    },
    onSuccess: (data) => {
      setTestResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/tracking-api-configs"] });
      const recordCount = data.data?.recordCount || 0;
      const savedToDb = data.data?.savedToDatabase;
      const recordsSaved = data.data?.recordsSaved || 0;
      
      toast({
        title: "✅ API Test Successful!",
        description: `Connection established successfully! Found ${recordCount} record(s).${savedToDb ? ` ${recordsSaved} record(s) saved to database.` : ' Data not saved to database (test only).'}`,
        duration: 7000,
      });
    },
    onError: (error) => {
      setTestResult({ error: error.message });
      toast({
        title: "❌ API Test Failed",
        description: error.message || "Failed to connect to API. Please check your API configuration and network connection.",
        variant: "destructive",
        duration: 6000,
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      tracker_company_id: '',
      api_url: '',
      api_key: '',
      api_type: 'esspl',
      api_params: '{"api": "user", "ver": "1.0", "cmd": "OBJECT_GET_OSP"}',
      url_template: '',
      status: 'active',
      auto_sync: true,
      sync_interval_minutes: 15,
      speed_threshold: 50,
      description: ''
    });
  };

  const resetTestDates = () => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    setTestDates({
      start_date: yesterday.toISOString().split('T')[0],
      start_time: '00:00:00',
      end_date: now.toISOString().split('T')[0],
      end_time: now.toTimeString().split(' ')[0].slice(0, 5) + ':00'
    });
    setTestResult(null);
  };

  const handleCreate = () => {
    createMutation.mutate(formData);
  };

  const handleEditClick = (config) => {
    setSelectedConfig(config);
    setFormData({
      name: config.name || '',
      tracker_company_id: config.tracker_company_id?.toString() || '',
      api_url: config.api_url || '',
      api_key: config.api_key || '',
      api_type: config.api_type || 'esspl',
      api_params: typeof config.api_params === 'string' ? config.api_params : JSON.stringify(config.api_params || {}),
      url_template: config.url_template || '',
      status: config.status || 'active',
      auto_sync: config.auto_sync !== undefined ? config.auto_sync : true,
      sync_interval_minutes: config.sync_interval_minutes || 15,
      speed_threshold: config.speed_threshold ?? 50,
      description: config.description || ''
    });
    setIsEditConfirmDialogOpen(true);
  };

  const handleEditConfirm = () => {
    setIsEditConfirmDialogOpen(false);
    setIsEditDialogOpen(true);
  };

  const handleUpdate = () => {
    updateMutation.mutate({ id: selectedConfig.id, data: formData });
  };

  const handleDeleteClick = (config) => {
    setConfigToDelete(config);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (configToDelete) {
      deleteMutation.mutate(configToDelete.id);
    }
  };

  const handleTestClick = (config) => {
    setSelectedConfig(config);
    resetTestDates();
    setIsTestDialogOpen(true);
  };

  const handleTest = (saveToDb = false) => {
    if (!selectedConfig) return;
    
    const startDateTime = `${testDates.start_date} ${testDates.start_time}`;
    const endDateTime = `${testDates.end_date} ${testDates.end_time}`;
    
    testMutation.mutate({
      id: selectedConfig.id,
      start_date: startDateTime,
      end_date: endDateTime,
      save_to_db: saveToDb
    });
  };

  const getStatusBadge = (status, isHealthy) => {
    if (status === 'active' && isHealthy) {
      return <Badge className="bg-green-100 text-green-800">Active & Healthy</Badge>;
    } else if (status === 'active' && !isHealthy) {
      return <Badge className="bg-yellow-100 text-yellow-800">Active (Unhealthy)</Badge>;
    } else if (status === 'testing') {
      return <Badge className="bg-blue-100 text-blue-800">Testing</Badge>;
    } else {
      return <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate('/management')}
            className="inline-flex items-center mb-4 text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Management
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Tracking API Management</h1>
          <p className="text-gray-600 mt-1">Manage and configure external tracking API endpoints</p>
        </div>
        <Button onClick={() => { resetForm(); setIsCreateDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add API Configuration
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total APIs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{configs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active APIs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {configs.filter(c => c.status === 'active').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Healthy APIs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {configs.filter(c => c.is_healthy).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Auto Sync Enabled</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {configs.filter(c => c.auto_sync).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* API Configs Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>API Configurations</CardTitle>
              <CardDescription>Manage your tracking API endpoints</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {fetchError ? (
            <div className="text-center py-8">
              <div className="text-red-600 mb-2">❌ Error loading API configurations</div>
              <div className="text-sm text-gray-600 mb-4">{fetchError.message || 'Unknown error occurred'}</div>
              <Button onClick={() => refetch()} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          ) : isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : configs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="mb-4">No API configurations found.</div>
              <div className="text-sm">Click "Add API Configuration" to get started.</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">Name</th>
                    <th className="text-left p-3">Company</th>
                    <th className="text-left p-3">API URL</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Last Sync</th>
                    <th className="text-left p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {configs.map((config) => (
                    <tr key={config.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <div className="font-medium">{config.name}</div>
                        {config.description && (
                          <div className="text-sm text-gray-500">{config.description}</div>
                        )}
                      </td>
                      <td className="p-3">{config.tracker_company_name || 'N/A'}</td>
                      <td className="p-3">
                        <div className="text-sm text-gray-600 max-w-xs truncate">{config.api_url}</div>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-col gap-1">
                          {getStatusBadge(config.status, config.is_healthy)}
                          {config.auto_sync && (
                            <Badge variant="outline" className="text-xs">Auto Sync</Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="text-sm">
                          {formatDate(config.last_successful_sync_at)}
                        </div>
                        {config.last_sync_status === 'failed' && (
                          <div className="text-xs text-red-600 mt-1">
                            Error: {config.last_sync_error || 'Unknown error'}
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTestClick(config)}
                            disabled={testMutation.isPending}
                            title="Test API Connection"
                          >
                            <TestTube className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditClick(config)}
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteClick(config)}
                            disabled={deleteMutation.isPending}
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Tracking API Configuration</DialogTitle>
            <DialogDescription>
              Configure a new external tracking API endpoint to fetch vehicle tracking data
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">API Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., ESSPL Main API"
              />
            </div>
            <div>
              <Label htmlFor="tracker_company_id">Tracker Company *</Label>
              <Select
                value={formData.tracker_company_id}
                onValueChange={(value) => setFormData({ ...formData, tracker_company_id: value })}
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
            <div>
              <Label htmlFor="api_url">API URL *</Label>
              <Input
                id="api_url"
                value={formData.api_url}
                onChange={(e) => setFormData({ ...formData, api_url: e.target.value })}
                placeholder="http://tracking.company.com/api/api.php"
              />
            </div>
            <div>
              <Label htmlFor="api_key">API Key *</Label>
              <div className="relative">
                <Input
                  id="api_key"
                  type={showApiKey['new'] ? 'text' : 'password'}
                  value={formData.api_key}
                  onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                  placeholder="Enter API key"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey({ ...showApiKey, 'new': !showApiKey['new'] })}
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                >
                  {showApiKey['new'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label htmlFor="api_type">API Type *</Label>
              <Select
                value={formData.api_type}
                onValueChange={(value) => setFormData({ ...formData, api_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="esspl">ESSPL Format</SelectItem>
                  <SelectItem value="standard">Standard Format</SelectItem>
                  <SelectItem value="custom">Custom Format</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="api_params">API Parameters (JSON)</Label>
              <Textarea
                id="api_params"
                value={formData.api_params}
                onChange={(e) => setFormData({ ...formData, api_params: e.target.value })}
                placeholder='{"api": "user", "ver": "1.0", "cmd": "OBJECT_GET_OSP"}'
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="url_template">Custom URL Template (Optional)</Label>
              <Input
                id="url_template"
                value={formData.url_template}
                onChange={(e) => setFormData({ ...formData, url_template: e.target.value })}
                placeholder="{baseUrl}?api={api}&key={apiKey}&start={startDate}&end={endDate}"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="testing">Testing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="sync_interval_minutes">Sync Interval (minutes)</Label>
                <Input
                  id="sync_interval_minutes"
                  type="number"
                  value={formData.sync_interval_minutes}
                  onChange={(e) => setFormData({ ...formData, sync_interval_minutes: parseInt(e.target.value) || 15 })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="speed_threshold">Speed Threshold (km/h) *</Label>
              <Input
                id="speed_threshold"
                type="number"
                min={1}
                value={formData.speed_threshold}
                onChange={(e) => setFormData({ ...formData, speed_threshold: parseInt(e.target.value) || 50 })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Only speeds greater than this value are saved (e.g. 50 keeps 51+).
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="auto_sync"
                checked={formData.auto_sync}
                onCheckedChange={(checked) => setFormData({ ...formData, auto_sync: checked })}
              />
              <Label htmlFor="auto_sync">Enable Auto Sync</Label>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description or notes"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Configuration'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Confirmation Dialog */}
      <AlertDialog open={isEditConfirmDialogOpen} onOpenChange={setIsEditConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Edit</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to edit the API configuration "{selectedConfig?.name}"? 
              This will allow you to modify the configuration settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedConfig(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleEditConfirm}>Yes, Edit</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Tracking API Configuration</DialogTitle>
            <DialogDescription>
              Update the tracking API endpoint configuration
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-name">API Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-tracker_company_id">Tracker Company *</Label>
              <Select
                value={formData.tracker_company_id}
                onValueChange={(value) => setFormData({ ...formData, tracker_company_id: value })}
              >
                <SelectTrigger>
                  <SelectValue />
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
            <div>
              <Label htmlFor="edit-api_url">API URL *</Label>
              <Input
                id="edit-api_url"
                value={formData.api_url}
                onChange={(e) => setFormData({ ...formData, api_url: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-api_key">API Key *</Label>
              <div className="relative">
                <Input
                  id="edit-api_key"
                  type={showApiKey['edit'] ? 'text' : 'password'}
                  value={formData.api_key}
                  onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey({ ...showApiKey, 'edit': !showApiKey['edit'] })}
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                >
                  {showApiKey['edit'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label htmlFor="edit-api_type">API Type *</Label>
              <Select
                value={formData.api_type}
                onValueChange={(value) => setFormData({ ...formData, api_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="esspl">ESSPL Format</SelectItem>
                  <SelectItem value="standard">Standard Format</SelectItem>
                  <SelectItem value="custom">Custom Format</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-api_params">API Parameters (JSON)</Label>
              <Textarea
                id="edit-api_params"
                value={formData.api_params}
                onChange={(e) => setFormData({ ...formData, api_params: e.target.value })}
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="edit-url_template">Custom URL Template (Optional)</Label>
              <Input
                id="edit-url_template"
                value={formData.url_template}
                onChange={(e) => setFormData({ ...formData, url_template: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="testing">Testing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-sync_interval_minutes">Sync Interval (minutes)</Label>
                <Input
                  id="edit-sync_interval_minutes"
                  type="number"
                  value={formData.sync_interval_minutes}
                  onChange={(e) => setFormData({ ...formData, sync_interval_minutes: parseInt(e.target.value) || 15 })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-speed_threshold">Speed Threshold (km/h) *</Label>
              <Input
                id="edit-speed_threshold"
                type="number"
                min={1}
                value={formData.speed_threshold}
                onChange={(e) => setFormData({ ...formData, speed_threshold: parseInt(e.target.value) || 50 })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Only speeds greater than this value are saved (e.g. 50 keeps 51+).
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-auto_sync"
                checked={formData.auto_sync}
                onCheckedChange={(checked) => setFormData({ ...formData, auto_sync: checked })}
              />
              <Label htmlFor="edit-auto_sync">Enable Auto Sync</Label>
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); setSelectedConfig(null); }}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Updating...' : 'Update Configuration'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the API configuration "{configToDelete?.name}"? 
              This action cannot be undone and will permanently remove this configuration.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfigToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
              Yes, Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Test API Dialog with Date Range */}
      <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Test API Connection</DialogTitle>
            <DialogDescription>
              Test the API connection and fetch tracking data for a specific date/time range
            </DialogDescription>
          </DialogHeader>
          {selectedConfig && (
            <div className="space-y-4 py-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="font-semibold text-blue-900">Testing: {selectedConfig.name}</div>
                <div className="text-sm text-blue-700 mt-1">{selectedConfig.api_url}</div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_date">Start Date *</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={testDates.start_date}
                    onChange={(e) => setTestDates({ ...testDates, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="start_time">Start Time *</Label>
                  <Input
                    id="start_time"
                    type="time"
                    step="1"
                    value={testDates.start_time}
                    onChange={(e) => setTestDates({ ...testDates, start_time: e.target.value + ':00' })}
                  />
                </div>
                <div>
                  <Label htmlFor="end_date">End Date *</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={testDates.end_date}
                    onChange={(e) => setTestDates({ ...testDates, end_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="end_time">End Time *</Label>
                  <Input
                    id="end_time"
                    type="time"
                    step="1"
                    value={testDates.end_time}
                    onChange={(e) => setTestDates({ ...testDates, end_time: e.target.value + ':00' })}
                  />
                </div>
              </div>

              {testResult && (
                <div className={`p-4 rounded-lg ${testResult.error ? 'bg-red-50' : 'bg-green-50'}`}>
                  {testResult.error ? (
                    <div>
                      <div className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                        <XCircle className="w-5 h-5" />
                        Test Failed
                      </div>
                      <div className="text-sm text-red-700">{testResult.error}</div>
                    </div>
                  ) : (
                    <div>
                      <div className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5" />
                        Test Successful
                      </div>
                      {testResult.data && (
                        <div className="text-sm text-green-700 space-y-1">
                          <div><strong>Records Found:</strong> {testResult.data.recordCount || 0}</div>
                          {testResult.data.savedToDatabase && (
                            <div className="flex items-center gap-2 mt-2">
                              <Database className="w-4 h-4" />
                              <strong className="text-green-800">✓ Data saved to database</strong>
                            </div>
                          )}
                          {testResult.data.recordsSaved !== undefined && (
                            <div><strong>Records Saved:</strong> {testResult.data.recordsSaved}</div>
                          )}
                          {testResult.data.sampleRecord && (
                            <div className="mt-3 pt-3 border-t border-green-300">
                              <div className="text-xs font-semibold">Sample Record:</div>
                              <pre className="text-xs mt-1 overflow-auto max-h-32 bg-white p-2 rounded">
                                {JSON.stringify(testResult.data.sampleRecord, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsTestDialogOpen(false); setTestResult(null); }}>Close</Button>
            <Button 
              variant="outline" 
              onClick={() => handleTest(false)} 
              disabled={testMutation.isPending || !testDates.start_date || !testDates.end_date}
            >
              {testMutation.isPending ? 'Testing...' : 'Test Only'}
            </Button>
            <Button 
              onClick={() => handleTest(true)} 
              disabled={testMutation.isPending || !testDates.start_date || !testDates.end_date}
            >
              {testMutation.isPending ? 'Saving...' : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Test & Save to Database
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
