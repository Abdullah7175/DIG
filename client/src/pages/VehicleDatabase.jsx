import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Download, Eye, Edit, QrCode, Check, X, Truck, Bus, RotateCcw, Ban, CheckCircle2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import QRModal from "@/components/QRModal";
import { useNavigate } from "react-router-dom";
import { getUser } from "@/lib/utils";

export default function VehicleDatabase() {
  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [selectedQR, setSelectedQR] = useState(null);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [selectedVehicles, setSelectedVehicles] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  // Track recent mutations to prevent refetches from overwriting updates
  const recentMutationRef = useRef(new Set());
  
  // Get current user to check role
  const user = getUser();
  const isManagerOrAdmin = user && (user.role === '1' || user.role === '2'); // 1 = admin, 2 = manager
  const isConsultant = user && user.role === '4'; // 4 = consultant
  const isUser = user && user.role === '3'; // 3 = user (cannot add/edit)
  const canEditVehicles = user && (user.role === '1' || user.role === '2' || user.role === '4'); // admin, manager, or consultant

  // Fetch vehicle types on component mount
  useEffect(() => {
    const fetchVehicleTypes = async () => {
      try {
        const response = await apiRequest('GET', '/api/vehicle-types/public?status=active');
        const data = await response.json();
        setVehicleTypes(data.vehicleTypes || []);
      } catch (error) {
        console.error('Error fetching vehicle types:', error);
      }
    };
    fetchVehicleTypes();
  }, []);

  const handleSearch = () => {
    setActiveSearch(searchInput.trim());
    setPage(1); // Reset to page 1 when search is triggered
  };

  const handleResetFilters = () => {
    setSearchInput("");
    setActiveSearch("");
    setTypeFilter("");
    setStatusFilter("");
    setPage(1);
  };

  const { data: vehiclesData, isLoading, error } = useQuery({
    queryKey: ["/api/vehicles", { 
      search: activeSearch || undefined, 
      type: typeFilter && typeFilter !== "all" ? typeFilter : undefined, 
      status: statusFilter && statusFilter !== "all" ? statusFilter : undefined, 
      page: page || 1,
      limit: 20 // Add limit for better performance
    }],
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
    cacheTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnMount: false, // Don't auto-refetch on mount - we'll handle updates manually
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: false, // Don't refetch on reconnect
    retry: 1, // Retry once on failure
    retryDelay: 1000, // Wait 1 second before retry
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      const response = await apiRequest("PATCH", `/api/vehicles/${id}/status`, { status });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    },
    // Optimistic update - immediately update the UI
    onMutate: async ({ id, status }) => {
      // Mark this mutation as recent to prevent refetches
      const mutationId = `${id}-${Date.now()}`;
      recentMutationRef.current.add(mutationId);
      
      // Clean up old mutation IDs after 5 seconds
      setTimeout(() => {
        recentMutationRef.current.delete(mutationId);
      }, 5000);
      
      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: ["/api/vehicles"] });

      // Snapshot the previous value
      const previousData = queryClient.getQueriesData({ queryKey: ["/api/vehicles"] });

      // Optimistically update all vehicle queries
      queryClient.setQueriesData({ queryKey: ["/api/vehicles"] }, (old) => {
        if (!old || !old.vehicles) return old;
        
        return {
          ...old,
          vehicles: old.vehicles.map((vehicle) => {
            const vehicleId = typeof vehicle.id === 'number' ? vehicle.id : parseInt(String(vehicle.id), 10);
            const targetId = typeof id === 'number' ? id : parseInt(String(id), 10);
            
            if (vehicleId === targetId) {
              return {
                ...vehicle,
                status: status,
                vehicle_status: status,
              };
            }
            return vehicle;
          }),
        };
      });

      // Return context with the snapshotted value
      return { previousData, mutationId };
    },
    // If the mutation fails, use the context returned from onMutate to roll back
    onError: (error, variables, context) => {
      // Rollback to previous data
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      console.error('Status update error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update vehicle status",
        variant: "destructive",
      });
    },
    onSuccess: (data, variables, context) => {
      // Update the cache directly with the response data instead of refetching
      // This ensures we have the correct data immediately without waiting for a slow refetch
      queryClient.setQueriesData({ queryKey: ["/api/vehicles"] }, (old) => {
        if (!old || !old.vehicles) return old;
        
        return {
          ...old,
          vehicles: old.vehicles.map((vehicle) => {
            const vehicleId = typeof vehicle.id === 'number' ? vehicle.id : parseInt(String(vehicle.id), 10);
            const targetId = typeof variables.id === 'number' ? variables.id : parseInt(String(variables.id), 10);
            
            if (vehicleId === targetId) {
              return {
                ...vehicle,
                status: variables.status,
                vehicle_status: variables.status,
              };
            }
            return vehicle;
          }),
        };
      });
      
      toast({
        title: "Success",
        description: `Vehicle ${variables.status === 'active' ? 'enabled' : 'disabled by DIG traffic police'} successfully`,
      });
      
      // Invalidate dashboard stats (but don't refetch vehicles - we already updated the cache)
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      
      // Clear selection
      setSelectedVehicles(new Set());
      setSelectAll(false);
    },
  });

  const bulkUpdateStatusMutation = useMutation({
    mutationFn: async ({ vehicleIds, status }) => {
      const response = await apiRequest("PATCH", `/api/vehicles/bulk-status`, { vehicleIds, status });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    },
    // Optimistic update - immediately update the UI
    onMutate: async ({ vehicleIds, status }) => {
      // Mark this mutation as recent to prevent refetches
      const mutationId = `bulk-${Date.now()}`;
      recentMutationRef.current.add(mutationId);
      
      // Clean up old mutation IDs after 5 seconds
      setTimeout(() => {
        recentMutationRef.current.delete(mutationId);
      }, 5000);
      
      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: ["/api/vehicles"] });

      // Snapshot the previous value
      const previousData = queryClient.getQueriesData({ queryKey: ["/api/vehicles"] });

      // Convert vehicleIds to a Set for faster lookup
      const vehicleIdSet = new Set(vehicleIds.map(id => typeof id === 'number' ? id : parseInt(String(id), 10)));

      // Optimistically update all vehicle queries
      queryClient.setQueriesData({ queryKey: ["/api/vehicles"] }, (old) => {
        if (!old || !old.vehicles) return old;
        
        return {
          ...old,
          vehicles: old.vehicles.map((vehicle) => {
            const vehicleId = typeof vehicle.id === 'number' ? vehicle.id : parseInt(String(vehicle.id), 10);
            
            if (vehicleIdSet.has(vehicleId)) {
              return {
                ...vehicle,
                status: status,
                vehicle_status: status,
              };
            }
            return vehicle;
          }),
        };
      });

      // Return context with the snapshotted value
      return { previousData, mutationId };
    },
    // If the mutation fails, use the context returned from onMutate to roll back
    onError: (error, variables, context) => {
      // Rollback to previous data
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      console.error('Bulk status update error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update vehicle status",
        variant: "destructive",
      });
    },
    onSuccess: (data, variables, context) => {
      // Update the cache directly with the response data instead of refetching
      // This ensures we have the correct data immediately without waiting for a slow refetch
      queryClient.setQueriesData({ queryKey: ["/api/vehicles"] }, (old) => {
        if (!old || !old.vehicles) return old;
        
        // Convert vehicleIds to a Set for faster lookup
        const vehicleIdSet = new Set(variables.vehicleIds.map(id => typeof id === 'number' ? id : parseInt(String(id), 10)));
        
        return {
          ...old,
          vehicles: old.vehicles.map((vehicle) => {
            const vehicleId = typeof vehicle.id === 'number' ? vehicle.id : parseInt(String(vehicle.id), 10);
            
            if (vehicleIdSet.has(vehicleId)) {
              return {
                ...vehicle,
                status: variables.status,
                vehicle_status: variables.status,
              };
            }
            return vehicle;
          }),
        };
      });
      
      toast({
        title: "Success",
        description: `${data.message}. ${data.successCount} vehicle(s) updated successfully.`,
        duration: 5000,
      });
      
      // Invalidate dashboard stats (but don't refetch vehicles - we already updated the cache)
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      
      // Clear selection
      setSelectedVehicles(new Set());
      setSelectAll(false);
    },
  });

  const generateQRMutation = useMutation({
    mutationFn: async (id) => {
      // Pass our current origin to the backend so it encodes the public host when behind a tunnel
      const response = await apiRequest("POST", `/api/vehicles/${id}/generate-qr`, {
        baseUrl: window.location.origin
      });
      return await response.json();
    },
    onSuccess: (data) => {
      setSelectedQR({
        qrCode: data.qrCard || data.qrCode,
        registrationNumber: data.registration_number || "Unknown"
      });
      toast({
        title: "Success",
        description: "QR code generated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate QR code",
        variant: "destructive",
      });
    },
  });

  const handleEnable = (vehicleId) => {
    updateStatusMutation.mutate({ id: vehicleId, status: "active" });
  };

  const handleDisable = (vehicleId) => {
    updateStatusMutation.mutate({ id: vehicleId, status: "suspended" });
  };

  const handleBulkEnable = () => {
    if (selectedVehicles.size === 0) {
      toast({
        title: "No Selection",
        description: "Please select at least one vehicle",
        variant: "destructive",
      });
      return;
    }
    // Ensure all IDs are valid numbers - filter and validate
    const vehicleIds = Array.from(selectedVehicles)
      .map(id => {
        if (id === null || id === undefined) return null;
        const numId = typeof id === 'number' ? id : parseInt(String(id), 10);
        if (isNaN(numId) || !isFinite(numId) || numId <= 0 || !Number.isInteger(numId)) {
          console.error('Invalid vehicle ID:', id, 'parsed as:', numId);
          return null;
        }
        return numId;
      })
      .filter(id => id !== null && typeof id === 'number');
    
    console.log('Bulk enable - Selected vehicles:', Array.from(selectedVehicles));
    console.log('Bulk enable - Validated vehicle IDs:', vehicleIds);
    console.log('Bulk enable - Vehicle IDs types:', vehicleIds.map(id => ({ id, type: typeof id, isNaN: isNaN(id), isInteger: Number.isInteger(id) })));
    
    if (vehicleIds.length === 0) {
      toast({
        title: "Error",
        description: "No valid vehicle IDs selected",
        variant: "destructive",
      });
      return;
    }
    
    // Ensure all IDs are definitely numbers (not NaN)
    const finalVehicleIds = vehicleIds.filter(id => {
      const isValid = Number.isInteger(id) && id > 0 && Number.isFinite(id) && !isNaN(id);
      if (!isValid) {
        console.error('Filtering out invalid ID in final check:', id);
      }
      return isValid;
    });
    
    if (finalVehicleIds.length === 0) {
      toast({
        title: "Error",
        description: "No valid vehicle IDs after final validation",
        variant: "destructive",
      });
      return;
    }
    
    console.log('Bulk enable - Final vehicle IDs to send:', finalVehicleIds);
    
    bulkUpdateStatusMutation.mutate({ 
      vehicleIds: finalVehicleIds, 
      status: "active" 
    });
  };

  const handleBulkDisable = () => {
    if (selectedVehicles.size === 0) {
      toast({
        title: "No Selection",
        description: "Please select at least one vehicle",
        variant: "destructive",
      });
      return;
    }
    // Ensure all IDs are valid numbers - filter and validate
    const vehicleIds = Array.from(selectedVehicles)
      .map(id => {
        if (id === null || id === undefined) return null;
        const numId = typeof id === 'number' ? id : parseInt(String(id), 10);
        if (isNaN(numId) || !isFinite(numId) || numId <= 0 || !Number.isInteger(numId)) {
          console.error('Invalid vehicle ID:', id, 'parsed as:', numId);
          return null;
        }
        return numId;
      })
      .filter(id => id !== null && typeof id === 'number');
    
    console.log('Bulk disable - Selected vehicles:', Array.from(selectedVehicles));
    console.log('Bulk disable - Validated vehicle IDs:', vehicleIds);
    console.log('Bulk disable - Vehicle IDs types:', vehicleIds.map(id => ({ id, type: typeof id, isNaN: isNaN(id), isInteger: Number.isInteger(id) })));
    
    if (vehicleIds.length === 0) {
      toast({
        title: "Error",
        description: "No valid vehicle IDs selected",
        variant: "destructive",
      });
      return;
    }
    
    // Ensure all IDs are definitely numbers (not NaN)
    const finalVehicleIds = vehicleIds.filter(id => {
      const isValid = Number.isInteger(id) && id > 0 && Number.isFinite(id) && !isNaN(id);
      if (!isValid) {
        console.error('Filtering out invalid ID in final check:', id);
      }
      return isValid;
    });
    
    if (finalVehicleIds.length === 0) {
      toast({
        title: "Error",
        description: "No valid vehicle IDs after final validation",
        variant: "destructive",
      });
      return;
    }
    
    console.log('Bulk disable - Final vehicle IDs to send:', finalVehicleIds);
    
    bulkUpdateStatusMutation.mutate({ 
      vehicleIds: finalVehicleIds, 
      status: "suspended" 
    });
  };

  const handleSelectVehicle = (vehicleId) => {
    // Ensure vehicleId is a valid number
    if (!vehicleId || (typeof vehicleId !== 'number' && isNaN(parseInt(String(vehicleId), 10)))) {
      console.error('Invalid vehicle ID in handleSelectVehicle:', vehicleId);
      return;
    }
    const numId = typeof vehicleId === 'number' ? vehicleId : parseInt(String(vehicleId), 10);
    
    const newSelected = new Set(selectedVehicles);
    if (newSelected.has(numId)) {
      newSelected.delete(numId);
    } else {
      newSelected.add(numId);
    }
    setSelectedVehicles(newSelected);
    setSelectAll(newSelected.size === vehiclesData?.vehicles?.length);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedVehicles(new Set());
      setSelectAll(false);
    } else {
      // Filter out any invalid IDs and ensure they're numbers
      const allIds = new Set(
        (vehiclesData?.vehicles || [])
          .map(v => {
            if (!v || !v.id) return null;
            const numId = typeof v.id === 'number' ? v.id : parseInt(String(v.id), 10);
            return isNaN(numId) ? null : numId;
          })
          .filter(id => id !== null)
      );
      setSelectedVehicles(allIds);
      setSelectAll(allIds.size > 0);
    }
  };

  const handleGenerateQR = (vehicle) => {
    generateQRMutation.mutate(vehicle.id);
  };

  // Helper to get vehicle status (check multiple possible fields)
  const getVehicleStatus = (vehicle) => {
    if (!vehicle) return 'active';
    return vehicle?.status || vehicle?.vehicle_status || 'active';
  };

  const getStatusBadge = (status) => {
    if (!status) return null;
    
    const statusLower = String(status).toLowerCase();
    const statusConfig = {
      active: { color: "bg-green-100 text-green-800", icon: "●", label: "Active" },
      pending: { color: "bg-warning/10 text-warning", icon: "●", label: "Pending" },
      rejected: { color: "bg-red-100 text-red-800", icon: "●", label: "Rejected" },
      suspended: { color: "bg-red-200 text-red-900", icon: "●", label: "Disabled by DIG Traffic Police" },
    };

    const config = statusConfig[statusLower] || statusConfig.active;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <span className="mr-1">{config.icon}</span>
        {config.label}
      </span>
    );
  };

  const getVehicleIcon = (type) => {
    switch (type) {
      case "bus":
        return <Bus className="text-primary" />;
      default:
        return <Truck className="text-primary" />;
    }
  };

  // Generate consistent color based on vehicle type name
  const getVehicleTypeBadge = (vehicleTypeName) => {
    if (!vehicleTypeName) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          Unknown
        </span>
      );
    }

    // Generate a consistent color based on the vehicle type name
    // This ensures the same type always gets the same color
    const colors = [
      "bg-blue-100 text-blue-800",
      "bg-purple-100 text-purple-800",
      "bg-green-100 text-green-800",
      "bg-orange-100 text-orange-800",
      "bg-pink-100 text-pink-800",
      "bg-indigo-100 text-indigo-800",
      "bg-teal-100 text-teal-800",
      "bg-yellow-100 text-yellow-800",
      "bg-red-100 text-red-800",
      "bg-cyan-100 text-cyan-800",
    ];

    // Simple hash function to consistently map names to colors
    let hash = 0;
    for (let i = 0; i < vehicleTypeName.length; i++) {
      hash = vehicleTypeName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colorIndex = Math.abs(hash) % colors.length;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[colorIndex]}`}>
        {vehicleTypeName}
      </span>
    );
  };

  if (isLoading) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Vehicles</h2>
          <p className="text-red-600">{error.message || "Failed to load vehicles. Please try again."}</p>
          <Button 
            onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] })}
            className="mt-4"
          >
            Retry
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Vehicle Database</h2>
        <p className="text-gray-600">Search and manage all registered vehicles</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Search and Filters */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex-1 max-w-lg flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch();
                    }
                  }}
                  placeholder="Search by registration number, owner name, engine, chassis, book number..."
                  className="pl-10"
                />
              </div>
              <Button onClick={handleSearch} className="px-4">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
            
            <div className="flex space-x-3">
              <Select value={typeFilter} onValueChange={(value) => {
                setTypeFilter(value);
                setPage(1);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {vehicleTypes.map((type) => (
                    <SelectItem key={type.id} value={type.name}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={statusFilter} onValueChange={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" onClick={handleResetFilters}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset
              </Button>
              
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </div>

        {/* Bulk Actions Bar - Only for Managers and Admins */}
        {isManagerOrAdmin && selectedVehicles.size > 0 && (
          <div className="px-6 py-3 bg-blue-50 border-b border-blue-200 flex items-center justify-between">
            <div className="text-sm font-medium text-blue-900">
              {selectedVehicles.size} vehicle(s) selected
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkEnable}
                disabled={bulkUpdateStatusMutation.isPending}
                className="text-green-700 border-green-300 hover:bg-green-800"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Enable Selected
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkDisable}
                disabled={bulkUpdateStatusMutation.isPending}
                className="text-red-700 border-red-300 hover:bg-red-800"
              >
                <Ban className="h-4 w-4 mr-2" />
                Disable Selected
              </Button>
            </div>
          </div>
        )}

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {isManagerOrAdmin && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                    <Checkbox
                      checked={selectAll}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Serial No
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vehicle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Owner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Registration Region
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Registered
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {vehiclesData?.vehicles
                ?.filter((vehicle) => {
                  // Filter out vehicles without valid IDs
                  if (!vehicle || !vehicle.id) {
                    console.warn('Vehicle without ID found:', vehicle);
                    return false;
                  }
                  const vehicleId = typeof vehicle.id === 'number' ? vehicle.id : parseInt(String(vehicle.id), 10);
                  if (isNaN(vehicleId) || vehicleId <= 0) {
                    console.warn('Invalid vehicle ID:', vehicle.id, 'for vehicle:', vehicle);
                    return false;
                  }
                  return true;
                })
                ?.map((vehicle) => {
                // Ensure vehicle.id is a number (already validated in filter)
                const vehicleId = typeof vehicle.id === 'number' ? vehicle.id : parseInt(String(vehicle.id), 10);
                
                // Get vehicle type name - check multiple possible locations
                // Backend returns vehicleType (camelCase) from the join
                const vehicleTypeName = vehicle.vehicleType?.name 
                  || vehicle.vehicle_type?.name 
                  || (vehicle.vehicle_types && vehicle.vehicle_types.name)
                  || null;
                
                return (
                <tr key={vehicleId} className={`hover:bg-gray-50 transition-colors ${selectedVehicles.has(vehicleId) ? 'bg-blue-50' : ''}`}>
                  {isManagerOrAdmin && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Checkbox
                        checked={selectedVehicles.has(vehicleId)}
                        onCheckedChange={(checked) => {
                          // Checkbox passes boolean, but we need the vehicle ID
                          handleSelectVehicle(vehicleId);
                        }}
                      />
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {vehicleId}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          {getVehicleIcon((vehicle.vehicleCategory?.name || vehicle.vehicle_category || '').toLowerCase())}
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {vehicle.vehicle_register_number || vehicle.registration_number}
                        </div>
                        <div className="text-sm text-gray-500">{vehicle.make_model}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{vehicle.owner?.name}</div>
                    <div className="text-sm text-gray-500">{vehicle.owner?.phone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {vehicle.registration_region || 'Not Available'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getVehicleTypeBadge(vehicleTypeName)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(getVehicleStatus(vehicle))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(vehicle.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button className="text-primary hover:text-primary/80" onClick={() => navigate(`/vehicles/${vehicleId}/view`)}>
                      <Eye className="h-4 w-4" />
                    </button>
                    {canEditVehicles && (
                      <button className="text-gray-600 hover:text-gray-800" onClick={() => navigate(`/vehicles/${vehicleId}/edit`)}>
                        <Edit className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleGenerateQR(vehicle)}
                      disabled={generateQRMutation.isPending}
                      className="text-secondary hover:text-secondary/80"
                      title="Generate QR Code"
                    >
                      <QrCode className="h-4 w-4" />
                    </button>
                    {isManagerOrAdmin && (
                      <>
                        {getVehicleStatus(vehicle).toLowerCase() === "suspended" ? (
                          <button
                            onClick={() => handleEnable(vehicleId)}
                            disabled={updateStatusMutation.isPending}
                            className="text-green-600 hover:text-green-800"
                            title="Enable Vehicle"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleDisable(vehicleId)}
                            disabled={updateStatusMutation.isPending}
                            className="text-red-600 hover:text-red-800"
                            title="Disable by DIG Traffic Police"
                          >
                            <Ban className="h-4 w-4" />
                          </button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {vehiclesData && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing <span className="font-medium">{(page - 1) * 20 + 1}</span> to{" "}
              <span className="font-medium">{Math.min(page * 20, vehiclesData.total || 0)}</span> of{" "}
              <span className="font-medium">{vehiclesData.total || 0}</span> results
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1 || isLoading}
              >
                Previous
              </Button>
              <div className="flex items-center space-x-1">
                <span className="text-sm text-gray-600">Page</span>
                <span className="px-2 py-1 text-sm font-medium bg-primary text-white rounded">
                  {page}
                </span>
                <span className="text-sm text-gray-600">of {vehiclesData.totalPages || 1}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page >= (vehiclesData.totalPages || 1) || isLoading}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* QR Modal */}
      <QRModal
        isOpen={!!selectedQR}
        onClose={() => setSelectedQR(null)}
        qrCode={selectedQR?.qrCode}
        registrationNumber={selectedQR?.registrationNumber || "Unknown"}
      />
    </main>
  );
}
