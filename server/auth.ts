import express, { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import { db } from "./db.js";
import { users } from "../shared/schema.js";
import { eq } from "drizzle-orm";
import { storage } from "./storage.js";
import { logUserAction } from "./middleware/activityLogger.js";

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";
const JWT_EXPIRES_IN = "24h"; // 24 hours - increased for better user experience

export const authRouter = express.Router();

// Extend Express Request type to allow req.user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

// Middleware to parse cookies
export const useCookieParser = cookieParser();

// Helper: sign JWT
type UserPayload = { id: number; name: string; role: string };
function signToken(user: UserPayload) {
  return jwt.sign(user, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Middleware: require authentication
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Try to get token from cookie first, then from Authorization header
  // Handle both req.cookies (from cookie-parser) and manual parsing
  let token = req.cookies?.token;
  
  // If cookie parser didn't work, try manual parsing
  if (!token && req.headers.cookie) {
    const cookieMatch = req.headers.cookie.match(/token=([^;]+)/);
    if (cookieMatch) {
      token = cookieMatch[1];
    }
  }
  
  // Fallback to Authorization header
  if (!token) {
    const authHeader = req.headers["authorization"];
    if (authHeader) {
      token = authHeader.split(" ")[1];
    }
  }
  
  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Middleware: require admin
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || String(req.user.role) !== '1') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// Helper to get client IP address
function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(",")[0].trim();
    return ips || req.ip || req.socket.remoteAddress || "unknown";
  }
  return req.ip || req.socket.remoteAddress || "unknown";
}

// POST /api/auth/login - With login attempt management
// Body: { email, password }
authRouter.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const ipAddress = getClientIp(req);
    
    // Early validation - return fast if missing
    if (!email || !password) {
      // Log failed attempt
      await logUserAction({
        actionType: "login",
        actionDescription: "Login attempt - missing credentials",
        ipAddress,
        userAgent: req.headers["user-agent"] || null,
        requestMethod: "POST",
        requestPath: "/api/auth/login",
        success: false,
        errorMessage: "Email and password required",
      });
      return res.status(400).json({ error: "Email and password required" });
    }

    // Trim email for consistency
    const trimmedEmail = email.trim();
    
    // Check for existing login attempts
    const loginAttempt = await storage.getLoginAttempt(trimmedEmail, ipAddress);
    
    // Check if account is permanently blocked
    if (loginAttempt?.is_blocked) {
      await logUserAction({
        actionType: "login",
        actionDescription: "Login attempt - account blocked",
        ipAddress,
        userAgent: req.headers["user-agent"] || null,
        requestMethod: "POST",
        requestPath: "/api/auth/login",
        success: false,
        errorMessage: "Account is blocked. Please contact administrator.",
      });
      return res.status(403).json({ 
        error: "Account is blocked. Please contact administrator.",
        blocked: true 
      });
    }
    
    // Check if temporarily blocked (60-second timer)
    if (loginAttempt?.blocked_until) {
      const now = new Date();
      const blockedUntil = new Date(loginAttempt.blocked_until);
      
      if (now < blockedUntil) {
        const secondsRemaining = Math.ceil((blockedUntil.getTime() - now.getTime()) / 1000);
        await logUserAction({
          actionType: "login",
          actionDescription: "Login attempt - temporarily blocked",
          ipAddress,
          userAgent: req.headers["user-agent"] || null,
          requestMethod: "POST",
          requestPath: "/api/auth/login",
          success: false,
          errorMessage: `Too many failed attempts. Please try again after ${secondsRemaining} seconds.`,
        });
        return res.status(429).json({ 
          error: `Too many failed attempts. Please try again after ${secondsRemaining} seconds.`,
          blockedUntil: loginAttempt.blocked_until,
          secondsRemaining 
        });
      }
    }
    
    // Check if user account is blocked
    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        password: users.password,
        role: users.role,
        is_blocked: users.is_blocked,
      })
      .from(users)
      .where(eq(users.email, trimmedEmail))
      .limit(1);

    if (!user) {
      // Log failed attempt (user doesn't exist)
      await storage.createOrUpdateLoginAttempt(trimmedEmail, ipAddress);
      const attempt = await storage.getLoginAttempt(trimmedEmail, ipAddress);
      
      await logUserAction({
        actionType: "login",
        actionDescription: "Login attempt - invalid email",
        ipAddress,
        userAgent: req.headers["user-agent"] || null,
        requestMethod: "POST",
        requestPath: "/api/auth/login",
        success: false,
        errorMessage: "Invalid email or password",
        metadata: { attemptCount: attempt?.attempt_count || 1 },
      });
      
      // Return generic error for security
      const attemptCount = attempt?.attempt_count || 1;
      if (attemptCount === 1) {
        return res.status(401).json({ 
          error: "Invalid email or password",
          warning: "First failed attempt. Please check your credentials."
        });
      } else if (attemptCount === 2) {
        return res.status(401).json({ 
          error: "Invalid email or password",
          warning: "Second failed attempt. One more failed attempt will result in a 60-second lockout."
        });
      } else {
        return res.status(401).json({ error: "Invalid email or password" });
      }
    }
    
    // Check if user account is blocked
    if (user.is_blocked) {
      await logUserAction({
        userId: user.id,
        actionType: "login",
        actionDescription: "Login attempt - account blocked",
        ipAddress,
        userAgent: req.headers["user-agent"] || null,
        requestMethod: "POST",
        requestPath: "/api/auth/login",
        success: false,
        errorMessage: "Account is blocked. Please contact administrator.",
      });
      return res.status(403).json({ 
        error: "Account is blocked. Please contact administrator.",
        blocked: true 
      });
    }

    // Check password (bcrypt.compare is intentionally slow for security)
    const valid = await bcrypt.compare(password, user.password);
    
    if (!valid) {
      // Log failed attempt
      const attempt = await storage.createOrUpdateLoginAttempt(trimmedEmail, ipAddress, user.id);
      
      await logUserAction({
        userId: user.id,
        actionType: "login",
        actionDescription: "Login attempt - invalid password",
        ipAddress,
        userAgent: req.headers["user-agent"] || null,
        requestMethod: "POST",
        requestPath: "/api/auth/login",
        success: false,
        errorMessage: "Invalid email or password",
        metadata: { attemptCount: attempt.attempt_count },
      });
      
      // Return appropriate error based on attempt count
      if (attempt.attempt_count === 1) {
        return res.status(401).json({ 
          error: "Invalid email or password",
          warning: "First failed attempt. Please check your credentials."
        });
      } else if (attempt.attempt_count === 2) {
        return res.status(401).json({ 
          error: "Invalid email or password",
          warning: "Second failed attempt. One more failed attempt will result in a 60-second lockout."
        });
      } else if (attempt.attempt_count === 3) {
        // 60-second block activated
        return res.status(429).json({ 
          error: "Too many failed attempts. Please try again after 60 seconds.",
          blockedUntil: attempt.blocked_until,
          secondsRemaining: 60
        });
      } else {
        // Account is now permanently blocked
        return res.status(403).json({ 
          error: "Account has been blocked due to multiple failed login attempts. Please contact administrator.",
          blocked: true
        });
      }
    }

    // Successful login - reset login attempts
    await storage.resetLoginAttempt(trimmedEmail, ipAddress);
    
    // Sign JWT
    const payload: UserPayload = {
      id: user.id,
      name: user.name,
      role: String(user.role ?? 0),
    };
    const token = signToken(payload);

    // Set HTTP-only cookie
    const isSecure = req.secure || 
                     req.headers['x-forwarded-proto'] === 'https' ||
                     process.env.FORCE_HTTPS === 'true';
    
    res.cookie("token", token, {
      httpOnly: true,
      secure: isSecure,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: "lax",
      path: "/",
    });

    // Log successful login
    await logUserAction({
      userId: user.id,
      actionType: "login",
      actionDescription: "User login successful",
      ipAddress,
      userAgent: req.headers["user-agent"] || null,
      requestMethod: "POST",
      requestPath: "/api/auth/login",
      success: true,
    });

    // Return response (token also set in cookie)
    res.json({ user: payload, token });
  } catch (error) {
    console.error("Login error:", error);
    const ipAddress = getClientIp(req);
    await logUserAction({
      actionType: "login",
      actionDescription: "Login attempt - server error",
      ipAddress,
      userAgent: req.headers["user-agent"] || null,
      requestMethod: "POST",
      requestPath: "/api/auth/login",
      success: false,
      errorMessage: "Internal server error",
    });
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/auth/me
authRouter.get("/me", requireAuth, (req: Request, res: Response) => {
  res.json({ user: req.user });
});

// POST /api/auth/logout
authRouter.post("/logout", requireAuth, async (req: Request, res: Response) => {
  const ipAddress = getClientIp(req);
  
  // Log logout
  await logUserAction({
    userId: req.user?.id,
    actionType: "logout",
    actionDescription: "User logout",
    ipAddress,
    userAgent: req.headers["user-agent"] || null,
    requestMethod: "POST",
    requestPath: "/api/auth/logout",
    success: true,
  });
  
  res.clearCookie("token");
  res.json({ message: "Logged out" });
}); 