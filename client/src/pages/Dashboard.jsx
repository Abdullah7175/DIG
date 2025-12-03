import { useQuery } from "@tanstack/react-query";
import { 
  Truck, 
  Clock, 
  QrCode, 
  Users, 
  User, 
  Car, 
  Bus, 
  FileText,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  XCircle,
  Calendar,
  BarChart3,
  PieChart,
  Activity,
  Settings,
  Fuel,
  MapPin,
  Route,
  Navigation,
  Layers,
  Tag,
  Map,
  Gauge
} from "lucide-react";
import { Link } from "react-router-dom";
import StatsCard from "@/components/StatsCard";
import { getUser } from "@/lib/utils";

export default function Dashboard() {
  const user = getUser();
  const canAddVehicles = user && (user.role === '1' || user.role === '2' || user.role === '4'); // admin, manager, or consultant
  
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: recentVerifications } = useQuery({
    queryKey: ["/api/verifications/recent"],
  });


  if (isLoading) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  const getVehicleTypeIcon = (type) => {
    switch (type) {
      case "bus":
        return <Bus className="text-blue-600" size={20} />;
      case "car":
        return <Car className="text-green-600" size={20} />;
      default:
        return <Truck className="text-orange-600" size={20} />;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "active":
        return <CheckCircle className="text-green-600" size={16} />;
      case "pending":
        return <Clock className="text-yellow-600" size={16} />;
      case "rejected":
        return <XCircle className="text-red-600" size={16} />;
      case "suspended":
        return <AlertCircle className="text-gray-600" size={16} />;
      default:
        return <AlertCircle className="text-gray-600" size={16} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "text-green-600 bg-green-50";
      case "pending":
        return "text-yellow-600 bg-yellow-50";
      case "rejected":
        return "text-red-600 bg-red-50";
      case "suspended":
        return "text-gray-600 bg-gray-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Overview</h1>
        <p className="text-gray-600">City Vehicle Management System - Real-time Statistics & Analytics</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Total Vehicles"
          value={stats?.totalVehicles || 0}
          icon={Truck}
          trend="+12% from last month"
          color="primary"
        />
        <StatsCard
          title="QR Scans Today"
          value={stats?.qrScansToday || 0}
          icon={QrCode}
          trend="+8% from yesterday"
          color="secondary"
        />
        <StatsCard
          title="Active Officers"
          value={stats?.activeOfficers || 0}
          icon={Users}
          color="approved"
        />
      </div>

      {/* People Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatsCard
          title="Total Owners"
          value={stats?.totalOwners || 0}
          icon={User}
          color="primary"
        />
        <StatsCard
          title="Total Drivers"
          value={stats?.totalDrivers || 0}
          icon={Car}
          color="secondary"
        />
        <StatsCard
          title="Total Conductors"
          value={stats?.totalConductors || 0}
          icon={Bus}
          color="approved"
        />
      </div>

      {/* System Management Statistics */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">System Management</h2>
          <Link to="/management" className="text-primary hover:text-primary/80 text-sm font-medium flex items-center">
            <Settings className="mr-1" size={16} />
            Manage All →
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatsCard
            title="Vehicle Categories"
            value={stats?.totalVehicleCategories || 0}
            icon={Layers}
            color="primary"
            description="Bus, Truck, Car, etc."
          />
          <StatsCard
            title="Vehicle Types"
            value={stats?.totalVehicleTypes || 0}
            icon={Tag}
            color="secondary"
            description="School Bus, Public Transport, etc."
          />
          <StatsCard
            title="Fuel Types"
            value={stats?.totalFuelTypes || 0}
            icon={Fuel}
            color="approved"
            description="Petrol, CNG, Diesel, etc."
          />
          <StatsCard
            title="Terminals"
            value={stats?.totalTerminals || 0}
            icon={MapPin}
            color="warning"
            description="Bus stops & terminals"
          />
          <StatsCard
            title="Routes"
            value={stats?.totalRoutes || 0}
            icon={Route}
            color="secondary"
            description="Bus routes & paths"
          />
          <StatsCard
            title="Tracker Companies"
            value={stats?.totalTrackerCompanies || 0}
            icon={Navigation}
            color="primary"
            description="GPS tracking providers"
          />
        </div>
      </div>

      {/* Tracking Statistics - Temporarily disabled again */}
      {/* {trackingStats.isConnected && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Live Tracking Status</h2>
            <Link to="/tracking/devices" className="text-primary hover:text-primary/80 text-sm font-medium flex items-center">
              <Map className="mr-1" size={16} />
              View Device Management →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard
              title="Online Devices"
              value={trackingStats.onlineDevices}
              icon={CheckCircle}
              color="approved"
              description="Currently connected"
            />
            <StatsCard
              title="Offline Devices"
              value={trackingStats.offlineDevices}
              icon={XCircle}
              color="warning"
              description="Not responding"
            />
            <StatsCard
              title="Recent Events"
              value={trackingStats.recentEvents}
              icon={Activity}
              color="secondary"
              description="Last 24 hours"
            />
            <StatsCard
              title="Connection Status"
              value={trackingStats.isConnected ? "Connected" : "Disconnected"}
              icon={trackingStats.isConnected ? Wifi : WifiOff}
              color={trackingStats.isConnected ? "approved" : "warning"}
              description="System status"
            />
          </div>
        </div>
      )} */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Vehicle Types Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <PieChart className="mr-2 text-primary" size={20} />
              Vehicle Types Distribution
            </h3>
          </div>
          <div className="space-y-4">
            {stats?.vehiclesByType?.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getVehicleTypeIcon(item.type)}
                  <span className="font-medium text-gray-700 capitalize">
                    {item.type || 'Unknown'}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full" 
                      style={{ 
                        width: `${(item.count / (stats?.totalVehicles || 1)) * 100}%` 
                      }}
                    ></div>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 w-8 text-right">
                    {item.count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Vehicle Status Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <BarChart3 className="mr-2 text-secondary" size={20} />
              Vehicle Status Overview
            </h3>
          </div>
          <div className="space-y-4">
            {stats?.vehiclesByStatus?.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(item.status)}
                  <span className="font-medium text-gray-700 capitalize">
                    {item.status || 'Unknown'}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        item.status === 'active' ? 'bg-green-500' :
                        item.status === 'pending' ? 'bg-yellow-500' :
                        item.status === 'rejected' ? 'bg-red-500' :
                        'bg-gray-500'
                      }`}
                      style={{ 
                        width: `${(item.count / (stats?.totalVehicles || 1)) * 100}%` 
                      }}
                    ></div>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 w-8 text-right">
                    {item.count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Recent Registrations */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Activity className="mr-2 text-primary" size={20} />
              Recent Vehicle Registrations
            </h3>
            <Link to="/database" className="text-primary hover:text-primary/80 text-sm font-medium">
              View All →
            </Link>
          </div>
          <div className="space-y-4">
            {stats?.recentRegistrations?.length > 0 ? (
              stats.recentRegistrations.map((vehicle, index) => (
                <div key={vehicle.id || index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    {getVehicleTypeIcon(vehicle.vehicle_category)}
                    <div>
                      <p className="font-medium text-gray-900">{vehicle.registration_number}</p>
                      <p className="text-sm text-gray-600">{vehicle.owner_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(vehicle.status)}`}>
                      {vehicle.status}
                    </span>
                    <span className="text-sm text-gray-500">
                      {new Date(vehicle.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText size={48} className="mx-auto mb-4 text-gray-300" />
                <p>No recent registrations</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <TrendingUp className="mr-2 text-primary" size={20} />
              Quick Actions
            </h3>
            <div className="space-y-3">
              {canAddVehicles && (
                <Link to="/register" className="block">
                  <div className="bg-primary text-white p-4 rounded-lg hover:bg-primary/90 transition-colors text-left group">
                    <div className="flex items-center justify-between mb-2">
                      <Truck className="text-xl" />
                      <span className="text-sm opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                    </div>
                    <h4 className="font-semibold mb-1">Register Vehicle</h4>
                    <p className="text-blue-100 text-sm">Add new vehicle</p>
                  </div>
                </Link>
              )}

              <Link to="/verify" className="block">
                <div className="bg-secondary text-white p-4 rounded-lg hover:bg-secondary/90 transition-colors text-left group">
                  <div className="flex items-center justify-between mb-2">
                    <QrCode className="text-xl" />
                    <span className="text-sm opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                  </div>
                  <h4 className="font-semibold mb-1">Verify QR Code</h4>
                  <p className="text-green-100 text-sm">Scan vehicle QR</p>
                </div>
              </Link>

              <Link to="/database" className="block">
                <div className="bg-gray-700 text-white p-4 rounded-lg hover:bg-gray-600 transition-colors text-left group">
                  <div className="flex items-center justify-between mb-2">
                    <FileText className="text-xl" />
                    <span className="text-sm opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                  </div>
                  <h4 className="font-semibold mb-1">Vehicle Database</h4>
                  <p className="text-gray-300 text-sm">Manage records</p>
                </div>
              </Link>

              {/* Temporarily disabled again */}
              {/* {trackingStats.isConnected && (
                <Link to="/tracking/devices" className="block">
                  <div className="bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 transition-colors text-left group">
                    <div className="flex items-center justify-between mb-2">
                      <Map className="text-xl" />
                      <span className="text-sm opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                    </div>
                    <h4 className="font-semibold mb-1">Device Management</h4>
                    <p className="text-blue-100 text-sm">Manage GPS devices</p>
                  </div>
                </Link>
              )} */}
            </div>
          </div>

          {/* Monthly Trend */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Calendar className="mr-2 text-secondary" size={20} />
              Monthly Registrations
            </h3>
            <div className="space-y-3">
              {stats?.monthlyRegistrations?.slice(-3).map((month, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {new Date(month.month + '-01').toLocaleDateString('en-US', { 
                      month: 'short', 
                      year: 'numeric' 
                    })}
                  </span>
                  <span className="font-semibold text-gray-900">{month.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Verifications */}
      {recentVerifications && recentVerifications.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <QrCode className="mr-2 text-primary" size={20} />
            Recent QR Verifications
          </h3>
          <div className="space-y-3">
            {recentVerifications.slice(0, 5).map((verification, index) => (
              <div key={verification.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${
                    verification.verification_result === 'success' ? 'bg-secondary' : 'bg-accent'
                  }`}></div>
                  <div>
                    <p className="font-medium text-gray-900">Vehicle #{verification.vehicle_id}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(verification.verified_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <span className={`text-sm font-medium ${
                  verification.verification_result === 'success' ? 'text-secondary' : 'text-accent'
                }`}>
                  {verification.verification_result === 'success' ? 'Verified' : 'Failed'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}