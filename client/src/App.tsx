import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Navigation from "@/components/Navigation";
import Dashboard from "@/pages/Dashboard";
import VehicleRegister from "@/pages/VehicleRegister";
import QRVerify from "@/pages/QRVerify";
import VehicleDatabase from "@/pages/VehicleDatabase";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <div className="bg-gray-50 min-h-screen">
      <Navigation />
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/register" component={VehicleRegister} />
        <Route path="/verify" component={QRVerify} />
        <Route path="/database" component={VehicleDatabase} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
