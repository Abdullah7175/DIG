import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Truck, User, Users, FileUp, Check, Calendar } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getUser, isAuthenticated } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

const vehicleSchema = z.object({
  vehicle_register_number: z.string().min(1, "Vehicle register number is required"),
  registration_region: z.string().min(1, "Registration region is required"),
  vehicle_owner_name_on_book: z.string().min(1, "Vehicle owner name on book is required"),
  book_number: z.string().min(1, "Book number is required"),
  engine_number: z.string().min(1, "Engine number is required"),
  chassis_number: z.string().min(1, "Chassis number is required"),
  make_company: z.string().min(1, "Make company is required"),
  model_number: z.string().min(1, "Model number is required"),
  seating_capacity: z.number().min(1, "Seating capacity is required"),
  vehicle_category: z.string().min(1, "Vehicle category is required"),
  vehicle_body_color: z.string().min(1, "Vehicle body color is required"),
  wheels: z.number().min(3, "Number of wheels is required"),
  passenger_doors_emergency_exit: z.string().optional(),
  affiliated_with: z.string().optional(),
  // New dynamic fields
  vehicle_category_id: z.number().min(1, "Vehicle category is required"),
  vehicle_type_id: z.number().min(1, "Vehicle type is required"),
  fuel_type_id: z.number().min(1, "Fuel type is required"),
  terminal_id: z.number().optional(),
  route_id: z.number().optional(),
  tracker_company_id: z.number().optional(),
  tracker_link: z.string().optional(),
});

const ownerSchema = z.object({
  name: z.string().min(1, "Owner name is required"),
  cnic: z.string().min(13, "Valid CNIC is required"),
  contact: z.string().min(10, "Valid contact number is required"),
  address: z.string().optional(),
});

const driverSchema = z.object({
  name: z.string().min(1, "Driver name is required"),
  cnic: z.string().min(13, "Valid CNIC is required"),
  contact: z.string().min(10, "Valid contact number is required"),
  driving_license_number: z.string().min(1, "Driving license number is required"),
  driving_license_category: z.string().min(1, "Driving license category is required"),
  driving_license_expiry_date: z.string().min(1, "Driving license expiry date is required"),
});

const conductorSchema = z.object({
  name: z.string().min(1, "Conductor name is required"),
  cnic: z.string().min(13, "Valid CNIC is required"),
  contact: z.string().min(10, "Valid contact number is required"),
});

const formSchema = z.object({
  vehicle: vehicleSchema,
  owner: ownerSchema,
  driver: driverSchema,
  conductor: z.preprocess(
    (val, ctx) => {
      // Only validate conductor if vehicle_category is 'bus'
      if (ctx?.parent?.vehicle?.vehicle_category === 'bus') {
        return val;
      }
      // Otherwise, treat as undefined
      return undefined;
    },
    conductorSchema.optional()
  ),
  documents: z.object({
    owner_cnic_copy: z.boolean().default(false),
    vehicle_registration_book: z.boolean().default(false),
    vehicle_picture: z.boolean().default(false),
    vehicle_fitness_certificate: z.boolean().default(false),
    conductor_cnic: z.boolean().default(false),
    route_permit: z.boolean().default(false),
    route_noc: z.boolean().default(false),
    driver_cnic_copy: z.boolean().default(false),
    owner_driving_license_copy: z.boolean().default(false),
    driver_picture: z.boolean().default(false),
    conductor_picture: z.boolean().default(false),
  }),
});

export default function VehicleRegister() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Check authentication and role
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
      return;
    }
    const user = getUser();
    const userRole = user?.role;
    // Block role 3 (user) from accessing register page
    if (userRole === '3') {
      toast({
        title: "Access Denied",
        description: "Users with role 'user' cannot add or edit vehicles.",
        variant: "destructive",
      });
      navigate('/dashboard');
      return;
    }
  }, [navigate, toast]);

  // Add state for document files
  const [documentFiles, setDocumentFiles] = useState({});
  
  // Add state for dynamic data
  const [vehicleCategories, setVehicleCategories] = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [fuelTypes, setFuelTypes] = useState([]);
  const [terminals, setTerminals] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [trackerCompanies, setTrackerCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch dynamic data on component mount
  useEffect(() => {
    const fetchDynamicData = async () => {
      // Remove authentication check since we're using public endpoints now
      // if (!isAuthenticated()) {
      //   return;
      // }
      
      try {
        setLoading(true);
        const [categoriesRes, fuelTypesRes, terminalsRes, trackerCompaniesRes] = await Promise.all([
          apiRequest('GET', '/api/vehicle-categories/public?status=active'),
          apiRequest('GET', '/api/fuel-types/public?status=active'),
          apiRequest('GET', '/api/terminals/public?status=active'),
          apiRequest('GET', '/api/tracker-companies/public?status=active')
        ]);

        const categories = await categoriesRes.json();
        const fuelTypesData = await fuelTypesRes.json();
        const terminalsData = await terminalsRes.json();
        const trackerCompaniesData = await trackerCompaniesRes.json();

        setVehicleCategories(categories.categories || []);
        setFuelTypes(fuelTypesData.fuelTypes || []);
        setTerminals(terminalsData.terminals || []);
        setTrackerCompanies(trackerCompaniesData.trackerCompanies || []);
      } catch (error) {
        console.error('Error fetching dynamic data:', error);
        toast({
          title: "Error",
          description: "Failed to load form data. Please refresh the page.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDynamicData();
  }, [toast]);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vehicle: {
        vehicle_register_number: "",
        registration_region: "",
        vehicle_owner_name_on_book: "",
        book_number: "",
        engine_number: "",
        chassis_number: "",
        make_company: "",
        model_number: "",
        seating_capacity: 1,
        vehicle_category: "",
        vehicle_body_color: "",
        wheels: 4,
        passenger_doors_emergency_exit: "",
        affiliated_with: "",
        // New dynamic fields
        vehicle_category_id: undefined,
        vehicle_type_id: undefined,
        fuel_type_id: undefined,
        terminal_id: undefined,
        route_id: undefined,
        tracker_company_id: undefined,
        tracker_link: "",
      },
      owner: {
        name: "",
        cnic: "",
        contact: "",
        address: "",
      },
      driver: {
        name: "",
        cnic: "",
        contact: "",
        driving_license_number: "",
        driving_license_category: "",
        driving_license_expiry_date: "",
      },
      conductor: {
        name: "",
        cnic: "",
        contact: "",
      },
      documents: {
        owner_cnic_copy: false,
        vehicle_registration_book: false,
        vehicle_picture: false,
        vehicle_fitness_certificate: false,
        conductor_cnic: false,
        route_permit: false,
        route_noc: false,
        driver_cnic_copy: false,
        owner_driving_license_copy: false,
        driver_picture: false,
        conductor_picture: false,
      },
    },
  });

  // Watch form values for dynamic updates
  const selectedCategoryId = form.watch("vehicle.vehicle_category_id");
  const selectedTerminalId = form.watch("vehicle.terminal_id");
  const selectedCategory = vehicleCategories.find(cat => cat.id === selectedCategoryId);
  const isBusCategory = selectedCategory?.name?.toLowerCase() === 'bus';
  // Watch vehicle category for conditional conductor fields
  const vehicleCategory = selectedCategory?.name?.toLowerCase() || "";

  // Fetch vehicle types when category changes
  useEffect(() => {
    if (selectedCategoryId) {
      const fetchVehicleTypes = async () => {
        try {
          const response = await apiRequest('GET', `/api/vehicle-types/public?category_id=${selectedCategoryId}&status=active`);
          const data = await response.json();
          setVehicleTypes(data.vehicleTypes || []);
          // Reset vehicle type selection when category changes
          form.setValue("vehicle.vehicle_type_id", undefined);
        } catch (error) {
          console.error('Error fetching vehicle types:', error);
        }
      };
      fetchVehicleTypes();
    } else {
      setVehicleTypes([]);
      form.setValue("vehicle.vehicle_type_id", undefined);
    }
  }, [selectedCategoryId, form]);

  // Fetch routes when terminal changes and category is bus
  useEffect(() => {
    if (selectedTerminalId && isBusCategory) {
      const fetchRoutes = async () => {
        try {
          const response = await apiRequest('GET', `/api/routes/public?terminal_id=${selectedTerminalId}&status=active`);
          const data = await response.json();
          setRoutes(data.routes || []);
          // Reset route selection when terminal changes
          form.setValue("vehicle.route_id", undefined);
        } catch (error) {
          console.error('Error fetching routes:', error);
        }
      };
      fetchRoutes();
    } else {
      setRoutes([]);
      form.setValue("vehicle.route_id", undefined);
    }
  }, [selectedTerminalId, isBusCategory, form]);

  // Helper for handling file input changes
  const handleFileChange = (docKey, file) => {
    setDocumentFiles((prev) => ({ ...prev, [docKey]: file }));
  };

  const registerMutation = useMutation({
    mutationFn: async (data) => {
      console.log('Mutation triggered with FormData');
      // Log FormData contents for debugging
      if (data instanceof FormData) {
        console.log('FormData entries:');
        for (let [key, value] of data.entries()) {
          if (value instanceof File) {
            console.log(`${key}: File(${value.name}, ${value.size} bytes)`);
          } else {
            console.log(`${key}:`, value);
          }
        }
      }
      
      const response = await apiRequest("POST", "/api/vehicles/register", data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: (data) => {
      console.log('Registration successful:', data);
      toast({
        title: "✅ Vehicle Registration Successful!",
        description: `Vehicle ${data.vehicle?.vehicle_register_number || 'registration'} has been registered successfully and is now active.`,
        duration: 6000, // Show for 6 seconds
      });
      form.reset();
      setDocumentFiles({});
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      
      // Navigate to database page after a short delay to let user see the message
      setTimeout(() => {
        navigate('/database');
      }, 2000);
    },
    onError: (error) => {
      console.error('Mutation error', error);
      toast({
        title: "Error",
        description: error.message || "Failed to register vehicle",
        variant: "destructive",
      });
    },
  });

  // Update onSubmit to accept a draft flag
  const onSubmit = (data, isDraft = false) => {
    console.log('onSubmit called', { data, isDraft });
    
    // Get the selected category name for backward compatibility
    const selectedCategory = vehicleCategories.find(cat => cat.id === data.vehicle.vehicle_category_id);
    const categoryName = selectedCategory?.name?.toLowerCase() || "";
    
    // If not bus, set conductor and bus-only fields to null
    if (categoryName !== "bus") {
      delete data.conductor;
      data.vehicle.route_id = null;
    }
    
    // Remove any file input or DOM element references from data
    // Only keep serializable fields
    const cleanDocuments = {};
    Object.entries(data.documents).forEach(([key, value]) => {
      if (typeof value === 'boolean') {
        cleanDocuments[key] = value;
      }
    });
    
    // Build FormData
    const formData = new FormData();
    formData.append("vehicle", JSON.stringify(data.vehicle));
    formData.append("owner", JSON.stringify(data.owner));
    formData.append("driver", JSON.stringify(data.driver));
    if (categoryName === "bus") {
      formData.append("conductor", JSON.stringify(data.conductor));
    }
    formData.append("documents", JSON.stringify(cleanDocuments));
    formData.append("isDraft", JSON.stringify(isDraft));
    Object.entries(cleanDocuments).forEach(([docKey, checked]) => {
      if (checked && documentFiles[docKey]) {
        formData.append(`documentFiles[${docKey}]`, documentFiles[docKey]);
      }
    });
    registerMutation.mutate(formData);
  };

  // Add this debug log to the form submit event
  const handleFormSubmit = (e) => {
    console.log('Form onSubmit event triggered');
    e.preventDefault();
    form.handleSubmit(
      (data) => {
        console.log('Form validation passed, calling onSubmit with data:', data);
        onSubmit(data, false);
      },
      (errors) => {
        console.log('Validation errors:', errors);
        toast({
          title: "Validation Error",
          description: "Please check all required fields",
          variant: "destructive",
        });
      }
    )(e);
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center space-x-4 mb-4">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
            <Truck className="text-white text-2xl" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">COMMERCIAL VEHICLE INFORMATION-MANAGEMENT SYSTEM</h1>
            <p className="text-lg font-medium text-gray-700">CVI-MS Form</p>
            <p className="text-base text-gray-600">DIG Traffic Karachi</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <form
          onSubmit={handleFormSubmit}
          className="space-y-8"
        >
          
          {/* Vehicle Details Section */}
          <div className="bg-black text-white p-4 rounded-t-lg">
            <h2 className="text-lg font-semibold text-center">VEHICLE DETAILS</h2>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Label htmlFor="vehicle_register_number">Vehicle Register Number *</Label>
                <Input
                  id="vehicle_register_number"
                  placeholder="ABC-1234"
                  {...form.register("vehicle.vehicle_register_number")}
                  className="mt-2"
                />
                {form.formState.errors?.vehicle?.vehicle_register_number && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.vehicle.vehicle_register_number.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="registration_region">Registration Region *</Label>
                <Input
                  id="registration_region"
                  placeholder="Karachi"
                  {...form.register("vehicle.registration_region")}
                  className="mt-2"
                />
                {form.formState.errors?.vehicle?.registration_region && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.vehicle.registration_region.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="vehicle_owner_name_on_book">Vehicle Owner Name (on book) *</Label>
                <Input
                  id="vehicle_owner_name_on_book"
                  placeholder="John Doe"
                  {...form.register("vehicle.vehicle_owner_name_on_book")}
                  className="mt-2"
                />
                {form.formState.errors?.vehicle?.vehicle_owner_name_on_book && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.vehicle.vehicle_owner_name_on_book.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="book_number">Book Number *</Label>
                <Input
                  id="book_number"
                  placeholder="123456"
                  {...form.register("vehicle.book_number")}
                  className="mt-2"
                />
                {form.formState.errors?.vehicle?.book_number && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.vehicle.book_number.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="engine_number">Engine Number *</Label>
                <Input
                  id="engine_number"
                  placeholder="ABC123456789"
                  {...form.register("vehicle.engine_number")}
                  className="mt-2"
                />
                {form.formState.errors?.vehicle?.engine_number && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.vehicle.engine_number.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="chassis_number">Chassis Number *</Label>
                <Input
                  id="chassis_number"
                  placeholder="XYZ987654321"
                  {...form.register("vehicle.chassis_number")}
                  className="mt-2"
                />
                {form.formState.errors?.vehicle?.chassis_number && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.vehicle.chassis_number.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="make_company">Make Company *</Label>
                <Input
                  id="make_company"
                  placeholder="Toyota"
                  {...form.register("vehicle.make_company")}
                  className="mt-2"
                />
                {form.formState.errors?.vehicle?.make_company && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.vehicle.make_company.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="model_number">Model Number *</Label>
                <Input
                  id="model_number"
                  placeholder="Hiace 2024"
                  {...form.register("vehicle.model_number")}
                  className="mt-2"
                />
                {form.formState.errors?.vehicle?.model_number && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.vehicle.model_number.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="seating_capacity">Seating Capacity *</Label>
                <Input
                  id="seating_capacity"
                  type="number"
                  placeholder="15"
                  {...form.register("vehicle.seating_capacity", { valueAsNumber: true })}
                  className="mt-2"
                />
                {form.formState.errors?.vehicle?.seating_capacity && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.vehicle.seating_capacity.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="vehicle_category">Vehicle Category *</Label>
                <Select
                  value={form.watch("vehicle.vehicle_category_id")?.toString() || ""}
                  onValueChange={(value) => {
                    form.setValue("vehicle.vehicle_category_id", parseInt(value));
                    const category = vehicleCategories.find(cat => cat.id === parseInt(value));
                    form.setValue("vehicle.vehicle_category", category?.name || "");
                  }}
                  disabled={loading}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder={loading ? "Loading..." : "Select category"} />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicleCategories.map(category => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors?.vehicle?.vehicle_category_id && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.vehicle.vehicle_category_id.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="vehicle_type">Vehicle Type *</Label>
                <Select
                  value={form.watch("vehicle.vehicle_type_id")?.toString() || ""}
                  onValueChange={(value) => form.setValue("vehicle.vehicle_type_id", parseInt(value))}
                  disabled={!selectedCategoryId || loading}
                >
                  <SelectTrigger className="mt-2">
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
                {form.formState.errors?.vehicle?.vehicle_type_id && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.vehicle.vehicle_type_id.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="vehicle_body_color">Vehicle Body Color *</Label>
                <Input
                  id="vehicle_body_color"
                  placeholder="White"
                  {...form.register("vehicle.vehicle_body_color")}
                  className="mt-2"
                />
                {form.formState.errors?.vehicle?.vehicle_body_color && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.vehicle.vehicle_body_color.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="wheels">Wheels *</Label>
                <Input
                  id="wheels"
                  type="number"
                  placeholder="4"
                  {...form.register("vehicle.wheels", { valueAsNumber: true })}
                  className="mt-2"
                />
                {form.formState.errors?.vehicle?.wheels && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.vehicle.wheels.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="passenger_doors_emergency_exit">Passenger Doors / Emergency Exit</Label>
                <Input
                  id="passenger_doors_emergency_exit"
                  placeholder="2 doors, 1 emergency exit"
                  {...form.register("vehicle.passenger_doors_emergency_exit")}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="affiliated_with">Affiliated With</Label>
                <Input
                  id="affiliated_with"
                  placeholder="Organization or association name"
                  {...form.register("vehicle.affiliated_with")}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="fuel_type">Fuel Type *</Label>
                <Select
                  value={form.watch("vehicle.fuel_type_id")?.toString() || ""}
                  onValueChange={(value) => form.setValue("vehicle.fuel_type_id", parseInt(value))}
                  disabled={loading}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder={loading ? "Loading..." : "Select fuel type"} />
                  </SelectTrigger>
                  <SelectContent>
                    {fuelTypes.map(fuelType => (
                      <SelectItem key={fuelType.id} value={fuelType.id.toString()}>
                        {fuelType.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors?.vehicle?.fuel_type_id && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.vehicle.fuel_type_id.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="terminal">Terminal</Label>
                <Select
                  value={form.watch("vehicle.terminal_id")?.toString() || ""}
                  onValueChange={(value) => form.setValue("vehicle.terminal_id", parseInt(value))}
                  disabled={loading}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder={loading ? "Loading..." : "Select terminal"} />
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

              {/* Route fields only for bus */}
              {isBusCategory && (
                <div>
                  <Label htmlFor="route">Route *</Label>
                  <Select
                    value={form.watch("vehicle.route_id")?.toString() || ""}
                    onValueChange={(value) => form.setValue("vehicle.route_id", parseInt(value))}
                    disabled={!selectedTerminalId || loading}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder={!selectedTerminalId ? "Select terminal first" : "Select route"} />
                    </SelectTrigger>
                    <SelectContent>
                      {routes.map(route => (
                        <SelectItem key={route.id} value={route.id.toString()}>
                          {route.route_number} - {route.route_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors?.vehicle?.route_id && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.vehicle.route_id.message}
                    </p>
                  )}
                </div>
              )}

              {/* Route details display */}
              {form.watch("vehicle.route_id") && (
                <div className="col-span-full">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Selected Route Details:</h4>
                    {(() => {
                      const selectedRoute = routes.find(route => route.id === form.watch("vehicle.route_id"));
                      return selectedRoute ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Route Number:</span> {selectedRoute.route_number}
                          </div>
                          <div>
                            <span className="font-medium">Route Name:</span> {selectedRoute.route_name}
                          </div>
                          <div>
                            <span className="font-medium">Via:</span> {selectedRoute.route_area_via || "N/A"}
                          </div>
                        </div>
                      ) : null;
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tracker Details Section */}
          <div className="bg-gray-50 p-4">
            <h3 className="text-lg font-semibold mb-4">Tracker Information (Optional)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tracker_company">Tracker Company</Label>
                <Select
                  value={form.watch("vehicle.tracker_company_id")?.toString() || ""}
                  onValueChange={(value) => form.setValue("vehicle.tracker_company_id", parseInt(value))}
                  disabled={loading}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder={loading ? "Loading..." : "Select tracker company"} />
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

              <div>
                <Label htmlFor="tracker_link">Tracker Link</Label>
                <Input
                  id="tracker_link"
                  placeholder="https://tracker.example.com/vehicle/123"
                  {...form.register("vehicle.tracker_link")}
                  className="mt-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the live tracking URL for this vehicle
                </p>
              </div>
            </div>
          </div>

          {/* Owner Details Section */}
          <div className="bg-black text-white p-4">
            <h2 className="text-lg font-semibold text-center">OWNER DETAILS</h2>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Label htmlFor="owner_name">Owner Name *</Label>
                <Input
                  id="owner_name"
                  placeholder="John Doe"
                  {...form.register("owner.name")}
                  className="mt-2"
                />
                {form.formState.errors?.owner?.name && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.owner.name.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="owner_cnic">CNIC# *</Label>
                <Input
                  id="owner_cnic"
                  placeholder="12345-6789012-3"
                  {...form.register("owner.cnic")}
                  className="mt-2"
                />
                {form.formState.errors?.owner?.cnic && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.owner.cnic.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="owner_contact">Contact# *</Label>
                <Input
                  id="owner_contact"
                  placeholder="+92 300 1234567"
                  {...form.register("owner.contact")}
                  className="mt-2"
                />
                {form.formState.errors?.owner?.contact && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.owner.contact.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="owner_address">Address</Label>
                <Input
                  id="owner_address"
                  placeholder="123 Main St, Karachi"
                  {...form.register("owner.address")}
                  className="mt-2"
                />
              </div>
            </div>
          </div>

          {/* Driver Details Section */}
          <div className="bg-black text-white p-4">
            <h2 className="text-lg font-semibold text-center">DRIVER DETAILS</h2>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Label htmlFor="driver_name">Driver Name *</Label>
                <Input
                  id="driver_name"
                  placeholder="Ahmed Khan"
                  {...form.register("driver.name")}
                  className="mt-2"
                />
                {form.formState.errors?.driver?.name && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.driver.name.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="driver_cnic">CNIC# *</Label>
                <Input
                  id="driver_cnic"
                  placeholder="12345-6789012-3"
                  {...form.register("driver.cnic")}
                  className="mt-2"
                />
                {form.formState.errors?.driver?.cnic && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.driver.cnic.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="driver_contact">Contact# *</Label>
                <Input
                  id="driver_contact"
                  placeholder="+92 300 1234567"
                  {...form.register("driver.contact")}
                  className="mt-2"
                />
                {form.formState.errors?.driver?.contact && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.driver.contact.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="driving_license_number">Driving License Number *</Label>
                <Input
                  id="driving_license_number"
                  placeholder="KHI123456789"
                  {...form.register("driver.driving_license_number")}
                  className="mt-2"
                />
                {form.formState.errors?.driver?.driving_license_number && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.driver.driving_license_number.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="driving_license_category">Driving License Category *</Label>
                <Select
                  value={form.watch("driver.driving_license_category")}
                  onValueChange={(value) => form.setValue("driver.driving_license_category", value)}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LTV">LTV (Light Transport Vehicle)</SelectItem>
                    <SelectItem value="HTV">HTV (Heavy Transport Vehicle)</SelectItem>
                    <SelectItem value="PSV">PSV (Public Service Vehicle)</SelectItem>
                    <SelectItem value="MOTOR_CAR">Motor Car</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors?.driver?.driving_license_category && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.driver.driving_license_category.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="driving_license_expiry_date">Driving License Expiry Date *</Label>
                <Input
                  id="driving_license_expiry_date"
                  type="date"
                  {...form.register("driver.driving_license_expiry_date")}
                  className="mt-2"
                />
                {form.formState.errors?.driver?.driving_license_expiry_date && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.driver.driving_license_expiry_date.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Conductor Details Section */}
          {isBusCategory && (
            <>
              <div className="bg-black text-white p-4">
                <h2 className="text-lg font-semibold text-center">CONDUCTOR / HELPER DETAILS</h2>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <Label htmlFor="conductor_name">Helper Name</Label>
                    <Input
                      id="conductor_name"
                      placeholder="Ali Hassan"
                      {...form.register("conductor.name")}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="conductor_cnic">CNIC#</Label>
                    <Input
                      id="conductor_cnic"
                      placeholder="12345-6789012-3"
                      {...form.register("conductor.cnic")}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="conductor_contact">Contact#</Label>
                    <Input
                      id="conductor_contact"
                      placeholder="+92 300 1234567"
                      {...form.register("conductor.contact")}
                      className="mt-2"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Document Checklist */}
          <div className="p-6 space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Required Documents Checklist</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[
                { key: 'owner_cnic_copy', label: 'Owner CNIC Copy' },
                { key: 'vehicle_registration_book', label: 'Vehicle Registration Book Copy' },
                { key: 'vehicle_picture', label: 'Vehicle Picture' },
                { key: 'vehicle_fitness_certificate', label: 'Vehicle Fitness Certificate' },
                // Only show conductor_cnic and conductor_picture if bus
                ...(isBusCategory ? [
                  { key: 'conductor_cnic', label: 'Conductor CNIC' },
                ] : []),
                { key: 'route_permit', label: 'Route Permit' },
                { key: 'route_noc', label: 'Route NOC' },
                { key: 'driver_cnic_copy', label: 'Driver CNIC Copy' },
                { key: 'owner_driving_license_copy', label: 'Owner Driving License Copy' },
                { key: 'driver_picture', label: 'Driver Picture' },
                ...(isBusCategory ? [
                  { key: 'conductor_picture', label: 'Conductor Picture' },
                ] : []),
              ].map((doc) => (
                <div key={doc.key} className="flex flex-col space-y-1">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`doc_${doc.key}`}
                      checked={form.watch(`documents.${doc.key}`)}
                      onCheckedChange={(checked) => 
                        form.setValue(`documents.${doc.key}`, checked)
                      }
                    />
                    <Label htmlFor={`doc_${doc.key}`} className="text-sm">
                      {doc.label}
                    </Label>
                  </div>
                  {/* Show file input if checked */}
                  {form.watch(`documents.${doc.key}`) && (
                    <Input
                      type="file"
                      accept="image/*,application/pdf"
                      className="mt-1"
                      onChange={e => handleFileChange(doc.key, e.target.files[0])}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Confirmation */}
          <div className="p-6 border-t border-gray-200">
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">CONFIRMATION تصدیق</h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                "I hereby confirm that the above information is correct and true. I understand that I am fully responsible for the accuracy of the information 
                provided in this declaration, and I accept any consequences that may arise if any of the information is found to be incorrect or false."
              </p>
              <p className="text-sm text-gray-700 mt-2 leading-relaxed" dir="rtl">
                میں اس بات کی تصدیق کرتا ہوں کہ اوپر دی گئی معلومات درست اور صحیح ہیں۔ میں سمجھتا ہوں کہ اس اعلان میں فراہم کردہ معلومات کی درستگی کے لیے میں مکمل طور پر ذمہ دار ہوں اور اگر کوئی بھی معلومات غلط یا جھوٹی پائی جائیں تو میں اس کے نتائج کو قبول کرتا ہوں۔
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                <p>Applicant Signature & Stamp</p>
                <div className="border-b border-gray-300 w-48 mt-8"></div>
              </div>
              
              <div className="text-sm text-gray-600 text-right">
                <p>Dated</p>
                <div className="border-b border-gray-300 w-32 mt-8"></div>
              </div>
            </div>

            <div className="flex justify-end space-x-4 mt-8">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  console.log('Save as Draft button clicked');
                  form.handleSubmit((data) => onSubmit(data, true))();
                }}
              >
                Save as Draft
              </Button>
              <Button
                type="submit"
                disabled={registerMutation.isPending}
                className="bg-primary hover:bg-primary/90"
              >
                {registerMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Register Vehicle
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}