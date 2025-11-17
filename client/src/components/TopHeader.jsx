import { LogOut, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getUser, clearUser } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function TopHeader() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState(null);

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

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {}
    clearUser();
    toast({ title: "Logged out", description: "You have been logged out." });
    window.dispatchEvent(new Event('storage'));
    navigate("/login");
  };

  if (!user) return null;

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-64 h-16 bg-white border-b border-gray-200 z-30 flex items-center justify-between px-4 lg:px-6 shadow-sm">
      <div className="flex-1"></div>
      
      {/* User Info and Logout */}
      <div className="flex items-center gap-4">
        {/* User Info */}
        <div className="flex items-center gap-3">
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
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
              {user.name?.[0]?.toUpperCase() || <User className="h-4 w-4" />}
            </div>
          )}
          <div className="hidden md:block">
            <p className="text-sm font-medium text-gray-900">{user.name}</p>
            <p className="text-xs text-gray-500">
              {String(user.role) === '1' ? 'Administrator' : 'Officer'}
            </p>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Logout"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}

