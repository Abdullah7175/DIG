import type { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { z } from "zod";

/**
 * Security middleware following OWASP Top 10 guidelines
 */

// Helper to check if request is over HTTPS
function isHttps(req: Request): boolean {
  return req.protocol === "https" || req.secure || req.headers["x-forwarded-proto"] === "https";
}

// Security headers middleware
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  const usingHttps = isHttps(req);
  
  // XSS Protection
  res.setHeader("X-XSS-Protection", "1; mode=block");
  
  // Prevent MIME type sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");
  
  // Clickjacking protection
  res.setHeader("X-Frame-Options", "DENY");
  
  // Referrer Policy - use less strict policy for HTTP
  res.setHeader("Referrer-Policy", usingHttps ? "strict-origin-when-cross-origin" : "no-referrer-when-downgrade");
  
  // Permissions Policy (formerly Feature Policy)
  res.setHeader(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=()"
  );
  
  // Content Security Policy (CSP) - use kebab-case and only upgrade to HTTPS if using HTTPS
  const cspDirectives: string[] = [];
  
  // Only set CSP in production
  if (process.env.NODE_ENV === "production") {
    cspDirectives.push("default-src 'self'");
    cspDirectives.push("script-src 'self' 'unsafe-inline' 'unsafe-eval'"); // 'unsafe-eval' needed for Vite in dev
    cspDirectives.push("style-src 'self' 'unsafe-inline'");
    cspDirectives.push("img-src 'self' data: blob: https:");
    cspDirectives.push("font-src 'self' data:");
    cspDirectives.push("connect-src 'self'");
    cspDirectives.push("frame-src 'none'");
    cspDirectives.push("object-src 'none'");
    cspDirectives.push("base-uri 'self'");
    cspDirectives.push("form-action 'self'");
    
    // Only add upgrade-insecure-requests if already using HTTPS
    // This prevents forcing HTTPS when server is HTTP-only
    if (usingHttps) {
      cspDirectives.push("upgrade-insecure-requests");
    }
    
    res.setHeader("Content-Security-Policy", cspDirectives.join("; "));
  }
  
  // Only set Cross-Origin-Opener-Policy if using HTTPS (it requires HTTPS)
  if (usingHttps) {
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  }
  
  // Only set Cross-Origin-Embedder-Policy if using HTTPS
  if (usingHttps) {
    res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  }
  
  next();
}

// Helmet configuration (additional security headers)
// Disable HTTPS-only features when not using HTTPS
export const helmetConfig = helmet({
  contentSecurityPolicy: false, // We handle CSP manually in securityHeaders to support HTTP
  crossOriginEmbedderPolicy: false, // Disable - requires HTTPS
  crossOriginOpenerPolicy: false, // Disable - requires HTTPS, we handle it manually
  crossOriginResourcePolicy: { policy: "cross-origin" },
  // Don't force HTTPS upgrade
  hsts: false, // Disable HSTS (HTTP Strict Transport Security) - requires HTTPS
  // Disable Origin-Agent-Cluster header to prevent conflicts
  originAgentCluster: false,
});

// Helper to safely get client IP address
function getClientIp(req: Request): string {
  // Check for forwarded IP (when behind proxy/load balancer)
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    // Get the first IP in the chain (original client)
    const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(",")[0].trim();
    if (ips) return ips;
  }
  // Fallback to direct connection IP
  return req.ip || req.socket.remoteAddress || "unknown";
}

// Helper to check if request is from localhost/development
function isLocalhost(req: Request): boolean {
  const ip = getClientIp(req);
  return (
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip === "::ffff:127.0.0.1" ||
    ip === "localhost" ||
    ip === "::ffff:0:0:0:0:0:0:1" ||
    ip.startsWith("192.168.") ||
    ip.startsWith("10.") ||
    ip.startsWith("172.16.") ||
    ip.startsWith("172.17.") ||
    ip.startsWith("172.18.") ||
    ip.startsWith("172.19.") ||
    ip.startsWith("172.20.") ||
    ip.startsWith("172.21.") ||
    ip.startsWith("172.22.") ||
    ip.startsWith("172.23.") ||
    ip.startsWith("172.24.") ||
    ip.startsWith("172.25.") ||
    ip.startsWith("172.26.") ||
    ip.startsWith("172.27.") ||
    ip.startsWith("172.28.") ||
    ip.startsWith("172.29.") ||
    ip.startsWith("172.30.") ||
    ip.startsWith("172.31.")
  );
}

// Helper to check if user is authenticated
function isAuthenticated(req: Request): boolean {
  return !!(req as any).user;
}

// Rate limiting configurations with safe IP extraction
// Note: Express trust proxy is set to 1 in index.ts (trust only first proxy)
// This prevents IP spoofing while still allowing proper IP detection behind proxies
// In development, rate limits are more lenient or disabled for localhost
const isDevelopment = process.env.NODE_ENV === "development";

// For authenticated users, allow much more requests (8-hour shifts)
// For unauthenticated users, use normal limits
// For localhost in development, skip entirely
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: (req: Request) => {
    // Skip for localhost in development (handled by skip function, but max still needs a value)
    if (isDevelopment && isLocalhost(req)) return Number.MAX_SAFE_INTEGER;
    if (isAuthenticated(req)) return 10000; // Very high limit for authenticated users (8-hour shifts)
    return isDevelopment ? 10000 : 100; // High limit in dev, normal in prod
  },
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  // Use custom key generator to safely extract IP
  keyGenerator: (req: Request) => {
    // For authenticated users, use user ID + IP to allow more per user
    if (isAuthenticated(req)) {
      return `user-${(req as any).user.id}-${getClientIp(req)}`;
    }
    return getClientIp(req);
  },
  // Skip rate limiting for localhost in development
  skip: (req: Request) => {
    return isDevelopment && isLocalhost(req);
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 1000 : 20, // Much higher limit (20 attempts per 15 min = reasonable for 8-hour shifts)
  message: "Too many login attempts, please try again later.",
  skipSuccessfulRequests: true,
  keyGenerator: (req: Request) => getClientIp(req),
  // Skip for localhost in development
  skip: (req: Request) => {
    return isDevelopment && isLocalhost(req);
  },
});

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: (req: Request) => {
    // Skip for localhost in development
    if (isDevelopment && isLocalhost(req)) return Number.MAX_SAFE_INTEGER;
    if (isAuthenticated(req)) return 10000; // Very high limit for authenticated users
    return isDevelopment ? 10000 : 500; // Higher limit in prod for API calls
  },
  message: "Too many API requests, please try again later.",
  keyGenerator: (req: Request) => {
    // For authenticated users, use user ID + IP
    if (isAuthenticated(req)) {
      return `user-${(req as any).user.id}-${getClientIp(req)}`;
    }
    return getClientIp(req);
  },
  // Skip rate limiting for localhost in development
  skip: (req: Request) => {
    return isDevelopment && isLocalhost(req);
  },
});

export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: (req: Request) => {
    // Skip for localhost in development
    if (isDevelopment && isLocalhost(req)) return Number.MAX_SAFE_INTEGER;
    if (isAuthenticated(req)) return 1000; // High limit for authenticated users
    return isDevelopment ? 1000 : 50; // Higher limit in prod
  },
  message: "Too many file uploads, please try again later.",
  keyGenerator: (req: Request) => {
    // For authenticated users, use user ID + IP
    if (isAuthenticated(req)) {
      return `user-${(req as any).user.id}-${getClientIp(req)}`;
    }
    return getClientIp(req);
  },
  // Skip rate limiting for localhost in development
  skip: (req: Request) => {
    return isDevelopment && isLocalhost(req);
  },
});

// Input sanitization - remove potentially dangerous characters
export function sanitizeInput(input: any): any {
  if (typeof input === "string") {
    // Remove null bytes
    let sanitized = input.replace(/\0/g, "");
    
    // Remove script tags and event handlers (basic XSS prevention)
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
    sanitized = sanitized.replace(/on\w+\s*=/gi, "");
    
    // Trim whitespace
    sanitized = sanitized.trim();
    
    return sanitized;
  }
  
  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }
  
  if (input && typeof input === "object") {
    const sanitized: any = {};
    for (const key in input) {
      if (Object.prototype.hasOwnProperty.call(input, key)) {
        sanitized[key] = sanitizeInput(input[key]);
      }
    }
    return sanitized;
  }
  
  return input;
}

// Middleware to sanitize request body, query, and params
export function sanitizeRequest(req: Request, res: Response, next: NextFunction) {
  if (req.body) {
    req.body = sanitizeInput(req.body);
  }
  if (req.query) {
    req.query = sanitizeInput(req.query);
  }
  if (req.params) {
    req.params = sanitizeInput(req.params);
  }
  next();
}

// SQL Injection prevention - validate that input doesn't contain SQL keywords
const SQL_KEYWORDS = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT)\b)/gi;

export function validateNoSQLInjection(input: string): boolean {
  if (typeof input !== "string") return true;
  return !SQL_KEYWORDS.test(input.toUpperCase());
}

// Middleware to check for SQL injection attempts
export function preventSQLInjection(req: Request, res: Response, next: NextFunction) {
  const checkObject = (obj: any): boolean => {
    if (typeof obj === "string") {
      if (!validateNoSQLInjection(obj)) {
        return false;
      }
    } else if (Array.isArray(obj)) {
      for (const item of obj) {
        if (!checkObject(item)) return false;
      }
    } else if (obj && typeof obj === "object") {
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          if (!checkObject(obj[key])) return false;
        }
      }
    }
    return true;
  };
  
  if (req.body && !checkObject(req.body)) {
    return res.status(400).json({ message: "Invalid input detected" });
  }
  if (req.query && !checkObject(req.query)) {
    return res.status(400).json({ message: "Invalid input detected" });
  }
  if (req.params && !checkObject(req.params)) {
    return res.status(400).json({ message: "Invalid input detected" });
  }
  
  next();
}

// Request size validation
export function validateRequestSize(maxSize: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.headers["content-length"] || "0", 10);
    if (contentLength > maxSize) {
      return res.status(413).json({ message: "Request entity too large" });
    }
    next();
  };
}

// Error handler for security-related errors
export function securityErrorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Don't leak error details in production
  if (process.env.NODE_ENV === "production") {
    console.error("Security error:", err);
    return res.status(500).json({ message: "An error occurred" });
  }
  next(err);
}

