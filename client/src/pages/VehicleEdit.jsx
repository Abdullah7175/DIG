import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, Upload, X } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';

const VehicleEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Main vehicle state
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Dynamic data states
  const [vehicleCategories, setVehicleCategories] = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [fuelTypes, setFuelTypes] = useState([]);
  const [terminals, setTerminals] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [trackerCompanies, setTrackerCompanies] = useState([]);
  const [dynamicDataLoading, setDynamicDataLoading] = useState(true);
  
  // Form states
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [selectedTerminalId, setSelectedTerminalId] = useState(null);
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [selectedTrackerCompanyId, setSelectedTrackerCompanyId] = useState(null);
  
  // Document states
  const [documents, setDocuments] = useState([]);
  const [newDocuments, setNewDocuments] = useState({});
  
  // Fetch vehicle data
  useEffect(() => {
    const fetchVehicle = async () => {
      try {
        setLoading(true);
        const response = await apiRequest('GET', `/api/vehicles/${id}`);
        const data = await response.json();
        
        console.log('Fetched vehicle data:', data);
        setVehicle(data);
        setDocuments(data.documents || []);
        
        // Set form states
        setSelectedCategoryId(data.vehicle_category_id);
        setSelectedTerminalId(data.terminal_id);
        setSelectedRouteId(data.route_id);
        setSelectedTrackerCompanyId(data.tracker_company_id);
        
        // Initialize conductor if not exists but category is bus
        if (!data.conductor && data.vehicle_category_id) {
          // We'll check this after categories are loaded
        }
        
      } catch (error) {
        console.error('Error fetching vehicle:', error);
        toast({
          title: "Error",
          description: "Failed to fetch vehicle data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    if (id) {
      fetchVehicle();
    }
  }, [id]);
  
  // Fetch dynamic data
  useEffect(() => {
    const fetchDynamicData = async () => {
      try {
        setDynamicDataLoading(true);
        
        const [categoriesRes, fuelTypesRes, terminalsRes, trackerCompaniesRes] = await Promise.all([
          apiRequest('GET', '/api/vehicle-categories?status=active'),
          apiRequest('GET', '/api/fuel-types?status=active'),
          apiRequest('GET', '/api/terminals?status=active'),
          apiRequest('GET', '/api/tracker-companies?status=active')
        ]);
        
        const categories = await categoriesRes.json();
        const fuelTypesData = await fuelTypesRes.json();
        const terminalsData = await terminalsRes.json();
        const trackerCompaniesData = await trackerCompaniesRes.json();
        
        setVehicleCategories(categories.categories || []);
        setFuelTypes(fuelTypesData.fuelTypes || []);
        setTerminals(terminalsData.terminals || []);
        setTrackerCompanies(trackerCompaniesData.trackerCompanies || []);
        
        console.log('Dynamic data fetched:', {
          categories: categories.categories || [],
          fuelTypes: fuelTypesData.fuelTypes || [],
          terminals: terminalsData.terminals || [],
          trackerCompanies: trackerCompaniesData.trackerCompanies || []
        });
        
      } catch (error) {
        console.error('Error fetching dynamic data:', error);
        toast({
          title: "Error",
          description: "Failed to fetch dynamic data",
          variant: "destructive",
        });
      } finally {
        setDynamicDataLoading(false);
      }
    };
    
    fetchDynamicData();
  }, []);
  
  // Initialize conductor for bus vehicles
  useEffect(() => {
    if (vehicle && vehicleCategories.length > 0 && selectedCategoryId) {
      const category = vehicleCategories.find(cat => cat.id === selectedCategoryId);
      if (category?.name?.toLowerCase() === 'bus' && !vehicle.conductor) {
        setVehicle(prev => ({
          ...prev,
          conductor: {
            name: '',
            cnic: '',
            contact: ''
          }
        }));
      }
    }
  }, [vehicle, vehicleCategories, selectedCategoryId]);
  
  // Fetch vehicle types when category changes
  useEffect(() => {
    if (selectedCategoryId) {
      const fetchVehicleTypes = async () => {
        try {
          console.log('Fetching vehicle types for category:', selectedCategoryId);
          const response = await apiRequest('GET', `/api/vehicle-types/public?category_id=${selectedCategoryId}&status=active`);
          const data = await response.json();
          console.log('Vehicle types response:', data);
          setVehicleTypes(data.vehicleTypes || []);
          console.log('Vehicle types set:', data.vehicleTypes || []);
        } catch (error) {
          console.error('Error fetching vehicle types:', error);
        }
      };
      fetchVehicleTypes();
    } else {
      setVehicleTypes([]);
    }
  }, [selectedCategoryId]);
  
  // Fetch routes when terminal changes
  useEffect(() => {
    if (selectedTerminalId && selectedCategoryId) {
      const category = vehicleCategories.find(cat => cat.id === selectedCategoryId);
      if (category?.name?.toLowerCase() === 'bus') {
        const fetchRoutes = async () => {
          try {
            const response = await apiRequest('GET', `/api/routes/public?terminal_id=${selectedTerminalId}&status=active`);
            const data = await response.json();
            setRoutes(data.routes || []);
            console.log('Routes fetched for terminal', selectedTerminalId, ':', data.routes || []);
          } catch (error) {
            console.error('Error fetching routes:', error);
          }
        };
        fetchRoutes();
      } else {
        setRoutes([]);
        setSelectedRouteId(null);
      }
    } else {
      setRoutes([]);
      setSelectedRouteId(null);
    }
  }, [selectedTerminalId, selectedCategoryId, vehicleCategories]);
  
  // Handle form field changes
  const handleChange = (field, value) => {
    setVehicle(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Handle category change
  const handleCategoryChange = (categoryId) => {
    const categoryIdNum = parseInt(categoryId);
    setSelectedCategoryId(categoryIdNum);
    handleChange('vehicle_category_id', categoryIdNum);
    
    // Reset dependent fields
    setSelectedRouteId(null);
    handleChange('route_id', null);
  };
  
  // Handle vehicle type change
  const handleVehicleTypeChange = (typeId) => {
    const typeIdNum = parseInt(typeId);
    handleChange('vehicle_type_id', typeIdNum);
  };
  
  // Handle fuel type change
  const handleFuelTypeChange = (fuelTypeId) => {
    const fuelTypeIdNum = parseInt(fuelTypeId);
    handleChange('fuel_type_id', fuelTypeIdNum);
  };
  
  // Handle terminal change
  const handleTerminalChange = (terminalId) => {
    const terminalIdNum = parseInt(terminalId);
    setSelectedTerminalId(terminalIdNum);
    handleChange('terminal_id', terminalIdNum);
    
    // Reset route if terminal changes
    setSelectedRouteId(null);
    handleChange('route_id', null);
  };
  
  // Handle route change
  const handleRouteChange = (routeId) => {
    const routeIdNum = parseInt(routeId);
    setSelectedRouteId(routeIdNum);
    handleChange('route_id', routeIdNum);
  };
  
  // Handle tracker company change
  const handleTrackerCompanyChange = (trackerCompanyId) => {
    const trackerCompanyIdNum = parseInt(trackerCompanyId);
    setSelectedTrackerCompanyId(trackerCompanyIdNum);
    handleChange('tracker_company_id', trackerCompanyIdNum);
  };
  
  // Handle document upload
  const handleDocumentUpload = (documentType, file) => {
    setNewDocuments(prev => ({
      ...prev,
      [documentType]: file
    }));
  };
  
  // Handle document removal
  const handleDocumentRemove = (documentType) => {
    setNewDocuments(prev => {
      const newDocs = { ...prev };
      delete newDocs[documentType];
      return newDocs;
    });
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!vehicle) return;
    
    try {
      setSaving(true);
      
      // Prepare form data
      const formData = new FormData();
      
      // Add vehicle data
      formData.append('vehicle', JSON.stringify({
        ...vehicle,
        vehicle_category_id: selectedCategoryId,
        vehicle_type_id: vehicle.vehicle_type_id,
        fuel_type_id: vehicle.fuel_type_id,
        terminal_id: selectedTerminalId,
        route_id: selectedRouteId,
        tracker_company_id: selectedTrackerCompanyId,
        tracker_link: vehicle.tracker_link || ''
      }));
      
      // Add owner data
      formData.append('owner', JSON.stringify(vehicle.owner));
      
      // Add driver data
      formData.append('driver', JSON.stringify(vehicle.driver));
      
      // Add conductor data if exists
      if (vehicle.conductor) {
        formData.append('conductor', JSON.stringify(vehicle.conductor));
      }
      
      // Add documents: server expects an object map, not an array
      const documentsMap = {};
      Object.keys(newDocuments).forEach((key) => { documentsMap[key] = true; });
      formData.append('documents', JSON.stringify(documentsMap));
      
      // Add new document files
      Object.entries(newDocuments).forEach(([type, file]) => {
        formData.append(`documentFiles[${type}]`, file);
      });
      
      console.log('Submitting vehicle update:', {
        vehicle_category_id: selectedCategoryId,
        vehicle_type_id: vehicle.vehicle_type_id,
        fuel_type_id: vehicle.fuel_type_id,
        terminal_id: selectedTerminalId,
        route_id: selectedRouteId,
        tracker_company_id: selectedTrackerCompanyId,
        tracker_link: vehicle.tracker_link
      });
      
      const response = await apiRequest('PATCH', `/api/vehicles/${id}`, formData);
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Vehicle updated successfully",
        });
        navigate('/database');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update vehicle');
      }
      
    } catch (error) {
      console.error('Error updating vehicle:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update vehicle",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-lg">Loading vehicle data...</p>
        </div>
      </div>
    );
  }
  
  if (!vehicle) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Vehicle not found</h1>
          <p className="mt-2 text-gray-600">The vehicle you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/database')} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Database
          </Button>
        </div>
      </div>
    );
  }
  
  const isBusCategory = vehicleCategories.find(cat => cat.id === selectedCategoryId)?.name?.toLowerCase() === 'bus';
  const selectedRoute = routes.find(route => route.id === selectedRouteId);
  
  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => navigate('/database')}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Database</span>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Vehicle</h1>
            <p className="text-gray-600">Update vehicle information and documents</p>
          </div>
        </div>
        <Badge variant={vehicle.status === 'active' ? 'default' : 'secondary'}>
          {vehicle.status}
        </Badge>
      </div>
      
      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="basic" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Vehicle Info</TabsTrigger>
            <TabsTrigger value="dynamic">Vehicle Details</TabsTrigger>
            <TabsTrigger value="people">Drivers & Owners</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>
          
          {/* Basic Information Tab */}
          <TabsContent value="basic" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Vehicle Information</CardTitle>
                <CardDescription>Basic vehicle details and specifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="vehicle_register_number">Registration Number</Label>
                    <Input
                      id="vehicle_register_number"
                      value={vehicle.vehicle_register_number || ''}
                      onChange={(e) => handleChange('vehicle_register_number', e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="registration_region">Registration Region</Label>
                    <Input
                      id="registration_region"
                      value={vehicle.registration_region || ''}
                      onChange={(e) => handleChange('registration_region', e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="vehicle_owner_name_on_book">Owner Name on Book</Label>
                    <Input
                      id="vehicle_owner_name_on_book"
                      value={vehicle.vehicle_owner_name_on_book || ''}
                      onChange={(e) => handleChange('vehicle_owner_name_on_book', e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="book_number">Book Number</Label>
                    <Input
                      id="book_number"
                      value={vehicle.book_number || ''}
                      onChange={(e) => handleChange('book_number', e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="engine_number">Engine Number</Label>
                    <Input
                      id="engine_number"
                      value={vehicle.engine_number || ''}
                      onChange={(e) => handleChange('engine_number', e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="chassis_number">Chassis Number</Label>
                    <Input
                      id="chassis_number"
                      value={vehicle.chassis_number || ''}
                      onChange={(e) => handleChange('chassis_number', e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="make_company">Make Company</Label>
                    <Input
                      id="make_company"
                      value={vehicle.make_company || ''}
                      onChange={(e) => handleChange('make_company', e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="model_number">Model Number</Label>
                    <Input
                      id="model_number"
                      value={vehicle.model_number || ''}
                      onChange={(e) => handleChange('model_number', e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="seating_capacity">Seating Capacity</Label>
                    <Input
                      id="seating_capacity"
                      type="number"
                      value={vehicle.seating_capacity || ''}
                      onChange={(e) => handleChange('seating_capacity', parseInt(e.target.value) || null)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="vehicle_body_color">Body Color</Label>
                    <Input
                      id="vehicle_body_color"
                      value={vehicle.vehicle_body_color || ''}
                      onChange={(e) => handleChange('vehicle_body_color', e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="wheels">Wheels</Label>
                    <Input
                      id="wheels"
                      type="number"
                      value={vehicle.wheels || ''}
                      onChange={(e) => handleChange('wheels', parseInt(e.target.value) || null)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="passenger_doors_emergency_exit">Passenger Doors/Emergency Exit</Label>
                    <Input
                      id="passenger_doors_emergency_exit"
                      value={vehicle.passenger_doors_emergency_exit || ''}
                      onChange={(e) => handleChange('passenger_doors_emergency_exit', e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="affiliated_with">Affiliated With</Label>
                    <Input
                      id="affiliated_with"
                      value={vehicle.affiliated_with || ''}
                      onChange={(e) => handleChange('affiliated_with', e.target.value)}
                      placeholder="Organization or association name"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Dynamic Fields Tab */}
          <TabsContent value="dynamic" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Vehicle Details</CardTitle>
                <CardDescription>Category, type, fuel, terminal, route, and tracker information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Vehicle Category */}
                  <div className="space-y-2">
                    <Label>Vehicle Category</Label>
                    <Select
                      value={selectedCategoryId ? selectedCategoryId.toString() : ""}
                      onValueChange={handleCategoryChange}
                      disabled={dynamicDataLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={dynamicDataLoading ? "Loading..." : "Select category"} />
                      </SelectTrigger>
                      <SelectContent>
                        {vehicleCategories.map(category => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Vehicle Type */}
                  <div className="space-y-2">
                    <Label>Vehicle Type</Label>
                    <Select
                      value={vehicle.vehicle_type_id ? vehicle.vehicle_type_id.toString() : ""}
                      onValueChange={handleVehicleTypeChange}
                      disabled={dynamicDataLoading || !selectedCategoryId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={!selectedCategoryId ? "Select category first" : "Select type"} />
                      </SelectTrigger>
                      <SelectContent>
                        {vehicleTypes.map(type => (
                          <SelectItem key={type.id} value={type.id.toString()}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Fuel Type */}
                  <div className="space-y-2">
                    <Label>Fuel Type</Label>
                    <Select
                      value={vehicle.fuel_type_id ? vehicle.fuel_type_id.toString() : ""}
                      onValueChange={handleFuelTypeChange}
                      disabled={dynamicDataLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={dynamicDataLoading ? "Loading..." : "Select fuel type"} />
                      </SelectTrigger>
                      <SelectContent>
                        {fuelTypes.map(fuelType => (
                          <SelectItem key={fuelType.id} value={fuelType.id.toString()}>
                            {fuelType.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Terminal */}
                  <div className="space-y-2">
                    <Label>Terminal</Label>
                    <Select
                      value={selectedTerminalId ? selectedTerminalId.toString() : ""}
                      onValueChange={handleTerminalChange}
                      disabled={dynamicDataLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={dynamicDataLoading ? "Loading..." : "Select terminal"} />
                      </SelectTrigger>
                      <SelectContent>
                        {terminals.map(terminal => (
                          <SelectItem key={terminal.id} value={terminal.id.toString()}>
                            {terminal.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Route (only for buses) */}
                  {isBusCategory && selectedTerminalId && (
                    <div className="space-y-2">
                      <Label>Route</Label>
                      <Select
                        value={selectedRouteId ? selectedRouteId.toString() : ""}
                        onValueChange={handleRouteChange}
                        disabled={dynamicDataLoading}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={dynamicDataLoading ? "Loading..." : "Select route"} />
                        </SelectTrigger>
                        <SelectContent>
                          {routes.map(route => (
                            <SelectItem key={route.id} value={route.id.toString()}>
                              {route.route_number} - {route.route_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  {/* Tracker Company */}
                  <div className="space-y-2">
                    <Label>Tracker Company</Label>
                    <Select
                      value={selectedTrackerCompanyId ? selectedTrackerCompanyId.toString() : ""}
                      onValueChange={handleTrackerCompanyChange}
                      disabled={dynamicDataLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={dynamicDataLoading ? "Loading..." : "Select tracker company"} />
                      </SelectTrigger>
                      <SelectContent>
                        {trackerCompanies.map(company => (
                          <SelectItem key={company.id} value={company.id.toString()}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Tracker Link */}
                  <div className="space-y-2">
                    <Label htmlFor="tracker_link">Tracker Link</Label>
                    <Input
                      id="tracker_link"
                      value={vehicle.tracker_link || ''}
                      onChange={(e) => handleChange('tracker_link', e.target.value)}
                      placeholder="Enter tracker link URL"
                    />
                  </div>
                </div>
                
                {/* Route Details Display */}
                {selectedRoute && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">Route Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                      <div><strong>Route Number:</strong> {selectedRoute.route_number}</div>
                      <div><strong>Route Name:</strong> {selectedRoute.route_name}</div>
                      <div><strong>Area Via:</strong> {selectedRoute.route_area_via || 'N/A'}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* People Tab */}
          <TabsContent value="people" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Owner Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="owner_name">Owner Name</Label>
                    <Input
                      id="owner_name"
                      value={vehicle.owner?.name || ''}
                      onChange={(e) => handleChange('owner', { ...vehicle.owner, name: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="owner_cnic">Owner CNIC</Label>
                    <Input
                      id="owner_cnic"
                      value={vehicle.owner?.cnic || ''}
                      onChange={(e) => handleChange('owner', { ...vehicle.owner, cnic: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="owner_contact">Owner Contact</Label>
                    <Input
                      id="owner_contact"
                      value={vehicle.owner?.contact || ''}
                      onChange={(e) => handleChange('owner', { ...vehicle.owner, contact: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="owner_address">Owner Address</Label>
                    <Textarea
                      id="owner_address"
                      value={vehicle.owner?.address || ''}
                      onChange={(e) => handleChange('owner', { ...vehicle.owner, address: e.target.value })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Driver Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="driver_name">Driver Name</Label>
                    <Input
                      id="driver_name"
                      value={vehicle.driver?.name || ''}
                      onChange={(e) => handleChange('driver', { ...vehicle.driver, name: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="driver_cnic">Driver CNIC</Label>
                    <Input
                      id="driver_cnic"
                      value={vehicle.driver?.cnic || ''}
                      onChange={(e) => handleChange('driver', { ...vehicle.driver, cnic: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="driver_contact">Driver Contact</Label>
                    <Input
                      id="driver_contact"
                      value={vehicle.driver?.contact || ''}
                      onChange={(e) => handleChange('driver', { ...vehicle.driver, contact: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="driving_license_number">Driving License Number</Label>
                    <Input
                      id="driving_license_number"
                      value={vehicle.driver?.driving_license_number || ''}
                      onChange={(e) => handleChange('driver', { ...vehicle.driver, driving_license_number: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="driving_license_category">License Category</Label>
                    <Input
                      id="driving_license_category"
                      value={vehicle.driver?.driving_license_category || ''}
                      onChange={(e) => handleChange('driver', { ...vehicle.driver, driving_license_category: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="driving_license_expiry_date">License Expiry Date</Label>
                    <Input
                      id="driving_license_expiry_date"
                      type="date"
                      value={vehicle.driver?.driving_license_expiry_date ? new Date(vehicle.driver.driving_license_expiry_date).toISOString().split('T')[0] : ''}
                      onChange={(e) => handleChange('driver', { ...vehicle.driver, driving_license_expiry_date: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Conductor Section - Show for buses */}
            {isBusCategory && (
              <Card>
                <CardHeader>
                  <CardTitle>Conductor Information</CardTitle>
                  <CardDescription>Required for bus vehicles</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="conductor_name">Conductor Name</Label>
                      <Input
                        id="conductor_name"
                        value={vehicle.conductor?.name || ''}
                        onChange={(e) => handleChange('conductor', { ...vehicle.conductor, name: e.target.value })}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="conductor_cnic">Conductor CNIC</Label>
                      <Input
                        id="conductor_cnic"
                        value={vehicle.conductor?.cnic || ''}
                        onChange={(e) => handleChange('conductor', { ...vehicle.conductor, cnic: e.target.value })}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="conductor_contact">Conductor Contact</Label>
                      <Input
                        id="conductor_contact"
                        value={vehicle.conductor?.contact || ''}
                        onChange={(e) => handleChange('conductor', { ...vehicle.conductor, contact: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Vehicle Documents</CardTitle>
                <CardDescription>Upload and manage vehicle documents</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Existing Documents */}
                {documents.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="font-semibold">Existing Documents</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {documents.map((doc, index) => (
                        <div key={index} className="p-4 border rounded-lg">
                          <div className="space-y-2">
                            <h5 className="font-medium capitalize">{doc.document_type.replace('_', ' ')}</h5>
                            
                            {/* Image Preview */}
                            {doc.file_path && (
                              <div className="relative">
                                <img
                                  src={doc.file_path}
                                  alt={doc.document_type}
                                  className="w-full h-32 object-cover rounded border"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'block';
                                  }}
                                />
                                <div className="hidden w-full h-32 bg-gray-100 rounded border flex items-center justify-center text-gray-500">
                                  <div className="text-center">
                                    <Upload className="w-8 h-8 mx-auto mb-2" />
                                    <p className="text-sm">Document Preview</p>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            <div className="flex items-center justify-between">
                              <p className="text-sm text-gray-600 truncate">{doc.file_path}</p>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(doc.file_path, '_blank')}
                              >
                                <Upload className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Document Upload */}
                <div className="space-y-4">
                  <h4 className="font-semibold">Upload New Documents</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      'vehicle_picture', 
                      'vehicle_registration_book', 
                      'owner_cnic_copy', 
                      'driver_license_copy', 
                      'conductor_cnic_copy',
                      'vehicle_fitness_certificate',
                      'route_permit',
                      'route_noc',
                      'owner_driving_license_copy',
                      'driver_picture'
                    ].map((docType) => (
                      <div key={docType} className="space-y-2">
                        <Label htmlFor={docType}>
                          {docType === 'vehicle_picture' && 'Vehicle Picture'}
                          {docType === 'vehicle_registration_book' && 'Vehicle Registration Book Copy'}
                          {docType === 'owner_cnic_copy' && 'Owner CNIC Copy'}
                          {docType === 'driver_license_copy' && 'Driver License Copy'}
                          {docType === 'conductor_cnic_copy' && 'Conductor CNIC Copy'}
                          {docType === 'vehicle_fitness_certificate' && 'Vehicle Fitness Certificate'}
                          {docType === 'route_permit' && 'Route Permit'}
                          {docType === 'route_noc' && 'Route NOC'}
                          {docType === 'owner_driving_license_copy' && 'Owner Driving License Copy'}
                          {docType === 'driver_picture' && 'Driver Picture'}
                        </Label>
                        
                        {/* File Input */}
                        <div className="flex items-center space-x-2">
                          <Input
                            id={docType}
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(e) => {
                              if (e.target.files[0]) {
                                handleDocumentUpload(docType, e.target.files[0]);
                              }
                            }}
                          />
                          {newDocuments[docType] && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDocumentRemove(docType)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                        
                        {/* New Document Preview */}
                        {newDocuments[docType] && (
                          <div className="space-y-2">
                            <p className="text-sm text-green-600">
                              Selected: {newDocuments[docType].name}
                            </p>
                            {newDocuments[docType].type.startsWith('image/') && (
                              <div className="relative">
                                <img
                                  src={URL.createObjectURL(newDocuments[docType])}
                                  alt="Preview"
                                  className="w-full h-32 object-cover rounded border"
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* Submit Button */}
        <div className="flex justify-end space-x-4 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/database')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={saving || dynamicDataLoading}
            className="flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </Button>
        </div>
      </form>
    </div>
  );
};

export default VehicleEdit;