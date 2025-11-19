import React, { useState, useEffect, useRef } from 'react';
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
  Save,
  X,
  Circle,
  Square,
  Triangle
} from 'lucide-react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const GeofenceMap = () => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const geofenceLayerRef = useRef(null);
  const drawingLayerRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [drawingMode, setDrawingMode] = useState(null);
  const [currentGeofence, setCurrentGeofence] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [geofenceForm, setGeofenceForm] = useState({
    name: '',
    description: '',
    geometryType: 'circle',
    color: '#3b82f6',
    radius: 100
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch geofences
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
      setShowCreateDialog(false);
      setGeofenceForm({
        name: '',
        description: '',
        geometryType: 'circle',
        color: '#3b82f6',
        radius: 100
      });
      setCurrentGeofence(null);
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

  // Initialize map
  useEffect(() => {
    const initializeMap = () => {
      if (window.L && !mapInstanceRef.current) {
        // Create map
        mapInstanceRef.current = window.L.map('geofence-map', {
          center: [24.8607, 67.0011], // Karachi, Pakistan coordinates
          zoom: 10,
          zoomControl: true
        });

        // Add tile layer
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(mapInstanceRef.current);

        // Initialize geofence layer
        geofenceLayerRef.current = window.L.layerGroup().addTo(mapInstanceRef.current);
        drawingLayerRef.current = window.L.layerGroup().addTo(mapInstanceRef.current);

        setMapLoaded(true);
      }
    };

    // Wait for Leaflet to be available
    if (window.L) {
      initializeMap();
    } else {
      const checkLeaflet = setInterval(() => {
        if (window.L) {
          clearInterval(checkLeaflet);
          initializeMap();
        }
      }, 100);
      return () => clearInterval(checkLeaflet);
    }
  }, []);

  // Update geofences on map when data changes
  useEffect(() => {
    if (mapLoaded && geofences && geofenceLayerRef.current) {
      // Clear existing geofences
      geofenceLayerRef.current.clearLayers();

      // Add geofences to map
      geofences.forEach(geofence => {
        try {
          const coordinates = JSON.parse(geofence.coordinates);
          let layer;

          if (geofence.geometry_type === 'circle' && coordinates.center && coordinates.radius) {
            layer = window.L.circle([coordinates.center.lat, coordinates.center.lng], {
              radius: coordinates.radius,
              color: geofence.color || '#3b82f6',
              fillColor: geofence.color || '#3b82f6',
              fillOpacity: 0.2,
              weight: 2
            });
          } else if (geofence.geometry_type === 'polygon' && coordinates.points) {
            const latLngs = coordinates.points.map(point => [point.lat, point.lng]);
            layer = window.L.polygon(latLngs, {
              color: geofence.color || '#3b82f6',
              fillColor: geofence.color || '#3b82f6',
              fillOpacity: 0.2,
              weight: 2
            });
          }

          if (layer) {
            layer.bindPopup(`
              <div>
                <h3 class="font-semibold">${geofence.name}</h3>
                <p class="text-sm text-gray-600">${geofence.description || 'No description'}</p>
                <div class="mt-2 flex gap-2">
                  <button onclick="editGeofence(${geofence.id})" class="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600">Edit</button>
                  <button onclick="deleteGeofence(${geofence.id})" class="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600">Delete</button>
                </div>
              </div>
            `);
            geofenceLayerRef.current.addLayer(layer);
          }
        } catch (error) {
          console.error('Error parsing geofence coordinates:', error);
        }
      });
    }
  }, [mapLoaded, geofences]);

  // Drawing functions
  const startDrawing = (type) => {
    if (!mapInstanceRef.current) return;

    setDrawingMode(type);
    drawingLayerRef.current.clearLayers();

    if (type === 'circle') {
      let circle;
      const onMapClick = (e) => {
        if (!circle) {
          circle = window.L.circle([e.latlng.lat, e.latlng.lng], {
            radius: geofenceForm.radius,
            color: geofenceForm.color,
            fillColor: geofenceForm.color,
            fillOpacity: 0.2,
            weight: 2
          }).addTo(drawingLayerRef.current);

          const onMouseMove = (e) => {
            const radius = mapInstanceRef.current.distance(e.latlng, circle.getLatLng());
            circle.setRadius(radius);
          };

          mapInstanceRef.current.on('mousemove', onMouseMove);
          mapInstanceRef.current.on('click', () => {
            mapInstanceRef.current.off('mousemove', onMouseMove);
            mapInstanceRef.current.off('click', onMapClick);
            finishDrawing(circle, type);
          });
        }
      };

      mapInstanceRef.current.on('click', onMapClick);
    } else if (type === 'polygon') {
      const polygon = window.L.polygon([], {
        color: geofenceForm.color,
        fillColor: geofenceForm.color,
        fillOpacity: 0.2,
        weight: 2
      }).addTo(drawingLayerRef.current);

      const points = [];
      const onMapClick = (e) => {
        points.push([e.latlng.lat, e.latlng.lng]);
        polygon.setLatLngs(points);

        if (points.length >= 3) {
          mapInstanceRef.current.off('click', onMapClick);
          finishDrawing(polygon, type);
        }
      };

      mapInstanceRef.current.on('click', onMapClick);
    }
  };

  const finishDrawing = (layer, type) => {
    setDrawingMode(null);
    setCurrentGeofence({ layer, type });
    setShowCreateDialog(true);
  };

  const cancelDrawing = () => {
    setDrawingMode(null);
    drawingLayerRef.current.clearLayers();
    setCurrentGeofence(null);
  };

  const handleCreateGeofence = () => {
    if (!currentGeofence || !geofenceForm.name) return;

    let coordinates;
    if (currentGeofence.type === 'circle') {
      const center = currentGeofence.layer.getLatLng();
      const radius = currentGeofence.layer.getRadius();
      coordinates = {
        center: { lat: center.lat, lng: center.lng },
        radius: radius
      };
    } else if (currentGeofence.type === 'polygon') {
      const latLngs = currentGeofence.layer.getLatLngs()[0];
      coordinates = {
        points: latLngs.map(latLng => ({ lat: latLng.lat, lng: latLng.lng }))
      };
    }

    createGeofenceMutation.mutate({
      name: geofenceForm.name,
      description: geofenceForm.description,
      geometryType: currentGeofence.type,
      coordinates: JSON.stringify(coordinates),
      color: geofenceForm.color
    });
  };

  const handleDeleteGeofence = (geofenceId) => {
    if (window.confirm('Are you sure you want to delete this geofence?')) {
      deleteGeofenceMutation.mutate(geofenceId);
    }
  };

  // Global functions for popup buttons
  useEffect(() => {
    window.editGeofence = (id) => {
      // TODO: Implement edit functionality
      console.log('Edit geofence:', id);
    };

    window.deleteGeofence = (id) => {
      handleDeleteGeofence(id);
    };

    return () => {
      delete window.editGeofence;
      delete window.deleteGeofence;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Geofence Map
              </CardTitle>
              <CardDescription>
                Click on drawing tools to create geofences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Drawing Tools */}
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
                  <span className="text-sm font-semibold">Drawing Tools:</span>
                  <div className="flex items-center gap-2 ml-auto">
                    <Button
                      size="sm"
                      variant={drawingMode === 'circle' ? 'default' : 'outline'}
                      onClick={() => startDrawing('circle')}
                      disabled={drawingMode !== null && drawingMode !== 'circle'}
                      className="h-9"
                    >
                      <Circle className="h-4 w-4 mr-1" />
                      Circle
                    </Button>
                    <Button
                      size="sm"
                      variant={drawingMode === 'polygon' ? 'default' : 'outline'}
                      onClick={() => startDrawing('polygon')}
                      disabled={drawingMode !== null && drawingMode !== 'polygon'}
                      className="h-9"
                    >
                      <Square className="h-4 w-4 mr-1" />
                      Polygon
                    </Button>
                    {drawingMode && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={cancelDrawing}
                        className="h-9"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>

                {/* Map Container */}
                <div 
                  id="geofence-map" 
                  className="w-full h-[500px] rounded-lg border-2 border-muted"
                  style={{ minHeight: '500px' }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Geofences List */}
        <div className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Geofences ({geofences?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
                    <p className="text-sm text-muted-foreground">Loading geofences...</p>
                  </div>
                ) : error ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <AlertCircle className="h-6 w-6 text-red-600" />
                    </div>
                    <p className="text-sm font-semibold text-red-600 mb-1">Failed to load geofences</p>
                    <p className="text-xs text-muted-foreground mb-3">
                      {error?.message || 'Unable to fetch geofences'}
                    </p>
                    <Button onClick={() => refetch()} variant="outline" size="sm">
                      <RefreshCw className="mr-2 h-3 w-3" />
                      Retry
                    </Button>
                  </div>
                ) : geofences?.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                      <Shield className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium mb-1">No geofences created yet</p>
                    <p className="text-xs text-muted-foreground">
                      Use the drawing tools to create your first geofence
                    </p>
                  </div>
                ) : (
                  geofences?.map((geofence) => (
                    <div key={geofence.id} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <div 
                            className="w-4 h-4 rounded-full border-2 border-background shadow-sm mt-0.5 flex-shrink-0"
                            style={{ backgroundColor: geofence.color }}
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm mb-1 truncate">{geofence.name}</h4>
                            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                              {geofence.description || 'No description'}
                            </p>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {geofence.geometry_type}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteGeofence(geofence.id)}
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create Geofence Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Geofence</DialogTitle>
            <DialogDescription>
              Configure the geofence properties
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={geofenceForm.name}
                onChange={(e) => setGeofenceForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter geofence name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={geofenceForm.description}
                onChange={(e) => setGeofenceForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter geofence description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <Input
                  id="color"
                  type="color"
                  value={geofenceForm.color}
                  onChange={(e) => setGeofenceForm(prev => ({ ...prev, color: e.target.value }))}
                />
              </div>

              {currentGeofence?.type === 'circle' && (
                <div className="space-y-2">
                  <Label htmlFor="radius">Radius (meters)</Label>
                  <Input
                    id="radius"
                    type="number"
                    value={geofenceForm.radius}
                    onChange={(e) => setGeofenceForm(prev => ({ ...prev, radius: parseInt(e.target.value) }))}
                    min="10"
                    max="10000"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              onClick={() => setShowCreateDialog(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateGeofence}
              disabled={!geofenceForm.name || createGeofenceMutation.isPending}
            >
              {createGeofenceMutation.isPending ? 'Creating...' : 'Create Geofence'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GeofenceMap;
