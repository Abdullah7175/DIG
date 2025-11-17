import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  MapPin, 
  Plus, 
  Edit, 
  Trash2, 
  RefreshCw, 
  Shield,
  AlertCircle,
  CheckCircle,
  Clock,
  Navigation,
  Map
} from 'lucide-react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from '@/hooks/use-toast';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GeofenceMap from './GeofenceMap';

const Geofences = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingGeofence, setEditingGeofence] = useState(null);
  const [newGeofence, setNewGeofence] = useState({ 
    name: '', 
    description: '', 
    geometryType: 'circle',
    color: '#3b82f6'
  });

  // Fetch geofences using React Query
  const { data: geofences, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/tracking/geofences'],
    queryFn: () => apiRequest('/api/tracking/geofences'),
  });

  // Create geofence mutation
  const createGeofenceMutation = useMutation({
    mutationFn: async (geofenceData) => {
      return await apiRequest('/api/tracking/geofences', {
        method: 'POST',
        body: JSON.stringify(geofenceData)
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Geofence created successfully!",
      });
      setShowAddDialog(false);
      setNewGeofence({ 
        name: '', 
        description: '', 
        geometryType: 'circle',
        color: '#3b82f6'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tracking/geofences'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || 'Failed to create geofence',
        variant: "destructive",
      });
    }
  });

  // Delete geofence mutation
  const deleteGeofenceMutation = useMutation({
    mutationFn: async (geofenceId) => {
      return await apiRequest(`/api/tracking/geofences/${geofenceId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Geofence deleted successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tracking/geofences'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || 'Failed to delete geofence',
        variant: "destructive",
      });
    }
  });

  const handleAddGeofence = () => {
    if (!newGeofence.name) return;
    
    createGeofenceMutation.mutate({
      name: newGeofence.name,
      description: newGeofence.description,
      geometryType: newGeofence.geometryType,
      coordinates: JSON.stringify({ center: { lat: 28.6139, lng: 77.2090 }, radius: 100 }),
      color: newGeofence.color
    });
  };

  const handleDeleteGeofence = (geofenceId) => {
    if (window.confirm('Are you sure you want to delete this geofence?')) {
      deleteGeofenceMutation.mutate(geofenceId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Geofence Management</h2>
          <p className="text-muted-foreground">
            Create and manage geofenced areas for vehicle tracking
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="map" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="map" className="flex items-center gap-2">
            <Map className="h-4 w-4" />
            Map View
          </TabsTrigger>
          <TabsTrigger value="list" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            List View
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="map" className="space-y-4">
          <GeofenceMap />
        </TabsContent>
        
        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Geofences ({geofences?.length || 0})
              </CardTitle>
              <CardDescription>
                Manage your geofenced areas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading geofences...</p>
                  </div>
                ) : error ? (
                  <div className="text-center py-8">
                    <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
                    <p className="text-red-600">Failed to load geofences</p>
                  </div>
                ) : geofences?.length === 0 ? (
                  <div className="text-center py-8">
                    <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Geofences Found</h3>
                    <p className="text-muted-foreground mb-4">
                      Create your first geofence to get started with area monitoring.
                    </p>
                    <Button onClick={() => setShowAddDialog(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Geofence
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {geofences?.map((geofence) => (
                      <Card key={geofence.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-4 h-4 rounded-full border"
                              style={{ backgroundColor: geofence.color }}
                            />
                            <div>
                              <h4 className="font-semibold">{geofence.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {geofence.description || 'No description'}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {geofence.geometry_type}
                                </Badge>
                                {geofence.created_at && (
                                  <span className="text-xs text-muted-foreground">
                                    Created: {new Date(geofence.created_at).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingGeofence(geofence);
                                setShowEditDialog(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteGeofence(geofence.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Geofences;