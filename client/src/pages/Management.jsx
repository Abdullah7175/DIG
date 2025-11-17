import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Car, 
  Truck, 
  Fuel, 
  MapPin, 
  Route,
  Settings,
  Users,
  FileText,
  Navigation
} from 'lucide-react';

const managementPages = [
  {
    title: 'Vehicle Categories',
    description: 'Manage vehicle categories (Bus, Truck, Car, etc.)',
    icon: Car,
    path: '/management/vehicle-categories',
    color: 'bg-blue-500'
  },
  {
    title: 'Vehicle Types',
    description: 'Manage vehicle types within each category',
    icon: Truck,
    path: '/management/vehicle-types',
    color: 'bg-green-500'
  },
  {
    title: 'Fuel Types',
    description: 'Manage available fuel types',
    icon: Fuel,
    path: '/management/fuel-types',
    color: 'bg-yellow-500'
  },
  {
    title: 'Terminals',
    description: 'Manage transportation terminals',
    icon: MapPin,
    path: '/management/terminals',
    color: 'bg-purple-500'
  },
  {
    title: 'Routes',
    description: 'Manage transportation routes',
    icon: Route,
    path: '/management/routes',
    color: 'bg-red-500'
  },
  {
    title: 'Tracker Companies',
    description: 'Manage GPS tracker companies',
    icon: Navigation,
    path: '/management/tracker-companies',
    color: 'bg-cyan-500'
  },
  {
    title: 'Users',
    description: 'Manage system users and permissions',
    icon: Users,
    path: '/users',
    color: 'bg-indigo-500'
  },
  {
    title: 'Owners',
    description: 'Manage vehicle owners',
    icon: FileText,
    path: '/owners',
    color: 'bg-teal-500'
  },
  {
    title: 'Drivers',
    description: 'Manage vehicle drivers',
    icon: Users,
    path: '/drivers',
    color: 'bg-orange-500'
  },
  {
    title: 'Conductors',
    description: 'Manage vehicle conductors',
    icon: Users,
    path: '/conductors',
    color: 'bg-pink-500'
  }
];

export default function Management() {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">System Management</h1>
        <p className="text-gray-600">Manage all system entities and configurations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {managementPages.map((page) => {
          const IconComponent = page.icon;
          return (
            <Link key={page.path} to={page.path}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${page.color}`}>
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{page.title}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm text-gray-600">
                    {page.description}
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="mt-8 p-6 bg-blue-50 rounded-lg">
        <div className="flex items-center space-x-3 mb-3">
          <Settings className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-blue-900">Quick Setup Guide</h3>
        </div>
        <div className="text-sm text-blue-800 space-y-2">
          <p><strong>1.</strong> Start by creating Vehicle Categories (Bus, Truck, Car, etc.)</p>
          <p><strong>2.</strong> Add Vehicle Types for each category (School Bus, Dumper Truck, etc.)</p>
          <p><strong>3.</strong> Configure Fuel Types (Petrol, Diesel, CNG, etc.)</p>
          <p><strong>4.</strong> Set up Terminals (Karachi Terminal, Lahore Terminal, etc.)</p>
          <p><strong>5.</strong> Create Routes linking terminals</p>
          <p><strong>6.</strong> Register Tracker Companies for GPS tracking</p>
          <p><strong>7.</strong> Manage Users, Owners, Drivers, and Conductors</p>
        </div>
      </div>
    </div>
  );
}
