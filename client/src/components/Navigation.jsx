import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  Bell, Truck, ChevronDown, Menu, LogOut, MapPin, Shield, FileText, Send, BarChart3,
  Home, Car, Users, Settings, Database, QrCode, Eye, Activity, Route, Calendar,
  AlertTriangle, Camera, Mic, Phone, MessageSquare, Download, Upload, Power,
  Lock, Unlock, RefreshCw, Clock, Gauge, Target, Navigation, Globe, User,
  Mail, Phone as PhoneIcon, Star, Archive, MoreHorizontal, Search, Filter,
  Plus, Edit, Trash2, Copy, Save, Play, Pause, Square, RotateCcw, Zap,
  Battery, Signal, Wifi, WifiOff, Volume2, VolumeX, EyeOff, CheckCircle,
  AlertCircle, Info, HelpCircle, ExternalLink, ChevronRight, ChevronLeft
} from "lucide-react";
import { useEffect, useState } from "react";
import { getUser, clearUser } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { FiBell } from 'react-icons/fi';
import { apiRequest } from '../lib/queryClient';

export default function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showTrackingDropdown, setShowTrackingDropdown] = useState(false);
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifError, setNotifError] = useState(null);

  useEffect(() => {
    setUser(getUser());
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showTrackingDropdown && !event.target.closest('.tracking-dropdown')) {
        setShowTrackingDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTrackingDropdown]);

  // Listen for auth state changes
  useEffect(() => {
    const handleStorageChange = () => {
      setUser(getUser());
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also check auth state periodically in case of same-tab changes
    const interval = setInterval(() => {
      const currentUser = getUser();
      if (JSON.stringify(currentUser) !== JSON.stringify(user)) {
        setUser(currentUser);
      }
    }, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [user]);

  // Fetch notifications when dropdown is opened
  useEffect(() => {
    if (showNotifications && user) {
      setNotifLoading(true);
      setNotifError(null);
      apiRequest('GET', '/api/notifications')
        .then(async res => {
          if (!res.ok) throw new Error('Failed to fetch notifications');
          const data = await res.json();
          setNotifications(data);
        })
        .catch(err => {
          setNotifError(err.message || 'Error fetching notifications');
          toast({ title: 'Error', description: err.message || 'Error fetching notifications', variant: 'destructive' });
        })
        .finally(() => setNotifLoading(false));
    }
  }, [showNotifications, user, toast]);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Optionally, mark notification as read
  async function markAsRead(id) {
    try {
      await apiRequest('POST', `/api/notifications/${id}/read`);
      setNotifications(notifications => notifications.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      toast({ title: 'Error', description: err.message || 'Error marking as read', variant: 'destructive' });
    }
  }

  const navItems = [
    { path: "/", label: "Dashboard", icon: Home },
    { path: "/register", label: "Register Vehicle", icon: Plus },
    { path: "/verify", label: "Verify QR", icon: QrCode },
    { path: "/database", label: "Vehicle Database", icon: Database },
  ];

  const trackingItems = [
    { path: "/tracking", label: "Live Tracking", icon: MapPin, description: "Real-time vehicle tracking" },
    { path: "/tracking/devices", label: "Device Management", icon: Truck, description: "Manage tracking devices" },
    { path: "/tracking/geofences", label: "Geofences", icon: Shield, description: "Define geographical areas" },
    { path: "/tracking/reports", label: "Reports", icon: FileText, description: "Generate tracking reports" },
    { path: "/tracking/commands", label: "Commands", icon: Send, description: "Send device commands" },
    { path: "/tracking/events", label: "Events", icon: AlertTriangle, description: "View device events" },
    { path: "/tracking/statistics", label: "Statistics", icon: BarChart3, description: "View tracking statistics" },
    { path: "/tracking/calendar", label: "Calendar", icon: Calendar, description: "Schedule tracking events" },
    { path: "/tracking/attributes", label: "Attributes", icon: Settings, description: "Configure device attributes" },
    { path: "/tracking/notifications", label: "Notifications", icon: Bell, description: "Manage notifications" },
    { path: "/tracking/maintenance", label: "Maintenance", icon: Settings, description: "Device maintenance" },
    { path: "/tracking/drivers", label: "Drivers", icon: Users, description: "Manage drivers" },
    { path: "/tracking/groups", label: "Groups", icon: Users, description: "Device groups" },
    { path: "/tracking/servers", label: "Servers", icon: Globe, description: "Server configuration" },
    { path: "/tracking/statistics", label: "Statistics", icon: BarChart3, description: "System statistics" },
    { path: "/tracking/logs", label: "Logs", icon: FileText, description: "System logs" },
    { path: "/tracking/backup", label: "Backup", icon: Download, description: "Backup data" },
    { path: "/tracking/restore", label: "Restore", icon: Upload, description: "Restore data" },
    { path: "/tracking/import", label: "Import", icon: Upload, description: "Import data" },
    { path: "/tracking/export", label: "Export", icon: Download, description: "Export data" },
    { path: "/tracking/plugins", label: "Plugins", icon: Settings, description: "Manage plugins" },
    { path: "/tracking/help", label: "Help", icon: HelpCircle, description: "Help and documentation" },
    { path: "/tracking/about", label: "About", icon: Info, description: "About the system" }
  ];

  // Group tracking items by category
  const trackingCategories = [
    {
      name: "Core Features",
      items: trackingItems.slice(0, 5)
    },
    {
      name: "Monitoring",
      items: trackingItems.slice(5, 8)
    },
    {
      name: "Management",
      items: trackingItems.slice(8, 12)
    },
    {
      name: "System",
      items: trackingItems.slice(12, 16)
    },
    {
      name: "Data",
      items: trackingItems.slice(16, 20)
    },
    {
      name: "Support",
      items: trackingItems.slice(20, 23)
    }
  ];

  const isActive = (path) => {
    if (path === "/" && location.pathname === "/") return true;
    if (path !== "/" && location.pathname.startsWith(path)) return true;
    return false;
  };

  const isTrackingActive = () => {
    return location.pathname.startsWith('/tracking');
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {}
    clearUser();
    toast({ title: "Logged out", description: "You have been logged out." });
    // Trigger storage event to notify Navigation component
    window.dispatchEvent(new Event('storage'));
    navigate("/login");
  };

  // Add a debug log to see the user object
  console.log('Header user:', user);

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
            <img src="/logo.png" alt="Logo" className="mx-auto h-10 w-10 mb-2" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900">CVI-MS Portal</h1>
          </div>

          <div className="hidden md:flex items-center space-x-6">
            {navItems.map((item) => (
              <Link 
                key={item.path} 
                to={item.path}
                  className={`transition-colors ${
                    isActive(item.path)
                      ? "text-primary font-medium border-b-2 border-primary pb-1"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {item.label}
              </Link>
            ))}
            
            {/* Tracking Dropdown */}
            <div className="relative tracking-dropdown">
              <button
                onClick={() => setShowTrackingDropdown(!showTrackingDropdown)}
                className={`flex items-center space-x-1 transition-colors ${
                  isTrackingActive()
                    ? "text-primary font-medium border-b-2 border-primary pb-1"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <MapPin className="h-4 w-4" />
                <span>Tracking</span>
                <ChevronDown className="h-4 w-4" />
              </button>
              
              {showTrackingDropdown && (
                <div className="absolute top-full left-0 mt-1 w-80 bg-white shadow-lg rounded-md border border-gray-200 z-50 max-h-96 overflow-y-auto">
                  {trackingCategories.map((category, categoryIndex) => (
                    <div key={category.name}>
                      {categoryIndex > 0 && <div className="border-t border-gray-100"></div>}
                      <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        {category.name}
                      </div>
                      {category.items.map((item) => (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={`flex items-start space-x-3 px-4 py-3 text-sm transition-colors ${
                            isActive(item.path)
                              ? "text-primary bg-primary/10"
                              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                          }`}
                          onClick={() => setShowTrackingDropdown(false)}
                        >
                          <item.icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium">{item.label}</div>
                            {item.description && (
                              <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Admin-only Users tab */}
            {user && String(user.role) === '1' && (
              <Link 
                to="/users"
                className={`transition-colors ${
                  location.pathname === '/users'
                    ? "text-primary font-medium border-b-2 border-primary pb-1"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Users
              </Link>
            )}
            {/* People Management Links */}
            {user && String(user.role) === '1' && (
              <div className="flex items-center space-x-2">
                <span className="text-gray-600 text-sm">Drivers & Helpers</span>
                <Link 
                  to="/owners"
                  className={`transition-colors ${
                    location.pathname === '/owners'
                      ? "text-primary font-medium border-b-2 border-primary pb-1"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Owners
                </Link>
                <Link 
                  to="/drivers"
                  className={`transition-colors ${
                    location.pathname === '/drivers'
                      ? "text-primary font-medium border-b-2 border-primary pb-1"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Drivers
                </Link>
                <Link 
                  to="/conductors"
                  className={`transition-colors ${
                    location.pathname === '/conductors'
                      ? "text-primary font-medium border-b-2 border-primary pb-1"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Conductors/Helpers
                </Link>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* Notification Bell */}
            <div className="relative">
              <button onClick={() => setShowNotifications(v => !v)} className="relative focus:outline-none">
                <FiBell size={22} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-accent text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-64 bg-white shadow-lg rounded p-4 z-50 max-h-80 overflow-y-auto">
                  <div className="font-semibold mb-2">Notifications</div>
                  {notifLoading ? (
                    <div className="text-gray-500 text-sm">Loading...</div>
                  ) : notifError ? (
                    <div className="text-red-500 text-sm">{notifError}</div>
                  ) : notifications.length === 0 ? (
                    <div className="text-gray-500 text-sm">No notifications yet.</div>
                  ) : (
                    notifications.map(note => (
                      <div
                        key={note.id}
                        className={`p-2 rounded mb-1 cursor-pointer ${note.read ? 'bg-gray-100 text-gray-500' : 'bg-accent/10 text-gray-900 font-semibold'}`}
                        onClick={() => !note.read && markAsRead(note.id)}
                      >
                        {note.message || note.content || 'Notification'}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            {/* User Avatar and Name */}
            {user && (
              <div className="flex items-center gap-2">
                {user.image ? (
                  <img
                    src={
                      user.image.startsWith('http') || user.image.startsWith('/uploads/')
                        ? user.image
                        : `/uploads/${user.image.replace(/^.*[\\/]/, '')}`
                    }
                    alt="avatar"
                    className="w-8 h-8 rounded-full object-cover"
                    onError={e => { e.target.onerror = null; e.target.src = '/logo.png'; }}
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">{user.name?.[0]}</div>
                )}
                <span className="font-medium">{user.name}</span>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="ml-2 text-gray-400 hover:text-red-600 flex items-center transition-colors"
              title="Logout"
            >
              <LogOut className="h-5 w-5 mr-1" />
              <span className="text-xs font-medium">Logout</span>
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              className="p-2 text-gray-600"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <Menu className="text-lg" />
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4">
            {navItems.map((item) => (
              <Link 
                key={item.path} 
                to={item.path}
                className={`block px-4 py-2 text-sm transition-colors ${
                  isActive(item.path)
                    ? "text-primary font-medium bg-primary/10"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            
            {/* Tracking Section */}
            <div className="px-4 py-2">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Tracking
              </div>
              {trackingItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-2 px-4 py-2 text-sm transition-colors ${
                    isActive(item.path)
                      ? "text-primary font-medium bg-primary/10"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
            {/* Admin-only Users tab */}
            {user && String(user.role) === '1' && (
              <Link 
                to="/users"
                className={`block px-4 py-2 text-sm transition-colors ${
                  location.pathname === '/users'
                    ? "text-primary font-medium bg-primary/10"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Users
              </Link>
            )}
            {/* People Management Links */}
            {user && String(user.role) === '1' && (
              <div className="block px-4 py-2 text-sm transition-colors">
                <span className="text-gray-600 text-sm">People</span>
                <Link 
                  to="/owners"
                  className={`block px-4 py-2 text-sm transition-colors ${
                    location.pathname === '/owners'
                      ? "text-primary font-medium bg-primary/10"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Owners
                </Link>
                <Link 
                  to="/drivers"
                  className={`block px-4 py-2 text-sm transition-colors ${
                    location.pathname === '/drivers'
                      ? "text-primary font-medium bg-primary/10"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Drivers
                </Link>
                <Link 
                  to="/conductors"
                  className={`block px-4 py-2 text-sm transition-colors ${
                    location.pathname === '/conductors'
                      ? "text-primary font-medium bg-primary/10"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Conductors
                </Link>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="mt-4 w-full flex items-center justify-center text-gray-400 hover:text-red-600 transition-colors"
            >
              <LogOut className="h-5 w-5 mr-1" />
              <span className="text-xs font-medium">Logout</span>
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
