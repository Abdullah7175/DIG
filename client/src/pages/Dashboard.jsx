import { useQuery } from "@tanstack/react-query";
import { Truck, Clock, QrCode, Users, Plus, Database, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import StatsCard from "@/components/StatsCard";

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: recentVerifications } = useQuery({
    queryKey: ["/api/verifications/recent"],
  });

  if (isLoading) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Dashboard Overview</h2>
        <p className="text-gray-600">Heavy Vehicle Management System - Real-time Statistics</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Total Registered"
          value={stats?.totalVehicles || 0}
          icon={Truck}
          trend="12% from last month"
          color="primary"
        />
        <StatsCard
          title="Pending Approval"
          value={stats?.pendingApproval || 0}
          icon={Clock}
          color="warning"
        />
        <StatsCard
          title="QR Scans Today"
          value={stats?.qrScansToday || 0}
          icon={QrCode}
          trend="8% from yesterday"
          color="secondary"
        />
        <StatsCard
          title="Active Officers"
          value={stats?.activeOfficers || 0}
          icon={Users}
          color="approved"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Link href="/register">
          <a className="bg-primary text-white p-6 rounded-lg shadow-sm hover:bg-primary/90 transition-colors text-left group block">
            <div className="flex items-center justify-between mb-4">
              <Plus className="text-2xl" />
              <ArrowRight className="text-lg opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Register New Vehicle</h3>
            <p className="text-blue-100 text-sm">Add a new heavy vehicle to the system</p>
          </a>
        </Link>

        <Link href="/verify">
          <a className="bg-secondary text-white p-6 rounded-lg shadow-sm hover:bg-secondary/90 transition-colors text-left group block">
            <div className="flex items-center justify-between mb-4">
              <QrCode className="text-2xl" />
              <ArrowRight className="text-lg opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Verify QR Code</h3>
            <p className="text-green-100 text-sm">Scan and verify vehicle QR codes</p>
          </a>
        </Link>

        <Link href="/database">
          <a className="bg-gray-700 text-white p-6 rounded-lg shadow-sm hover:bg-gray-600 transition-colors text-left group block">
            <div className="flex items-center justify-between mb-4">
              <Database className="text-2xl" />
              <ArrowRight className="text-lg opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Vehicle Database</h3>
            <p className="text-gray-300 text-sm">Search and manage vehicle records</p>
          </a>
        </Link>
      </div>

      {/* Recent Verifications */}
      {recentVerifications && recentVerifications.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Clock className="mr-2 text-primary" />
            Recent Verifications
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
