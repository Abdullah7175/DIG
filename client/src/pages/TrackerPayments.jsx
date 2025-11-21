import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Edit, Trash2, RefreshCw, Calendar, DollarSign, AlertCircle, CheckCircle, XCircle, Clock, X } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function TrackerPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState([]);
  const [trackerCompanies, setTrackerCompanies] = useState([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isRenewDialogOpen, setIsRenewDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [filters, setFilters] = useState({
    vehicle_id: 'all',
    tracker_company_id: 'all',
    vehicle_type_id: 'all',
    status: 'all',
    expired: false,
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPaymentsAmount, setTotalPaymentsAmount] = useState(0);
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [filterVehicleSearch, setFilterVehicleSearch] = useState('');
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);
  const [showFilterVehicleDropdown, setShowFilterVehicleDropdown] = useState(false);
  const [selectedVehicleDisplay, setSelectedVehicleDisplay] = useState('');
  const [selectedFilterVehicleDisplay, setSelectedFilterVehicleDisplay] = useState('');
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    vehicle_id: '',
    tracker_company_id: '',
    installation_date: '',
    payment_date: '',
    amount: '',
    payment_period_months: '12',
    payment_receipt_number: '',
    notes: '',
    status: 'active',
  });

  useEffect(() => {
    fetchPayments();
    fetchTotalPayments();
  }, [page, filters]);

  useEffect(() => {
    fetchVehicles();
    fetchTrackerCompanies();
    fetchVehicleTypes();
  }, []);

  const fetchVehicleTypes = async () => {
    try {
      const response = await apiRequest('GET', '/api/vehicle-types/public?status=active');
      const data = await response.json();
      setVehicleTypes(data.vehicleTypes || []);
    } catch (error) {
      console.error('Failed to fetch vehicle types:', error);
    }
  };

  const fetchTotalPayments = async () => {
    try {
      // Use a separate endpoint or calculate from current page data
      // For now, we'll use a summary endpoint if available, otherwise calculate from paginated results
      const response = await apiRequest('GET', '/api/tracker-payments/summary');
      if (response.ok) {
        const data = await response.json();
        setTotalPaymentsAmount(data.totalAmount || 0);
      } else {
        // Fallback: calculate from current page (not ideal but better than fetching 10000 records)
        const total = payments.reduce((sum, payment) => {
          const amount = parseFloat(payment.amount) || 0;
          return sum + amount;
        }, 0);
        setTotalPaymentsAmount(total);
      }
    } catch (error) {
      console.error('Failed to fetch total payments:', error);
      // Fallback calculation
      const total = payments.reduce((sum, payment) => {
        const amount = parseFloat(payment.amount) || 0;
        return sum + amount;
      }, 0);
      setTotalPaymentsAmount(total);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showVehicleDropdown && !event.target.closest('.vehicle-search-container')) {
        setShowVehicleDropdown(false);
      }
      if (showFilterVehicleDropdown && !event.target.closest('.filter-vehicle-search-container')) {
        setShowFilterVehicleDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showVehicleDropdown, showFilterVehicleDropdown]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });

      if (filters.vehicle_id && filters.vehicle_id !== 'all') params.append('vehicle_id', filters.vehicle_id);
      if (filters.tracker_company_id && filters.tracker_company_id !== 'all') params.append('tracker_company_id', filters.tracker_company_id);
      if (filters.vehicle_type_id && filters.vehicle_type_id !== 'all') params.append('vehicle_type_id', filters.vehicle_type_id);
      if (filters.status && filters.status !== 'all') params.append('status', filters.status);
      if (filters.expired) params.append('expired', 'true');

      const response = await apiRequest('GET', `/api/tracker-payments?${params.toString()}`);
      const data = await response.json();
      setPayments(data.payments || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch tracker payments',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicles = async () => {
    try {
      const response = await apiRequest('GET', '/api/vehicles?limit=1000&status=active');
      const data = await response.json();
      const vehiclesList = data.vehicles || [];
      console.log('Fetched vehicles:', vehiclesList.length);
      setVehicles(vehiclesList);
      if (vehiclesList.length === 0) {
        toast({
          title: 'Info',
          description: 'No active vehicles found. Please register vehicles first.',
        });
      }
    } catch (error) {
      console.error('Failed to fetch vehicles:', error);
      toast({
        title: 'Error',
        description: 'Failed to load vehicles: ' + (error.message || 'Unknown error'),
        variant: 'destructive',
      });
    }
  };

  const fetchTrackerCompanies = async () => {
    try {
      // Try fetching all companies first, then filter active ones
      const response = await apiRequest('GET', '/api/tracker-companies?limit=1000');
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      // The API returns { trackerCompanies: [...], total, page, totalPages }
      let companiesList = data.trackerCompanies || data.companies || [];
      
      // Filter for active companies only
      companiesList = companiesList.filter(company => company.status === 'active');
      
      setTrackerCompanies(companiesList);
      
      if (companiesList.length === 0) {
        // Check if there are any companies at all
        const allCompanies = data.trackerCompanies || data.companies || [];
        if (allCompanies.length > 0) {
          console.warn('Found companies but none are active:', allCompanies);
        }
      }
    } catch (error) {
      console.error('Failed to fetch tracker companies:', error);
      toast({
        title: 'Error',
        description: 'Failed to load tracker companies: ' + (error.message || 'Unknown error'),
        variant: 'destructive',
      });
    }
  };

  // Memoize filtered vehicles to avoid recalculating on every render
  const filteredVehicles = useMemo(() => {
    if (!debouncedVehicleSearch) return vehicles.slice(0, 50); // Limit to first 50 if no search
    const searchLower = debouncedVehicleSearch.toLowerCase();
    return vehicles.filter(vehicle => 
      vehicle.vehicle_register_number?.toLowerCase().includes(searchLower) ||
      vehicle.make_company?.toLowerCase().includes(searchLower) ||
      vehicle.model_number?.toLowerCase().includes(searchLower)
    ).slice(0, 50); // Limit results for performance
  }, [vehicles, debouncedVehicleSearch]);

  const filteredVehiclesForFilter = useMemo(() => {
    if (!debouncedFilterVehicleSearch) return vehicles.slice(0, 50); // Limit to first 50 if no search
    const searchLower = debouncedFilterVehicleSearch.toLowerCase();
    return vehicles.filter(vehicle => 
      vehicle.vehicle_register_number?.toLowerCase().includes(searchLower) ||
      vehicle.make_company?.toLowerCase().includes(searchLower) ||
      vehicle.model_number?.toLowerCase().includes(searchLower)
    ).slice(0, 50); // Limit results for performance
  }, [vehicles, debouncedFilterVehicleSearch]);

  // Debounced filter vehicle search state
  const [debouncedFilterVehicleSearch, setDebouncedFilterVehicleSearch] = useState('');
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilterVehicleSearch(filterVehicleSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [filterVehicleSearch]);

  const handleFilterVehicleSearch = useCallback((search) => {
    setFilterVehicleSearch(search);
    setShowFilterVehicleDropdown(true);
  }, []);

  const selectFilterVehicle = useCallback((vehicle) => {
    setFilters(prev => ({ ...prev, vehicle_id: vehicle.id.toString() }));
    setSelectedFilterVehicleDisplay(`${vehicle.vehicle_register_number} - ${vehicle.make_company}`);
    setFilterVehicleSearch('');
    setShowFilterVehicleDropdown(false);
    setPage(1);
  }, []);

  // Debounced vehicle search state
  const [debouncedVehicleSearch, setDebouncedVehicleSearch] = useState('');
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedVehicleSearch(vehicleSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [vehicleSearch]);

  const handleVehicleSearch = useCallback((search) => {
    setVehicleSearch(search);
    setShowVehicleDropdown(true);
  }, []);

  const selectVehicle = useCallback((vehicle) => {
    setFormData(prev => ({ ...prev, vehicle_id: vehicle.id.toString() }));
    setSelectedVehicleDisplay(`${vehicle.vehicle_register_number} - ${vehicle.make_company}`);
    setVehicleSearch('');
    setShowVehicleDropdown(false);
  }, []);

  const handleCreate = async () => {
    // Prevent double submission
    if (isSubmitting) {
      return;
    }

    try {
      if (!formData.vehicle_id) {
        toast({
          title: 'Validation Error',
          description: 'Please select a vehicle',
          variant: 'destructive',
        });
        return;
      }
      if (!formData.tracker_company_id) {
        toast({
          title: 'Validation Error',
          description: 'Please select a tracker company',
          variant: 'destructive',
        });
        return;
      }

      setIsSubmitting(true);
      const payload = {
        ...formData,
        vehicle_id: parseInt(formData.vehicle_id),
        tracker_company_id: parseInt(formData.tracker_company_id),
        payment_period_months: parseInt(formData.payment_period_months),
        amount: formData.amount || null,
      };

      const response = await apiRequest('POST', '/api/tracker-payments', payload);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create payment');
      }

      toast({
        title: 'Success',
        description: 'Tracker payment created successfully',
      });
      setIsCreateDialogOpen(false);
      resetForm();
      fetchPayments();
      fetchTotalPayments();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create payment',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    // Prevent double submission
    if (isSubmitting) {
      return;
    }

    try {
      if (!formData.vehicle_id) {
        toast({
          title: 'Validation Error',
          description: 'Please select a vehicle',
          variant: 'destructive',
        });
        return;
      }
      if (!formData.tracker_company_id) {
        toast({
          title: 'Validation Error',
          description: 'Please select a tracker company',
          variant: 'destructive',
        });
        return;
      }

      setIsSubmitting(true);
      const payload = {
        ...formData,
        vehicle_id: parseInt(formData.vehicle_id),
        tracker_company_id: parseInt(formData.tracker_company_id),
        payment_period_months: parseInt(formData.payment_period_months),
        amount: formData.amount || null,
      };

      const response = await apiRequest('PATCH', `/api/tracker-payments/${selectedPayment.id}`, payload);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update payment');
      }

      toast({
        title: 'Success',
        description: 'Tracker payment updated successfully',
      });
      setIsEditDialogOpen(false);
      setSelectedPayment(null);
      resetForm();
      fetchPayments();
      fetchTotalPayments();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update payment',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this payment record?')) return;

    try {
      const response = await apiRequest('DELETE', `/api/tracker-payments/${id}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete payment');
      }

      toast({
        title: 'Success',
        description: 'Payment deleted successfully',
      });
      fetchPayments();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete payment',
        variant: 'destructive',
      });
    }
  };

  const handleRenew = async () => {
    try {
      const payload = {
        payment_date: formData.payment_date,
        amount: formData.amount || null,
      };

      const response = await apiRequest('POST', `/api/tracker-payments/${selectedPayment.id}/renew`, payload);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to renew payment');
      }

      toast({
        title: 'Success',
        description: 'Payment renewed successfully',
      });
      setIsRenewDialogOpen(false);
      setSelectedPayment(null);
      resetForm();
      fetchPayments();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to renew payment',
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (payment) => {
    setSelectedPayment(payment);
    const vehicle = vehicles.find(v => v.id === payment.vehicle_id);
    setFormData({
      vehicle_id: payment.vehicle_id?.toString() || '',
      tracker_company_id: payment.tracker_company_id?.toString() || '',
      installation_date: payment.installation_date ? new Date(payment.installation_date).toISOString().split('T')[0] : '',
      payment_date: payment.payment_date ? new Date(payment.payment_date).toISOString().split('T')[0] : '',
      amount: payment.amount || '',
      payment_period_months: payment.payment_period_months?.toString() || '12',
      payment_receipt_number: payment.payment_receipt_number || '',
      notes: payment.notes || '',
      status: payment.status || 'active',
    });
    if (vehicle) {
      setSelectedVehicleDisplay(`${vehicle.vehicle_register_number} - ${vehicle.make_company}`);
    }
    setIsEditDialogOpen(true);
  };

  const openRenewDialog = (payment) => {
    setSelectedPayment(payment);
    setFormData({
      payment_date: new Date().toISOString().split('T')[0],
      amount: payment.amount || '',
    });
    setIsRenewDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      vehicle_id: '',
      tracker_company_id: '',
      installation_date: '',
      payment_date: '',
      amount: '',
      payment_period_months: '12',
      payment_receipt_number: '',
      notes: '',
      status: 'active',
    });
    setVehicleSearch('');
    setSelectedVehicleDisplay('');
    setShowVehicleDropdown(false);
  };

  const getStatusBadge = (status, nextPaymentDueDate) => {
    const isExpired = nextPaymentDueDate && new Date(nextPaymentDueDate) < new Date();
    
    if (status === 'active' && isExpired) {
      return <Badge variant="destructive" className="flex items-center gap-1"><AlertCircle className="w-3 h-3" />Expired</Badge>;
    }
    
    switch (status) {
      case 'active':
        return <Badge variant="default" className="flex items-center gap-1"><CheckCircle className="w-3 h-3" />Active</Badge>;
      case 'expired':
        return <Badge variant="destructive" className="flex items-center gap-1"><XCircle className="w-3 h-3" />Expired</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="w-3 h-3" />Pending</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="flex items-center gap-1"><XCircle className="w-3 h-3" />Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const daysUntilDue = (dueDate) => {
    if (!dueDate) return null;
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Count active payments from current page
  const activePaymentsCount = payments.filter(p => p.status === 'active').length;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Link 
          to="/management" 
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to System Management
        </Link>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Tracker Payments</h1>
            <p className="text-gray-600">Manage tracker installation and payment records</p>
          </div>
          <Button onClick={() => { resetForm(); setIsCreateDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Add Payment
          </Button>
        </div>
      </div>

      {/* Total Payments Summary */}
      <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <DollarSign className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Payments Received</p>
                <p className="text-3xl font-bold text-gray-900">
                  PKR {totalPaymentsAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  From {total} payment record{total !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Active Payments</p>
              <p className="text-2xl font-semibold text-blue-600">
                {activePaymentsCount}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label>Vehicle</Label>
              <div className="relative filter-vehicle-search-container">
                <Input
                  value={selectedFilterVehicleDisplay || filterVehicleSearch}
                  onChange={(e) => {
                    if (!selectedFilterVehicleDisplay) {
                      handleFilterVehicleSearch(e.target.value);
                    } else {
                      setSelectedFilterVehicleDisplay('');
                      setFilters({ ...filters, vehicle_id: 'all' });
                      handleFilterVehicleSearch(e.target.value);
                    }
                  }}
                  onFocus={() => {
                    setShowFilterVehicleDropdown(true);
                  }}
                  placeholder="Search vehicle..."
                />
                {selectedFilterVehicleDisplay && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFilterVehicleDisplay('');
                      setFilters({ ...filters, vehicle_id: 'all' });
                      setFilterVehicleSearch('');
                      setShowFilterVehicleDropdown(true);
                      setPage(1);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                {showFilterVehicleDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredVehiclesForFilter.length > 0 ? (
                      <>
                        {filteredVehiclesForFilter.length > 10 && (
                          <div className="px-3 py-2 text-xs text-gray-500 border-b">
                            Showing {filteredVehiclesForFilter.length} vehicles. Type to filter.
                          </div>
                        )}
                        {filteredVehiclesForFilter.map(vehicle => (
                          <div
                            key={vehicle.id}
                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                            onClick={() => selectFilterVehicle(vehicle)}
                          >
                            <div className="font-medium">{vehicle.vehicle_register_number}</div>
                            <div className="text-sm text-gray-500">{vehicle.make_company} {vehicle.model_number}</div>
                          </div>
                        ))}
                      </>
                    ) : (
                      <div className="px-3 py-2 text-gray-500 text-sm">
                        {filterVehicleSearch ? 'No vehicles found matching your search' : vehicles.length === 0 ? 'Loading vehicles...' : 'No vehicles available'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div>
              <Label>Vehicle Type</Label>
              <Select value={filters.vehicle_type_id} onValueChange={(value) => { setFilters({ ...filters, vehicle_type_id: value }); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {vehicleTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id.toString()}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tracker Company</Label>
              <Select value={filters.tracker_company_id} onValueChange={(value) => { setFilters({ ...filters, tracker_company_id: value }); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="All Companies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  {trackerCompanies.map((company) => (
                    <SelectItem key={company.id} value={company.id.toString()}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={filters.status} onValueChange={(value) => { setFilters({ ...filters, status: value }); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant={filters.expired ? "default" : "outline"}
                onClick={() => { setFilters({ ...filters, expired: !filters.expired }); setPage(1); }}
                className="w-full"
              >
                {filters.expired ? 'Show All' : 'Show Expired Only'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Records ({total})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : payments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No payments found</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">Vehicle</th>
                      <th className="text-left p-3">Tracker Company</th>
                      <th className="text-left p-3">Installation Date</th>
                      <th className="text-left p-3">Payment Date</th>
                      <th className="text-left p-3">Amount</th>
                      <th className="text-left p-3">Period</th>
                      <th className="text-left p-3">Next Due</th>
                      <th className="text-left p-3">Status</th>
                      <th className="text-left p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => {
                      const daysDue = daysUntilDue(payment.next_payment_due_date);
                      return (
                        <tr key={payment.id} className="border-b hover:bg-gray-50">
                          <td className="p-3">
                            <div className="font-medium">{payment.vehicle?.vehicle_register_number || 'N/A'}</div>
                            {payment.vehicle?.make_company && (
                              <div className="text-sm text-gray-500">{payment.vehicle.make_company}</div>
                            )}
                          </td>
                          <td className="p-3">{payment.trackerCompany?.name || 'N/A'}</td>
                          <td className="p-3">{formatDate(payment.installation_date)}</td>
                          <td className="p-3">{formatDate(payment.payment_date)}</td>
                          <td className="p-3">{payment.amount ? `PKR ${payment.amount}` : 'N/A'}</td>
                          <td className="p-3">{payment.payment_period_months} months</td>
                          <td className="p-3">
                            <div>{formatDate(payment.next_payment_due_date)}</div>
                            {daysDue !== null && (
                              <div className={`text-xs ${daysDue < 0 ? 'text-red-600' : daysDue < 30 ? 'text-orange-600' : 'text-gray-500'}`}>
                                {daysDue < 0 ? `${Math.abs(daysDue)} days overdue` : `${daysDue} days remaining`}
                              </div>
                            )}
                          </td>
                          <td className="p-3">{getStatusBadge(payment.status, payment.next_payment_due_date)}</td>
                          <td className="p-3">
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditDialog(payment)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              {payment.status === 'active' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openRenewDialog(payment)}
                                  title="Renew Payment"
                                >
                                  <RefreshCw className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(payment.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-between items-center mt-4">
                  <div className="text-sm text-gray-600">
                    Page {page} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
        setIsCreateDialogOpen(open);
        if (open) {
          // Refetch companies when dialog opens
          fetchTrackerCompanies();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Tracker Payment</DialogTitle>
            <DialogDescription>Record a new tracker installation and payment</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2">
              <Label>Vehicle *</Label>
              <div className="relative vehicle-search-container">
                <Input
                  value={selectedVehicleDisplay || vehicleSearch}
                  onChange={(e) => {
                    if (!selectedVehicleDisplay) {
                      handleVehicleSearch(e.target.value);
                    } else {
                      setSelectedVehicleDisplay('');
                      setFormData({ ...formData, vehicle_id: '' });
                      handleVehicleSearch(e.target.value);
                    }
                  }}
                  onFocus={() => {
                    setShowVehicleDropdown(true);
                  }}
                  placeholder="Click to search vehicles or type to filter..."
                  required
                />
                {selectedVehicleDisplay && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedVehicleDisplay('');
                      setFormData({ ...formData, vehicle_id: '' });
                      setVehicleSearch('');
                      setShowVehicleDropdown(true);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                {showVehicleDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredVehicles.length > 0 ? (
                      <>
                        {filteredVehicles.length > 10 && (
                          <div className="px-3 py-2 text-xs text-gray-500 border-b">
                            Showing {filteredVehicles.length} vehicles. Type to filter.
                          </div>
                        )}
                        {filteredVehicles.map(vehicle => (
                          <div
                            key={vehicle.id}
                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                            onClick={() => selectVehicle(vehicle)}
                          >
                            <div className="font-medium">{vehicle.vehicle_register_number}</div>
                            <div className="text-sm text-gray-500">{vehicle.make_company} {vehicle.model_number}</div>
                          </div>
                        ))}
                      </>
                    ) : (
                      <div className="px-3 py-2 text-gray-500 text-sm">
                        {vehicleSearch ? 'No vehicles found matching your search' : vehicles.length === 0 ? 'Loading vehicles...' : 'No vehicles available'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="col-span-2">
              <Label>Tracker Company *</Label>
              {trackerCompanies.length > 0 ? (
                <Select 
                  value={formData.tracker_company_id || undefined} 
                  onValueChange={(value) => {
                    setFormData({ ...formData, tracker_company_id: value });
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select tracker company" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {trackerCompanies.map((company) => (
                      <SelectItem key={company.id} value={company.id.toString()}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div>
                  <Input disabled placeholder="Loading tracker companies..." />
                  <p className="text-xs text-gray-500 mt-1">
                    If this persists, check if tracker companies exist in the system
                  </p>
                </div>
              )}
            </div>
            <div>
              <Label>Installation Date *</Label>
              <Input
                type="date"
                value={formData.installation_date}
                onChange={(e) => setFormData({ ...formData, installation_date: e.target.value })}
              />
            </div>
            <div>
              <Label>Payment Date *</Label>
              <Input
                type="date"
                value={formData.payment_date}
                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
              />
            </div>
            <div>
              <Label>Amount (PKR)</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              />
            </div>
            <div>
              <Label>Payment Period (Months) *</Label>
              <Input
                type="number"
                value={formData.payment_period_months}
                onChange={(e) => setFormData({ ...formData, payment_period_months: e.target.value })}
                min="1"
              />
            </div>
            <div>
              <Label>Receipt Number</Label>
              <Input
                value={formData.payment_receipt_number}
                onChange={(e) => setFormData({ ...formData, payment_receipt_number: e.target.value })}
                placeholder="Optional"
              />
            </div>
            <div>
              <Label>Status *</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Notes</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Optional notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsCreateDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreate}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (open) {
          // Refetch companies when dialog opens
          fetchTrackerCompanies();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Tracker Payment</DialogTitle>
            <DialogDescription>Update payment information</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2">
              <Label>Vehicle *</Label>
              <div className="relative vehicle-search-container">
                <Input
                  value={selectedVehicleDisplay || vehicleSearch}
                  onChange={(e) => {
                    if (!selectedVehicleDisplay) {
                      handleVehicleSearch(e.target.value);
                    } else {
                      setSelectedVehicleDisplay('');
                      setFormData({ ...formData, vehicle_id: '' });
                      handleVehicleSearch(e.target.value);
                    }
                  }}
                  onFocus={() => {
                    setShowVehicleDropdown(true);
                  }}
                  placeholder="Search vehicle registration number or make..."
                  required
                />
                {selectedVehicleDisplay && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedVehicleDisplay('');
                      setFormData({ ...formData, vehicle_id: '' });
                      setVehicleSearch('');
                      setShowVehicleDropdown(true);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                {showVehicleDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredVehicles.length > 0 ? (
                      <>
                        {filteredVehicles.length > 10 && (
                          <div className="px-3 py-2 text-xs text-gray-500 border-b">
                            Showing {filteredVehicles.length} vehicles. Type to filter.
                          </div>
                        )}
                        {filteredVehicles.map(vehicle => (
                          <div
                            key={vehicle.id}
                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                            onClick={() => selectVehicle(vehicle)}
                          >
                            <div className="font-medium">{vehicle.vehicle_register_number}</div>
                            <div className="text-sm text-gray-500">{vehicle.make_company} {vehicle.model_number}</div>
                          </div>
                        ))}
                      </>
                    ) : (
                      <div className="px-3 py-2 text-gray-500 text-sm">
                        {vehicleSearch ? 'No vehicles found matching your search' : vehicles.length === 0 ? 'Loading vehicles...' : 'No vehicles available'}
                      </div>
                    )}
                  </div>
                )}
                {showVehicleDropdown && filteredVehicles.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredVehicles.map(vehicle => (
                      <div
                        key={vehicle.id}
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                        onClick={() => selectVehicle(vehicle)}
                      >
                        <div className="font-medium">{vehicle.vehicle_register_number}</div>
                        <div className="text-sm text-gray-500">{vehicle.make_company} {vehicle.model_number}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="col-span-2">
              <Label>Tracker Company *</Label>
              {trackerCompanies.length > 0 ? (
                <Select value={formData.tracker_company_id || undefined} onValueChange={(value) => setFormData({ ...formData, tracker_company_id: value })}>
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
              ) : (
                <Input disabled placeholder="Loading tracker companies..." />
              )}
            </div>
            <div>
              <Label>Installation Date *</Label>
              <Input
                type="date"
                value={formData.installation_date}
                onChange={(e) => setFormData({ ...formData, installation_date: e.target.value })}
              />
            </div>
            <div>
              <Label>Payment Date *</Label>
              <Input
                type="date"
                value={formData.payment_date}
                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
              />
            </div>
            <div>
              <Label>Amount (PKR)</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              />
            </div>
            <div>
              <Label>Payment Period (Months) *</Label>
              <Input
                type="number"
                value={formData.payment_period_months}
                onChange={(e) => setFormData({ ...formData, payment_period_months: e.target.value })}
                min="1"
              />
            </div>
            <div>
              <Label>Receipt Number</Label>
              <Input
                value={formData.payment_receipt_number}
                onChange={(e) => setFormData({ ...formData, payment_receipt_number: e.target.value })}
                placeholder="Optional"
              />
            </div>
            <div>
              <Label>Status *</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Notes</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Optional notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpdate}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Updating...' : 'Update Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Renew Dialog */}
      <Dialog open={isRenewDialogOpen} onOpenChange={setIsRenewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renew Tracker Payment</DialogTitle>
            <DialogDescription>
              Create a new payment record for vehicle: {selectedPayment?.vehicle?.vehicle_register_number}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label>New Payment Date *</Label>
              <Input
                type="date"
                value={formData.payment_date}
                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
              />
            </div>
            <div>
              <Label>Amount (PKR)</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              />
            </div>
            <div className="text-sm text-gray-600">
              <p>This will create a new payment record and mark the current payment as cancelled.</p>
              <p className="mt-2">The payment period will remain the same ({selectedPayment?.payment_period_months} months).</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenewDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleRenew}>Renew Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

