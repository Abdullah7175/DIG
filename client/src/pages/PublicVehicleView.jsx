import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Truck, Bus, Car, Calendar, User, MapPin, Phone, Mail, FileText, Navigation, ExternalLink } from 'lucide-react';

export default function PublicVehicleView() {
  const { id } = useParams();
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchVehicle() {
      try {
        setLoading(true);
        const res = await fetch(`/api/public/vehicles/${id}`);
        if (res.ok) {
          const data = await res.json();
          setVehicle(data);
        } else {
          setError('Vehicle not found');
        }
      } catch (err) {
        setError('Failed to load vehicle details');
      } finally {
        setLoading(false);
      }
    }
    fetchVehicle();
  }, [id]);

  const getVehicleIcon = (type) => {
    switch (type) {
      case "bus":
        return <Bus className="text-blue-600" size={32} />;
      case "car":
        return <Car className="text-green-600" size={32} />;
      default:
        return <Truck className="text-orange-600" size={32} />;
    }
  };

  const getVehicleTypeColor = (type) => {
    switch (type) {
      case "bus":
        return "bg-blue-100 text-blue-800";
      case "car":
        return "bg-green-100 text-green-800";
      default:
        return "bg-orange-100 text-orange-800";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "suspended":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleTrackerClick = () => {
    if (vehicle.tracker_link && vehicle.tracker_link.trim() !== '') {
      // Open tracker link in new tab
      window.open(vehicle.tracker_link, '_blank', 'noopener,noreferrer');
    } else {
      // Show message if no tracker link
      alert('No tracker link provided for this vehicle.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading vehicle details...</p>
        </div>
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Vehicle Blocked By DIG Traffic Police</h1>
          <p className="text-gray-600">{error || 'The requested vehicle could not be found.'}</p>
        </div>
      </div>
    );
  }

  // Show disabled message if vehicle is suspended (disabled by DIG traffic police)
  if (vehicle.status === 'suspended') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-lg border-2 border-red-200 p-8 text-center">
            <div className="text-red-500 text-6xl mb-4">🚫</div>
            <h1 className="text-3xl font-bold text-red-900 mb-4">Vehicle Disabled</h1>
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
              <p className="text-lg font-semibold text-red-800 mb-2">
                This vehicle has been disabled by DIG Traffic Police
              </p>
              <p className="text-base text-red-700">
                The vehicle with registration number <strong>{vehicle.vehicle_register_number}</strong> is currently not authorized to operate.
              </p>
            </div>
            <div className="text-sm text-gray-600">
              <p>For more information, please contact DIG Traffic Police.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-3 sm:space-x-4">
              {getVehicleIcon(vehicle.vehicle_category)}
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{vehicle.vehicle_register_number}</h1>
                <p className="text-sm sm:text-base text-gray-600">Vehicle Information</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={`px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${getVehicleTypeColor(vehicle.vehicle_category)}`}>
                {vehicle.vehicle_category?.toUpperCase() || 'VEHICLE'}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${getStatusColor(vehicle.status)}`}>
                {vehicle.status?.toUpperCase() || 'UNKNOWN'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Vehicle Details */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Basic Information */}
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
                <Truck className="mr-2" size={18} />
                Vehicle Information
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-xs sm:text-sm font-medium text-gray-500">Registration Number</label>
                  <p className="text-base sm:text-lg font-semibold text-gray-900">{vehicle.vehicle_register_number}</p>
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-medium text-gray-500">Vehicle Category</label>
                  <p className="text-base sm:text-lg font-semibold text-gray-900">{vehicle.vehicle_category}</p>
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-medium text-gray-500">Make</label>
                  <p className="text-base sm:text-lg font-semibold text-gray-900">{vehicle.make_company}</p>
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-medium text-gray-500">Model</label>
                  <p className="text-base sm:text-lg font-semibold text-gray-900">{vehicle.model_number}</p>
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-medium text-gray-500">Color</label>
                  <p className="text-base sm:text-lg font-semibold text-gray-900">{vehicle.vehicle_body_color}</p>
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-medium text-gray-500">Engine Number</label>
                  <p className="text-base sm:text-lg font-semibold text-gray-900">{vehicle.engine_number}</p>
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-medium text-gray-500">Chassis Number</label>
                  <p className="text-base sm:text-lg font-semibold text-gray-900">{vehicle.chassis_number}</p>
                </div>
                {vehicle.affiliated_with && (
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-gray-500">Affiliated With</label>
                    <p className="text-base sm:text-lg font-semibold text-gray-900">{vehicle.affiliated_with}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Owner Information */}
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
                <User className="mr-2" size={18} />
                Owner Information
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-xs sm:text-sm font-medium text-gray-500">Owner Name</label>
                  <p className="text-base sm:text-lg font-semibold text-gray-900">{vehicle.owner?.name}</p>
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-medium text-gray-500">CNIC</label>
                  <p className="text-base sm:text-lg font-semibold text-gray-900">{vehicle.owner?.cnic}</p>
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-medium text-gray-500">Contact</label>
                  <p className="text-base sm:text-lg font-semibold text-gray-900">{vehicle.owner?.contact}</p>
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-medium text-gray-500">Address</label>
                  <p className="text-base sm:text-lg font-semibold text-gray-900">{vehicle.owner?.address}</p>
                </div>
              </div>
            </div>

            {/* Driver Information */}
            {vehicle.driver && (
              <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
                  <User className="mr-2" size={18} />
                  Driver Information
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-gray-500">Driver Name</label>
                    <p className="text-base sm:text-lg font-semibold text-gray-900">{vehicle.driver.name}</p>
                  </div>
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-gray-500">CNIC</label>
                    <p className="text-base sm:text-lg font-semibold text-gray-900">{vehicle.driver.cnic}</p>
                  </div>
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-gray-500">Contact</label>
                    <p className="text-base sm:text-lg font-semibold text-gray-900">{vehicle.driver.contact}</p>
                  </div>
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-gray-500">License Number</label>
                    <p className="text-base sm:text-lg font-semibold text-gray-900">{vehicle.driver.driving_license_number}</p>
                  </div>
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-gray-500">License Category</label>
                    <p className="text-base sm:text-lg font-semibold text-gray-900">{vehicle.driver.driving_license_category}</p>
                  </div>
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-gray-500">License Expiry</label>
                    <p className="text-base sm:text-lg font-semibold text-gray-900">
                      {vehicle.driver.driving_license_expiry_date 
                        ? new Date(vehicle.driver.driving_license_expiry_date).toLocaleDateString()
                        : 'N/A'
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Conductor Information */}
            {vehicle.conductor && (
              <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
                  <User className="mr-2" size={18} />
                  Conductor Information
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-gray-500">Conductor Name</label>
                    <p className="text-base sm:text-lg font-semibold text-gray-900">{vehicle.conductor.name}</p>
                  </div>
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-gray-500">CNIC</label>
                    <p className="text-base sm:text-lg font-semibold text-gray-900">{vehicle.conductor.cnic}</p>
                  </div>
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-gray-500">Contact</label>
                    <p className="text-base sm:text-lg font-semibold text-gray-900">{vehicle.conductor.contact}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4 sm:space-y-6">
            {/* Vehicle Images */}
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
                <FileText className="mr-2" size={18} />
                Vehicle Images
              </h2>
              {vehicle.documents && vehicle.documents.length > 0 ? (
                <div className="space-y-3 sm:space-y-4">
                  {vehicle.documents.map((doc, index) => (
                    <div key={index} className="border rounded-lg p-3 sm:p-4">
                      <div className="mb-2 sm:mb-3">
                        <span className="text-xs sm:text-sm font-medium text-gray-700 capitalize">
                          {doc.document_type.replace('_', ' ')}
                        </span>
                      </div>
                      <img
                        src={doc.file_path}
                        alt={doc.document_type}
                        className="w-full h-32 sm:h-48 object-cover rounded border cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => window.open(doc.file_path, '_blank')}
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-6 sm:py-8 text-sm sm:text-base">No images available</p>
              )}
            </div>

            {/* Registration Details */}
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
                <Calendar className="mr-2" size={18} />
                Registration Details
              </h2>
              <div className="space-y-2 sm:space-y-3">
                <div>
                  <label className="text-xs sm:text-sm font-medium text-gray-500">Registration Date</label>
                  <p className="text-base sm:text-lg font-semibold text-gray-900">
                    {vehicle.created_at ? new Date(vehicle.created_at).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-medium text-gray-500">Status</label>
                  <p className="text-base sm:text-lg font-semibold text-gray-900">{vehicle.status}</p>
                </div>
                {vehicle.registeredBy && (
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-gray-500">Registered By</label>
                    <p className="text-base sm:text-lg font-semibold text-gray-900">{vehicle.registeredBy.name}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Tracker Link */}
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
                <Navigation className="mr-2" size={18} />
                Vehicle Tracker
              </h2>
              <div className="text-center">
                {vehicle.tracker_link && vehicle.tracker_link.trim() !== '' ? (
                  <button
                    onClick={handleTrackerClick}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 group"
                  >
                    <MapPin size={20} />
                    <span>View Location</span>
                    <ExternalLink size={16} className="group-hover:translate-x-0.5 transition-transform" />
                  </button>
                ) : (
                  <div className="py-6 sm:py-8">
                    <div className="text-gray-400 mb-2">
                      <MapPin size={32} className="mx-auto" />
                    </div>
                    <p className="text-gray-500 text-sm sm:text-base">No tracker link available</p>
                    <p className="text-gray-400 text-xs sm:text-sm mt-1">GPS tracking not configured</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
