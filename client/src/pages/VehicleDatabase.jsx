import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Download, Eye, Edit, QrCode, Check, X, Truck, Bus } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import QRModal from "@/components/QRModal";
import { useNavigate } from "react-router-dom";

export default function VehicleDatabase() {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [selectedQR, setSelectedQR] = useState(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Debounce search input - wait 500ms after user stops typing before searching
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      // Reset to page 1 when search changes
      if (searchInput !== debouncedSearch) {
        setPage(1);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchInput, debouncedSearch]);

  const { data: vehiclesData, isLoading } = useQuery({
    queryKey: ["/api/vehicles", { search: debouncedSearch, type: typeFilter, status: statusFilter, page }],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      const response = await apiRequest("PATCH", `/api/vehicles/${id}/status`, { status });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Vehicle status updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update vehicle status",
        variant: "destructive",
      });
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

  const handleApprove = (vehicleId) => {
    updateStatusMutation.mutate({ id: vehicleId, status: "active" });
  };

  const handleReject = (vehicleId) => {
    updateStatusMutation.mutate({ id: vehicleId, status: "rejected" });
  };

  const handleGenerateQR = (vehicle) => {
    generateQRMutation.mutate(vehicle.id);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { color: "bg-secondary/10 text-secondary", icon: "●", label: "Active" },
      pending: { color: "bg-warning/10 text-warning", icon: "●", label: "Pending" },
      rejected: { color: "bg-red-100 text-red-800", icon: "●", label: "Rejected" },
      suspended: { color: "bg-gray-100 text-gray-800", icon: "●", label: "Suspended" },
    };

    const config = statusConfig[status] || statusConfig.pending;
    
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

  const getVehicleTypeBadge = (type) => {
    const typeConfig = {
      truck: { color: "bg-blue-100 text-blue-800", label: "Heavy Truck" },
      trailer: { color: "bg-green-100 text-green-800", label: "Trailer" },
      bus: { color: "bg-purple-100 text-purple-800", label: "Bus" },
      construction: { color: "bg-orange-100 text-orange-800", label: "Construction" },
    };

    const config = typeConfig[type] || typeConfig.truck;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
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
            <div className="flex-1 max-w-lg">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search by registration number, owner name, engine, chassis, book number..."
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex space-x-3">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="truck">Heavy Truck</SelectItem>
                  <SelectItem value="trailer">Trailer</SelectItem>
                  <SelectItem value="bus">Bus</SelectItem>
                  <SelectItem value="construction">Construction</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
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
              
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vehicle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Owner
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
              {vehiclesData?.vehicles?.map((vehicle) => (
                <tr key={vehicle.id} className="hover:bg-gray-50 transition-colors">
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
                    {getVehicleTypeBadge((vehicle.vehicleCategory?.name || vehicle.vehicle_category || '').toLowerCase())}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(vehicle.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(vehicle.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button className="text-primary hover:text-primary/80" onClick={() => navigate(`/vehicles/${vehicle.id}/view`)}>
                      <Eye className="h-4 w-4" />
                    </button>
                    <button className="text-gray-600 hover:text-gray-800" onClick={() => navigate(`/vehicles/${vehicle.id}/edit`)}>
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleGenerateQR(vehicle)}
                      disabled={generateQRMutation.isPending}
                      className="text-secondary hover:text-secondary/80"
                    >
                      <QrCode className="h-4 w-4" />
                    </button>
                    {vehicle.status === "pending" && (
                      <>
                        <button
                          onClick={() => handleApprove(vehicle.id)}
                          disabled={updateStatusMutation.isPending}
                          className="text-secondary hover:text-secondary/80"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleReject(vehicle.id)}
                          disabled={updateStatusMutation.isPending}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {vehiclesData && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing <span className="font-medium">1</span> to{" "}
              <span className="font-medium">{vehiclesData.vehicles?.length || 0}</span> of{" "}
              <span className="font-medium">{vehiclesData.total || 0}</span> results
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <Button variant="outline" size="sm" className="bg-primary text-white">
                {page}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page >= (vehiclesData.totalPages || 1)}
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
