import express, { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import { db } from "./db.js";
import { users } from "../shared/schema.js";
import { eq } from "drizzle-orm";

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

// POST /api/auth/login - Optimized for performance
// Body: { email, password }
authRouter.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    // Early validation - return fast if missing
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    // Trim email for consistency
    const trimmedEmail = email.trim();
    
    // Optimized query: select only needed columns, limit to 1, use index on email
    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        password: users.password,
        role: users.role,
      })
      .from(users)
      .where(eq(users.email, trimmedEmail))
      .limit(1); // Stop after first match (email is unique anyway)

    if (!user) {
      // Use same error message for security (don't reveal if email exists)
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Check password (bcrypt.compare is intentionally slow for security)
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Sign JWT
    const payload: UserPayload = {
      id: user.id,
      name: user.name,
      role: String(user.role ?? 0),
    };
    const token = signToken(payload);

    // Set HTTP-only cookie
    // Important: secure should only be true if actually using HTTPS
    // Check if request is secure (HTTPS) or if behind proxy that indicates HTTPS
    const isSecure = req.secure || 
                     req.headers['x-forwarded-proto'] === 'https' ||
                     process.env.FORCE_HTTPS === 'true';
    
    res.cookie("token", token, {
      httpOnly: true,
      secure: isSecure, // Only secure if actually using HTTPS
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: "lax", // Allows cookies to be sent with same-site requests
      path: "/", // Make cookie available for all paths
    });

    // Return response (token also set in cookie)
    res.json({ user: payload, token });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/auth/me
authRouter.get("/me", requireAuth, (req: Request, res: Response) => {
  res.json({ user: req.user });
});

// POST /api/auth/logout
authRouter.post("/logout", (req: Request, res: Response) => {
  res.clearCookie("token");
  res.json({ message: "Logged out" });
}); 