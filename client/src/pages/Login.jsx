import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { setUser } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Clock, Ban } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [blockedUntil, setBlockedUntil] = useState(null);
  const [secondsRemaining, setSecondsRemaining] = useState(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Countdown timer for blocked attempts
  useEffect(() => {
    if (blockedUntil && secondsRemaining !== null && secondsRemaining > 0) {
      const timer = setInterval(() => {
        const now = new Date().getTime();
        const blocked = new Date(blockedUntil).getTime();
        const remaining = Math.ceil((blocked - now) / 1000);
        
        if (remaining <= 0) {
          setBlockedUntil(null);
          setSecondsRemaining(null);
          setError("");
          setWarning("");
        } else {
          setSecondsRemaining(remaining);
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [blockedUntil, secondsRemaining]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setWarning("");
    setLoading(true);
    
    // Check if still blocked
    if (blockedUntil && secondsRemaining && secondsRemaining > 0) {
      setError(`Please wait ${secondsRemaining} seconds before trying again.`);
      setLoading(false);
      return;
    }
    
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setUser(data.user);
        toast({ title: "Login successful", description: "Welcome!", variant: "default" });
        // Reset all error states
        setError("");
        setWarning("");
        setBlockedUntil(null);
        setSecondsRemaining(null);
        setIsBlocked(false);
        // Trigger storage event to notify App component
        window.dispatchEvent(new Event('storage'));
        navigate("/");
      } else if (res.status === 429) {
        // Too many attempts - show countdown
        setBlockedUntil(data.blockedUntil || null);
        setSecondsRemaining(data.secondsRemaining || 60);
        setError(data.error || "Too many failed attempts");
        setWarning("");
        toast({
          title: "Account Temporarily Locked",
          description: `Please wait ${data.secondsRemaining || 60} seconds before trying again.`,
          variant: "destructive",
        });
      } else if (res.status === 403 && data.blocked) {
        // Account permanently blocked
        setIsBlocked(true);
        setError(data.error || "Account is blocked");
        setWarning("");
        toast({
          title: "Account Blocked",
          description: "Your account has been blocked. Please contact administrator.",
          variant: "destructive",
        });
      } else {
        // Regular error with warning
        setError(data.error || "Login failed");
        if (data.warning) {
          setWarning(data.warning);
          toast({
            title: "Login Failed",
            description: data.warning,
            variant: "destructive",
          });
        }
      }
      } catch (err) {
        setError(err.message || "Login failed");
        toast({
          title: "Error",
          description: "An error occurred. Please try again.",
          variant: "destructive",
        });
      } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md"
      >
        <div className="mb-6 text-center">
          <img src="/logo.png" alt="Logo" className="mx-auto h-16 w-16 mb-2" />
          <h1 className="text-2xl font-bold text-gray-900 mb-1">CVI-MS Portal Login</h1>
          <p className="text-gray-500">Sign in to your officer account</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded shadow-md w-full max-w-md">
          <div className="mb-4">
            <label htmlFor="email" className="block text-gray-700 font-bold mb-2">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="password" className="block text-gray-700 font-bold mb-2">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              required
            />
          </div>
          {warning && (
            <Alert variant="default" className="mb-4 border-yellow-500 bg-yellow-50">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertTitle className="text-yellow-800">Warning</AlertTitle>
              <AlertDescription className="text-yellow-700">{warning}</AlertDescription>
            </Alert>
          )}
          
          {blockedUntil && secondsRemaining !== null && secondsRemaining > 0 && (
            <Alert variant="destructive" className="mb-4">
              <Clock className="h-4 w-4" />
              <AlertTitle>Account Temporarily Locked</AlertTitle>
              <AlertDescription>
                Too many failed attempts. Please wait {secondsRemaining} seconds before trying again.
              </AlertDescription>
            </Alert>
          )}
          
          {isBlocked && (
            <Alert variant="destructive" className="mb-4">
              <Ban className="h-4 w-4" />
              <AlertTitle>Account Blocked</AlertTitle>
              <AlertDescription>
                Your account has been permanently blocked due to multiple failed login attempts. 
                Please contact your administrator to unblock your account.
              </AlertDescription>
            </Alert>
          )}
          
          {error && !blockedUntil && !isBlocked && (
            <div className="text-red-600 text-sm text-center mb-4">{error}</div>
          )}
          
          <button
            type="submit"
            className="w-full bg-primary text-white py-2 rounded-lg font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center"
            disabled={loading || (blockedUntil !== null && secondsRemaining !== null && secondsRemaining > 0) || isBlocked}
          >
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin h-5 w-5 mr-2 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Signing in...
              </span>
            ) : (
              "Sign In"
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
} 