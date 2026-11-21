import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Provider } from 'react-redux';
import store from './store';
// @ts-ignore
import Sidebar from "@/components/Sidebar";
// @ts-ignore
import TopHeader from "@/components/TopHeader";
// @ts-ignore
import Dashboard from "@/pages/Dashboard";
// @ts-ignore
import VehicleRegister from "@/pages/VehicleRegister";
// @ts-ignore
import QRVerify from "@/pages/QRVerify";
// @ts-ignore
import VehicleDatabase from "@/pages/VehicleDatabase";
import NotFound from "@/pages/not-found";
// @ts-ignore
import Login from "@/pages/Login";
import { getUser, isAuthenticated } from "@/lib/utils";
import { useEffect, useState } from "react";
// @ts-ignore
import Users from './pages/Users.jsx';
import React from 'react';
// @ts-ignore
import VehicleEdit from "@/pages/VehicleEdit";
// @ts-ignore
import VehicleView from "@/pages/VehicleView";
// @ts-ignore
import PublicVehicleView from "@/pages/PublicVehicleView";
// @ts-ignore
import Owners from './pages/Owners.jsx';
// @ts-ignore
import OwnerCreate from './pages/OwnerCreate.jsx';
// @ts-ignore
import OwnerView from './pages/OwnerView.jsx';
// @ts-ignore
import OwnerEdit from './pages/OwnerEdit.jsx';
// @ts-ignore
import Drivers from './pages/Drivers.jsx';
// @ts-ignore
import DriverCreate from './pages/DriverCreate.jsx';
// @ts-ignore
import DriverView from './pages/DriverView.jsx';
// @ts-ignore
import DriverEdit from './pages/DriverEdit.jsx';
// @ts-ignore
import Conductors from './pages/Conductors.jsx';
// @ts-ignore
import ConductorCreate from './pages/ConductorCreate.jsx';
// @ts-ignore
import ConductorView from './pages/ConductorView.jsx';
// @ts-ignore
import ConductorEdit from './pages/ConductorEdit.jsx';
// @ts-ignore
import Management from './pages/Management.jsx';
// @ts-ignore
import VehicleCategories from './pages/VehicleCategories.jsx';
// @ts-ignore
import VehicleTypes from './pages/VehicleTypes.jsx';
// @ts-ignore
import FuelTypes from './pages/FuelTypes.jsx';
// @ts-ignore
import Terminals from './pages/Terminals.jsx';
// @ts-ignore
import RoutesManagement from './pages/Routes.jsx';
// @ts-ignore
import TrackerCompanies from './pages/TrackerCompanies.jsx';
// @ts-ignore
import TrackerPayments from './pages/TrackerPayments.jsx';
// @ts-ignore
import UserActivityLogs from './pages/UserActivityLogs.jsx';
// @ts-ignore
import TrackingEvents from './pages/TrackingEvents.jsx';
// @ts-ignore
import TrackingApiConfigs from './pages/TrackingApiConfigs.jsx';
// @ts-ignore
import FleetReports from './pages/FleetReports.jsx';

function AdminRoute({ children }: { children: React.ReactNode }) {
  const user = getUser();
  if (!user || String(user.role) !== "1") {
    window.location.href = "/dashboard";
    return null;
  }
  return <>{children}</>;
}

function ManagerRoute({ children }: { children: React.ReactNode }) {
  const user = getUser();
  if (!user || (String(user.role) !== "1" && String(user.role) !== "2")) {
    window.location.href = "/dashboard";
    return null;
  }
  return <>{children}</>;
}

function AdminOnlyRoute({ children }: { children: React.ReactNode }) {
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
          <Toaster />
          <TooltipProvider>
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
                  <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/" element={authed ? <Dashboard /> : <Login />} />
                    <Route path="/register" element={authed ? <VehicleRegister /> : <Login />} />
                    <Route path="/verify" element={authed ? <QRVerify /> : <Login />} />
                    <Route path="/database" element={authed ? <VehicleDatabase /> : <Login />} />
                    <Route path="/tracking" element={authed ? <TrackingEvents /> : <Login />} />
                    <Route path="/fleet-reports" element={<ManagerRoute><FleetReports /></ManagerRoute>} />
                    <Route path="/vehicles/:id/view" element={authed ? <VehicleView /> : <Login />} />
                    <Route path="/vehicles/:id/edit" element={authed ? <VehicleEdit /> : <Login />} />
                    <Route path="/users" element={<AdminRoute><Users /></AdminRoute>} />
                    <Route path="/owners" element={<AdminRoute><Owners /></AdminRoute>} />
                    <Route path="/owners/create" element={<AdminRoute><OwnerCreate /></AdminRoute>} />
                    <Route path="/owners/:id" element={<AdminRoute><OwnerView /></AdminRoute>} />
                    <Route path="/owners/:id/edit" element={<AdminRoute><OwnerEdit /></AdminRoute>} />
                    <Route path="/drivers" element={<AdminRoute><Drivers /></AdminRoute>} />
                    <Route path="/drivers/create" element={<AdminRoute><DriverCreate /></AdminRoute>} />
                    <Route path="/drivers/:id" element={<AdminRoute><DriverView /></AdminRoute>} />
                    <Route path="/drivers/:id/edit" element={<AdminRoute><DriverEdit /></AdminRoute>} />
                    <Route path="/conductors" element={<AdminRoute><Conductors /></AdminRoute>} />
                    <Route path="/conductors/create" element={<AdminRoute><ConductorCreate /></AdminRoute>} />
                    <Route path="/conductors/:id" element={<AdminRoute><ConductorView /></AdminRoute>} />
                    <Route path="/conductors/:id/edit" element={<AdminRoute><ConductorEdit /></AdminRoute>} />
                    <Route path="/management" element={<AdminOnlyRoute><Management /></AdminOnlyRoute>} />
                    <Route path="/management/vehicle-categories" element={<AdminOnlyRoute><VehicleCategories /></AdminOnlyRoute>} />
                    <Route path="/management/vehicle-types" element={<AdminOnlyRoute><VehicleTypes /></AdminOnlyRoute>} />
                    <Route path="/management/fuel-types" element={<AdminOnlyRoute><FuelTypes /></AdminOnlyRoute>} />
                    <Route path="/management/terminals" element={<AdminOnlyRoute><Terminals /></AdminOnlyRoute>} />
                    <Route path="/management/routes" element={<AdminOnlyRoute><RoutesManagement /></AdminOnlyRoute>} />
                    <Route path="/management/tracker-companies" element={<AdminOnlyRoute><TrackerCompanies /></AdminOnlyRoute>} />
                    <Route path="/management/tracker-payments" element={<AdminOnlyRoute><TrackerPayments /></AdminOnlyRoute>} />
                    <Route path="/management/activity-logs" element={<AdminOnlyRoute><UserActivityLogs /></AdminOnlyRoute>} />
                    <Route path="/management/tracking-api-configs" element={<AdminOnlyRoute><TrackingApiConfigs /></AdminOnlyRoute>} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </div>
              </>
            } />
          </Routes>
        </div>
          </TooltipProvider>
      </BrowserRouter>
    </QueryClientProvider>
    </Provider>
  );
}

export default App;
