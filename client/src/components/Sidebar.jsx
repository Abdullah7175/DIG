import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Truck, 
  QrCode, 
  Database, 
  Users, 
  UserCheck, 
  Car, 
  UserCog,
  Bell,
  LogOut,
  Menu,
  X,
  Settings,
  DollarSign,
  Activity,
  // MapPin, // unused while Tracking Events nav is disabled
  FileBarChart,
  EyeOff
} from "lucide-react";
import { useEffect, useState } from "react";
import { getUser, clearUser } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { FiBell } from 'react-icons/fi';
import { apiRequest } from '../lib/queryClient';

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifError, setNotifError] = useState(null);

  useEffect(() => {
    setUser(getUser());
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    const handleStorageChange = () => {
      setUser(getUser());
    };

    window.addEventListener('storage', handleStorageChange);
    
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

  async function markAsRead(id) {
    try {
      await apiRequest('POST', `/api/notifications/${id}/read`);
      setNotifications(notifications => notifications.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      toast({ title: 'Error', description: err.message || 'Error marking as read', variant: 'destructive' });
    }
  }

  const navItems = [
    { path: "/", label: "Dashboard", icon: LayoutDashboard },
    { path: "/register", label: "Register Vehicle", icon: Truck },
    // { path: "/verify", label: "Verify QR", icon: QrCode },
    { path: "/database", label: "Vehicle Database", icon: Database },
    // Tracking Events page disabled — replaced by Fleet Reports
    // { path: "/tracking", label: "Tracking Events", icon: MapPin },
    { path: "/fleet-reports", label: "Fleet Reports", icon: FileBarChart },
  ];


  const adminItems = [
    // { path: "/users", label: "Users", icon: Users },
    { path: "/management", label: "System Management", icon: Settings },
//    { path: "/management/activity-logs", label: "Activity Logs", icon: Activity },
    // { path: "/management/tracker-payments", label: "Tracker Payments", icon: DollarSign },
  ];

  const peopleItems = [
    { path: "/owners", label: "Owners", icon: UserCheck },
    { path: "/drivers", label: "Drivers", icon: Car },
    { path: "/conductors", label: "Conductors", icon: UserCog },
  ];

  const isActive = (path) => {
    if (path === "/" && location.pathname === "/") return true;
    if (path !== "/" && location.pathname.startsWith(path)) return true;
    return false;
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {}
    clearUser();
    toast({ title: "Logged out", description: "You have been logged out." });
    window.dispatchEvent(new Event('storage'));
    navigate("/login");
  };

  const NavItem = ({ item, onClick }) => {
    const Icon = item.icon;
    return (
      <Link
        to={item.path}
        onClick={onClick}
        className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
          isActive(item.path)
            ? "bg-primary text-white"
            : "text-gray-700 hover:bg-gray-100"
        }`}
      >
        <Icon className="h-5 w-5 flex-shrink-0" />
        {!isCollapsed && <span className="font-medium">{item.label}</span>}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed left-0 top-0 h-full bg-white shadow-lg z-50 transition-all duration-300
        ${isCollapsed ? 'w-16' : 'w-64'}
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          {!isCollapsed && (
            <div className="flex items-center space-x-2">
              <img src="/logo.png" alt="Logo" className="h-8 w-8" />
              <h1 className="text-lg font-semibold text-gray-900">CVI-MS</h1>
            </div>
          )}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:block p-1 rounded hover:bg-gray-100"
            >
              <Menu className="h-5 w-5" />
            </button>
            <button
              onClick={() => setIsMobileOpen(false)}
              className="lg:hidden p-1 rounded hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {/* Main Navigation */}
          <div className="space-y-1">
            {navItems.map((item) => (
              <NavItem key={item.path} item={item} onClick={() => setIsMobileOpen(false)} />
            ))}
            {user && (String(user.role) === "1" || String(user.role) === "2") && (
              <NavItem
                item={{ path: "/user-visibility", label: "User Visibility", icon: EyeOff }}
                onClick={() => setIsMobileOpen(false)}
              />
            )}
          </div>

          {/* Admin Only Navigation */}
          {user && String(user.role) === '1' && (
            <>
              <div className="pt-4">
                {!isCollapsed && (
                  <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Administration
                  </h3>
                )}
                <div className="mt-2 space-y-1">
                  {adminItems.map((item) => (
                    <NavItem key={item.path} item={item} onClick={() => setIsMobileOpen(false)} />
                  ))}
                </div>
              </div>

              {/* <div className="pt-4">
                {!isCollapsed && (
                  <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    People Management
                  </h3>
                )}
                <div className="mt-2 space-y-1">
                  {peopleItems.map((item) => (
                    <NavItem key={item.path} item={item} onClick={() => setIsMobileOpen(false)} />
                  ))}
                </div>
              </div> */}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 space-y-2">
          {/* Notifications */}
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="flex items-center space-x-3 px-3 py-2 w-full rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <div className="relative">
                <FiBell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-accent text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </div>
              {!isCollapsed && <span className="font-medium">Notifications</span>}
            </button>
            
            {showNotifications && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white shadow-lg rounded-lg p-4 max-h-64 overflow-y-auto">
                <div className="font-semibold mb-2 text-sm">Notifications</div>
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
                      className={`p-2 rounded mb-1 cursor-pointer text-sm ${
                        note.read ? 'bg-gray-100 text-gray-500' : 'bg-accent/10 text-gray-900 font-semibold'
                      }`}
                      onClick={() => !note.read && markAsRead(note.id)}
                    >
                      {note.message || note.content || 'Notification'}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* User Info */}
          {user && (
            <div className="flex items-center space-x-3 px-3 py-2">
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
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm">
                  {user.name?.[0]}
                </div>
              )}
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                  <p className="text-xs text-gray-500">
                    {String(user.role) === '1' ? 'Admin' : 
                     String(user.role) === '2' ? 'Manager' : 'User'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 px-3 py-2 w-full rounded-lg text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            {!isCollapsed && <span className="font-medium">Logout</span>}
          </button>
        </div>
      </div>

      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="fixed top-4 left-4 z-40 lg:hidden p-2 bg-white rounded-lg shadow-md"
      >
        <Menu className="h-6 w-6" />
      </button>
    </>
  );
}
