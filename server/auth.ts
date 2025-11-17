import express, { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import { db } from "./db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";
const JWT_EXPIRES_IN = "10m"; // 30 minutes

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
  const token = req.cookies.token || req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });
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

// POST /api/auth/login
// Body: { username, password }
authRouter.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }
  // Find user
  const userRows = await db.select().from(users).where(eq(users.email, email));
  const user = userRows[0];
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  // Check password
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
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 60 * 1000, // 30 minutes
    sameSite: "lax",
  });
  res.json({ user: payload, token });
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