import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Provider } from 'react-redux';
import store from './store';
import { getUser, isAuthenticated } from "@/lib/utils";
import { useEffect, useState, lazy, Suspense } from "react";
import React from 'react';

// Core components - loaded immediately
import Sidebar from "@/components/Sidebar";
import TopHeader from "@/components/TopHeader";
import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";

// Lazy load pages for code splitting - reduces initial bundle size
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const VehicleRegister = lazy(() => import("@/pages/VehicleRegister"));
const QRVerify = lazy(() => import("@/pages/QRVerify"));
const VehicleDatabase = lazy(() => import("@/pages/VehicleDatabase"));
const VehicleEdit = lazy(() => import("@/pages/VehicleEdit"));
const VehicleView = lazy(() => import("@/pages/VehicleView"));
const PublicVehicleView = lazy(() => import("@/pages/PublicVehicleView"));
const Users = lazy(() => import('./pages/Users.jsx'));
const Owners = lazy(() => import('./pages/Owners.jsx'));
const OwnerCreate = lazy(() => import('./pages/OwnerCreate.jsx'));
const OwnerView = lazy(() => import('./pages/OwnerView.jsx'));
const OwnerEdit = lazy(() => import('./pages/OwnerEdit.jsx'));
const Drivers = lazy(() => import('./pages/Drivers.jsx'));
const DriverCreate = lazy(() => import('./pages/DriverCreate.jsx'));
const DriverView = lazy(() => import('./pages/DriverView.jsx'));
const DriverEdit = lazy(() => import('./pages/DriverEdit.jsx'));
const Conductors = lazy(() => import('./pages/Conductors.jsx'));
const ConductorCreate = lazy(() => import('./pages/ConductorCreate.jsx'));
const ConductorView = lazy(() => import('./pages/ConductorView.jsx'));
const ConductorEdit = lazy(() => import('./pages/ConductorEdit.jsx'));
const Management = lazy(() => import('./pages/Management.jsx'));
const VehicleCategories = lazy(() => import('./pages/VehicleCategories.jsx'));
const VehicleTypes = lazy(() => import('./pages/VehicleTypes.jsx'));
const FuelTypes = lazy(() => import('./pages/FuelTypes.jsx'));
const Terminals = lazy(() => import('./pages/Terminals.jsx'));
const RoutesManagement = lazy(() => import('./pages/Routes.jsx'));
const TrackerCompanies = lazy(() => import('./pages/TrackerCompanies.jsx'));
const SimpleTracking = lazy(() => import('./components/Tracking/SimpleTracking.jsx'));
const TrackingLayout = lazy(() => import('./components/Tracking/TrackingLayout.jsx'));
const TrackerManagement = lazy(() => import('./components/Tracking/TrackerManagement.jsx'));
const TrackingReports = lazy(() => import('./components/Tracking/Reports.jsx'));
const Geofences = lazy(() => import('./components/Tracking/Geofences.jsx'));
const TrackingAlerts = lazy(() => import('./components/Tracking/Alerts.jsx'));
const TrackingSettings = lazy(() => import('./components/Tracking/Settings.jsx'));
const LiveTracking = lazy(() => import('./components/Tracking/LiveTracking.jsx'));

// Loading component for Suspense fallback
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

function AdminRoute({ children }: { children: React.ReactNode }) {
  const user = getUser();
  if (!user || String(user.role) !== "1") {
    window.location.href = "/dashboard";
    return null;
  }
  return <>{children}</>;
}

function App() {
  const [authed, setAuthed] = useState(isAuthenticated());

  useEffect(() => {
    // Listen for storage changes to update auth state
    const handleStorageChange = () => {
      setAuthed(isAuthenticated());
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also check auth state periodically in case of same-tab changes
    const interval = setInterval(() => {
      const currentAuth = isAuthenticated();
      if (currentAuth !== authed) {
        setAuthed(currentAuth);
      }
    }, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [authed]);

  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <div className="bg-gray-50 min-h-screen">
          <Routes>
            {/* Public route - no sidebar */}
            <Route path="/public/vehicle/:id" element={<PublicVehicleView />} />
            
            {/* Authenticated routes - with sidebar */}
            <Route path="/*" element={
              <>
                {authed && <Sidebar />}
                {authed && <TopHeader />}
                <div className={`${authed ? 'lg:ml-64 pt-16' : ''} transition-all duration-300`}>
                  <Suspense fallback={<LoadingFallback />}>
                    <Routes>
                      <Route path="/login" element={<Login />} />
                      <Route path="/" element={authed ? <Dashboard /> : <Login />} />
                      <Route path="/register" element={authed ? <VehicleRegister /> : <Login />} />
                      <Route path="/verify" element={authed ? <QRVerify /> : <Login />} />
                      <Route path="/database" element={authed ? <VehicleDatabase /> : <Login />} />
                      <Route path="/vehicles/:id/view" element={authed ? <VehicleView /> : <Login />} />
                      <Route path="/vehicles/:id/edit" element={authed ? <VehicleEdit /> : <Login />} />
                      <Route path="/users" element={<AdminRoute><Users /></AdminRoute>} />
                      <Route path="/owners" element={<Owners />} />
                      <Route path="/owners/create" element={<OwnerCreate />} />
                      <Route path="/owners/:id" element={<OwnerView />} />
                      <Route path="/owners/:id/edit" element={<OwnerEdit />} />
                      <Route path="/drivers" element={<Drivers />} />
                      <Route path="/drivers/create" element={<DriverCreate />} />
                      <Route path="/drivers/:id" element={<DriverView />} />
                      <Route path="/drivers/:id/edit" element={<DriverEdit />} />
                      <Route path="/conductors" element={<Conductors />} />
                      <Route path="/conductors/create" element={<ConductorCreate />} />
                      <Route path="/conductors/:id" element={<ConductorView />} />
                      <Route path="/conductors/:id/edit" element={<ConductorEdit />} />
                      <Route path="/management" element={<AdminRoute><Management /></AdminRoute>} />
                      <Route path="/management/vehicle-categories" element={<AdminRoute><VehicleCategories /></AdminRoute>} />
                      <Route path="/management/vehicle-types" element={<AdminRoute><VehicleTypes /></AdminRoute>} />
                      <Route path="/management/fuel-types" element={<AdminRoute><FuelTypes /></AdminRoute>} />
                      <Route path="/management/terminals" element={<AdminRoute><Terminals /></AdminRoute>} />
                      <Route path="/management/routes" element={<AdminRoute><RoutesManagement /></AdminRoute>} />
                      <Route path="/management/tracker-companies" element={<AdminRoute><TrackerCompanies /></AdminRoute>} />
                      {/* Tracking Routes */}
                      <Route path="/tracking" element={authed ? <SimpleTracking /> : <Login />} />
                      <Route path="/tracking/devices" element={authed ? <TrackingLayout><TrackerManagement /></TrackingLayout> : <Login />} />
                      <Route path="/tracking/reports" element={authed ? <TrackingLayout><TrackingReports /></TrackingLayout> : <Login />} />
                      <Route path="/tracking/geofences" element={authed ? <TrackingLayout><Geofences /></TrackingLayout> : <Login />} />
                      <Route path="/tracking/alerts" element={authed ? <TrackingLayout><TrackingAlerts /></TrackingLayout> : <Login />} />
                      <Route path="/tracking/settings" element={authed ? <TrackingLayout><TrackingSettings /></TrackingLayout> : <Login />} />
                      <Route path="/tracking/live" element={authed ? <TrackingLayout><LiveTracking /></TrackingLayout> : <Login />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </div>
              </>
            } />
          </Routes>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
    </Provider>
  );
}

export default App;
