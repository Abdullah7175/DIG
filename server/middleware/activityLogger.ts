import type { Request, Response, NextFunction } from "express";
import { db } from "../db.js";
import { user_activity_logs } from "../../shared/schema.js";

/**
 * Activity logging middleware
 * Logs all user actions to the database
 */

// Helper to get client IP address
function getClientIp(req: Request): string {
  // Check for forwarded IP (when behind proxy/load balancer)
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(",")[0].trim();
    return ips || req.ip || req.socket.remoteAddress || "unknown";
  }
  return req.ip || req.socket.remoteAddress || "unknown";
}

// Helper to sanitize request body (remove sensitive data)
function sanitizeRequestBody(body: any): any {
  if (!body || typeof body !== "object") {
    return body;
  }
  
  const sensitiveFields = ["password", "token", "session_token", "secret", "api_key", "authorization"];
  const sanitized = { ...body };
  
  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = "[REDACTED]";
    }
  }
  
  return sanitized;
}

// Helper to determine action type from request
function getActionType(req: Request): string {
  const method = req.method;
  const path = req.path;
  
  // Authentication actions
  if (path.includes("/auth/login")) return "LOGIN";
  if (path.includes("/auth/logout")) return "LOGOUT";
  
  // Vehicle actions
  if (path.includes("/vehicles/register") && method === "POST") return "VEHICLE_CREATE";
  if (path.includes("/vehicles/") && path.match(/\/vehicles\/\d+/) && method === "PATCH") return "VEHICLE_UPDATE";
  if (path.includes("/vehicles/") && path.match(/\/vehicles\/\d+/) && method === "DELETE") return "VEHICLE_DELETE";
  if (path.includes("/vehicles/") && path.match(/\/vehicles\/\d+/) && method === "GET") return "VEHICLE_VIEW";
  if (path.includes("/vehicles") && method === "GET") return "VEHICLE_LIST";
  
  // Owner actions
  if (path.includes("/owners") && method === "POST") return "OWNER_CREATE";
  if (path.includes("/owners/") && method === "PUT" || method === "PATCH") return "OWNER_UPDATE";
  if (path.includes("/owners/") && method === "DELETE") return "OWNER_DELETE";
  if (path.includes("/owners") && method === "GET") return "OWNER_LIST";
  
  // Driver actions
  if (path.includes("/drivers") && method === "POST") return "DRIVER_CREATE";
  if (path.includes("/drivers/") && (method === "PUT" || method === "PATCH")) return "DRIVER_UPDATE";
  if (path.includes("/drivers/") && method === "DELETE") return "DRIVER_DELETE";
  if (path.includes("/drivers") && method === "GET") return "DRIVER_LIST";
  
  // Conductor actions
  if (path.includes("/conductors") && method === "POST") return "CONDUCTOR_CREATE";
  if (path.includes("/conductors/") && (method === "PUT" || method === "PATCH")) return "CONDUCTOR_UPDATE";
  if (path.includes("/conductors/") && method === "DELETE") return "CONDUCTOR_DELETE";
  if (path.includes("/conductors") && method === "GET") return "CONDUCTOR_LIST";
  
  // User actions
  if (path.includes("/users") && method === "POST") return "USER_CREATE";
  if (path.includes("/users/") && (method === "PUT" || method === "PATCH")) return "USER_UPDATE";
  if (path.includes("/users/") && method === "DELETE") return "USER_DELETE";
  if (path.includes("/users") && method === "GET") return "USER_LIST";
  
  // Vehicle Category actions
  if (path.includes("/vehicle-categories") && method === "POST") return "VEHICLE_CATEGORY_CREATE";
  if (path.includes("/vehicle-categories/") && (method === "PUT" || method === "PATCH")) return "VEHICLE_CATEGORY_UPDATE";
  if (path.includes("/vehicle-categories/") && method === "DELETE") return "VEHICLE_CATEGORY_DELETE";
  if (path.includes("/vehicle-categories") && method === "GET") return "VEHICLE_CATEGORY_LIST";
  
  // Vehicle Type actions
  if (path.includes("/vehicle-types") && method === "POST") return "VEHICLE_TYPE_CREATE";
  if (path.includes("/vehicle-types/") && (method === "PUT" || method === "PATCH")) return "VEHICLE_TYPE_UPDATE";
  if (path.includes("/vehicle-types/") && method === "DELETE") return "VEHICLE_TYPE_DELETE";
  if (path.includes("/vehicle-types") && method === "GET") return "VEHICLE_TYPE_LIST";
  
  // Fuel Type actions
  if (path.includes("/fuel-types") && method === "POST") return "FUEL_TYPE_CREATE";
  if (path.includes("/fuel-types/") && (method === "PUT" || method === "PATCH")) return "FUEL_TYPE_UPDATE";
  if (path.includes("/fuel-types/") && method === "DELETE") return "FUEL_TYPE_DELETE";
  if (path.includes("/fuel-types") && method === "GET") return "FUEL_TYPE_LIST";
  
  // Terminal actions
  if (path.includes("/terminals") && method === "POST") return "TERMINAL_CREATE";
  if (path.includes("/terminals/") && (method === "PUT" || method === "PATCH")) return "TERMINAL_UPDATE";
  if (path.includes("/terminals/") && method === "DELETE") return "TERMINAL_DELETE";
  if (path.includes("/terminals") && method === "GET") return "TERMINAL_LIST";
  
  // Route actions
  if (path.includes("/routes") && method === "POST") return "ROUTE_CREATE";
  if (path.includes("/routes/") && (method === "PUT" || method === "PATCH")) return "ROUTE_UPDATE";
  if (path.includes("/routes/") && method === "DELETE") return "ROUTE_DELETE";
  if (path.includes("/routes") && method === "GET") return "ROUTE_LIST";
  
  // Tracker Company actions
  if (path.includes("/tracker-companies") && method === "POST") return "TRACKER_COMPANY_CREATE";
  if (path.includes("/tracker-companies/") && (method === "PUT" || method === "PATCH")) return "TRACKER_COMPANY_UPDATE";
  if (path.includes("/tracker-companies/") && method === "DELETE") return "TRACKER_COMPANY_DELETE";
  if (path.includes("/tracker-companies") && method === "GET") return "TRACKER_COMPANY_LIST";
  
  // Tracker Payment actions
  if (path.includes("/tracker-payments") && method === "POST") return "TRACKER_PAYMENT_CREATE";
  if (path.includes("/tracker-payments/") && method === "PATCH") return "TRACKER_PAYMENT_UPDATE";
  if (path.includes("/tracker-payments/") && method === "DELETE") return "TRACKER_PAYMENT_DELETE";
  if (path.includes("/tracker-payments/") && path.includes("/renew") && method === "POST") return "TRACKER_PAYMENT_RENEW";
  if (path.includes("/tracker-payments") && method === "GET") return "TRACKER_PAYMENT_LIST";
  
  // QR Verification
  if (path.includes("/qr/verify")) return "QR_VERIFY";
  if (path.includes("/qr/generate")) return "QR_GENERATE";
  
  // File uploads
  if (path.includes("/upload")) return "FILE_UPLOAD";
  
  // Generic action types
  if (method === "POST") return "CREATE";
  if (method === "PUT" || method === "PATCH") return "UPDATE";
  if (method === "DELETE") return "DELETE";
  if (method === "GET") return "VIEW";
  
  return "UNKNOWN";
}

// Helper to create action description
function getActionDescription(req: Request, actionType: string): string {
  const method = req.method;
  const path = req.path;
  const entityId = req.params.id;
  
  // Create human-readable descriptions
  const descriptions: Record<string, string> = {
    "LOGIN": "User login attempt",
    "LOGOUT": "User logout",
    "VEHICLE_CREATE": "Vehicle registration",
    "VEHICLE_UPDATE": entityId ? `Update vehicle #${entityId}` : "Update vehicle",
    "VEHICLE_DELETE": entityId ? `Delete vehicle #${entityId}` : "Delete vehicle",
    "VEHICLE_VIEW": entityId ? `View vehicle #${entityId}` : "View vehicle",
    "VEHICLE_LIST": "List vehicles",
    "OWNER_CREATE": "Create owner",
    "OWNER_UPDATE": entityId ? `Update owner #${entityId}` : "Update owner",
    "OWNER_DELETE": entityId ? `Delete owner #${entityId}` : "Delete owner",
    "OWNER_LIST": "List owners",
    "DRIVER_CREATE": "Create driver",
    "DRIVER_UPDATE": entityId ? `Update driver #${entityId}` : "Update driver",
    "DRIVER_DELETE": entityId ? `Delete driver #${entityId}` : "Delete driver",
    "DRIVER_LIST": "List drivers",
    "CONDUCTOR_CREATE": "Create conductor",
    "CONDUCTOR_UPDATE": entityId ? `Update conductor #${entityId}` : "Update conductor",
    "CONDUCTOR_DELETE": entityId ? `Delete conductor #${entityId}` : "Delete conductor",
    "CONDUCTOR_LIST": "List conductors",
    "USER_CREATE": "Create user",
    "USER_UPDATE": entityId ? `Update user #${entityId}` : "Update user",
    "USER_DELETE": entityId ? `Delete user #${entityId}` : "Delete user",
    "USER_LIST": "List users",
    "VEHICLE_CATEGORY_CREATE": "Create vehicle category",
    "VEHICLE_CATEGORY_UPDATE": entityId ? `Update vehicle category #${entityId}` : "Update vehicle category",
    "VEHICLE_CATEGORY_DELETE": entityId ? `Delete vehicle category #${entityId}` : "Delete vehicle category",
    "VEHICLE_CATEGORY_LIST": "List vehicle categories",
    "VEHICLE_TYPE_CREATE": "Create vehicle type",
    "VEHICLE_TYPE_UPDATE": entityId ? `Update vehicle type #${entityId}` : "Update vehicle type",
    "VEHICLE_TYPE_DELETE": entityId ? `Delete vehicle type #${entityId}` : "Delete vehicle type",
    "VEHICLE_TYPE_LIST": "List vehicle types",
    "FUEL_TYPE_CREATE": "Create fuel type",
    "FUEL_TYPE_UPDATE": entityId ? `Update fuel type #${entityId}` : "Update fuel type",
    "FUEL_TYPE_DELETE": entityId ? `Delete fuel type #${entityId}` : "Delete fuel type",
    "FUEL_TYPE_LIST": "List fuel types",
    "TERMINAL_CREATE": "Create terminal",
    "TERMINAL_UPDATE": entityId ? `Update terminal #${entityId}` : "Update terminal",
    "TERMINAL_DELETE": entityId ? `Delete terminal #${entityId}` : "Delete terminal",
    "TERMINAL_LIST": "List terminals",
    "ROUTE_CREATE": "Create route",
    "ROUTE_UPDATE": entityId ? `Update route #${entityId}` : "Update route",
    "ROUTE_DELETE": entityId ? `Delete route #${entityId}` : "Delete route",
    "ROUTE_LIST": "List routes",
    "TRACKER_COMPANY_CREATE": "Create tracker company",
    "TRACKER_COMPANY_UPDATE": entityId ? `Update tracker company #${entityId}` : "Update tracker company",
    "TRACKER_COMPANY_DELETE": entityId ? `Delete tracker company #${entityId}` : "Delete tracker company",
    "TRACKER_COMPANY_LIST": "List tracker companies",
    "TRACKER_PAYMENT_CREATE": "Create tracker payment",
    "TRACKER_PAYMENT_UPDATE": entityId ? `Update tracker payment #${entityId}` : "Update tracker payment",
    "TRACKER_PAYMENT_DELETE": entityId ? `Delete tracker payment #${entityId}` : "Delete tracker payment",
    "TRACKER_PAYMENT_RENEW": entityId ? `Renew tracker payment #${entityId}` : "Renew tracker payment",
    "TRACKER_PAYMENT_LIST": "List tracker payments",
    "QR_VERIFY": "QR code verification",
    "QR_GENERATE": "Generate QR code",
    "FILE_UPLOAD": "File upload",
  };
  
  return descriptions[actionType] || `${method} ${path}`;
}

/**
 * Activity logging middleware
 * Logs all requests to the database
 */
export function logActivity(req: Request, res: Response, next: NextFunction) {
  // Skip logging for static assets and health checks
  if (
    req.path.startsWith("/uploads/") ||
    req.path.startsWith("/assets/") ||
    req.path === "/favicon.ico" ||
    req.path.startsWith("/_vite")
  ) {
    return next();
  }
  
  const startTime = Date.now();
  const userId = req.user?.id || null;
  const ipAddress = getClientIp(req);
  const userAgent = req.headers["user-agent"] || null;
  const actionType = getActionType(req);
  const actionDescription = getActionDescription(req, actionType);
  
  // Store original json method
  const originalJson = res.json.bind(res);
  
  // Override res.json to capture response
  res.json = function (body: any) {
    const duration = Date.now() - startTime;
    const success = res.statusCode >= 200 && res.statusCode < 400;
    
    // Prepare metadata
    const metadata: any = {
      duration: `${duration}ms`,
    };
    
    // Add entity ID if available
    if (req.params.id) {
      metadata.entity_id = req.params.id;
    }
    
    // Add query params for filtering
    if (Object.keys(req.query).length > 0) {
      metadata.query_params = req.query;
    }
    
    // Log to database asynchronously (don't block response)
    logActivityToDatabase({
      user_id: userId,
      action_type: actionType,
      action_description: actionDescription,
      ip_address: ipAddress,
      user_agent: userAgent,
      request_method: req.method,
      request_path: req.path,
      request_body: req.body ? JSON.stringify(sanitizeRequestBody(req.body)) : null,
      response_status: res.statusCode,
      success,
      error_message: success ? null : (body?.message || body?.error || "Unknown error"),
      metadata: JSON.stringify(metadata),
    }).catch((error) => {
      // Log error but don't fail the request
      console.error("Failed to log activity:", error);
    });
    
    return originalJson(body);
  };
  
  // Handle errors
  const originalEnd = res.end.bind(res);
  res.end = function (chunk?: any, encoding?: any) {
    if (res.statusCode >= 400 && !res.headersSent) {
      const duration = Date.now() - startTime;
      
      logActivityToDatabase({
        user_id: userId,
        action_type: actionType,
        action_description: actionDescription,
        ip_address: ipAddress,
        user_agent: userAgent,
        request_method: req.method,
        request_path: req.path,
        request_body: req.body ? JSON.stringify(sanitizeRequestBody(req.body)) : null,
        response_status: res.statusCode,
        success: false,
        error_message: "Request failed",
        metadata: JSON.stringify({ duration: `${duration}ms` }),
      }).catch((error) => {
        console.error("Failed to log activity:", error);
      });
    }
    
    return originalEnd(chunk, encoding);
  };
  
  next();
}

/**
 * Log activity to database
 */
async function logActivityToDatabase(data: {
  user_id: number | null;
  action_type: string;
  action_description: string;
  ip_address: string;
  user_agent: string | null;
  request_method: string;
  request_path: string;
  request_body: string | null;
  response_status: number;
  success: boolean;
  error_message: string | null;
  metadata: string;
}) {
  try {
    await db.insert(user_activity_logs).values({
      user_id: data.user_id,
      action_type: data.action_type,
      action_description: data.action_description,
      ip_address: data.ip_address,
      user_agent: data.user_agent,
      request_method: data.request_method,
      request_path: data.request_path,
      request_body: data.request_body,
      response_status: data.response_status,
      success: data.success,
      error_message: data.error_message,
      metadata: data.metadata,
    });
  } catch (error) {
    // Don't throw - logging failures shouldn't break the app
    console.error("Error logging activity:", error);
  }
}

/**
 * Manual activity logging function (for use in routes)
 */
export async function logUserAction(data: {
  userId?: number | null;
  actionType: string;
  actionDescription: string;
  ipAddress: string;
  userAgent?: string | null;
  requestMethod?: string;
  requestPath?: string;
  success?: boolean;
  errorMessage?: string | null;
  metadata?: any;
}) {
  try {
    await db.insert(user_activity_logs).values({
      user_id: data.userId || null,
      action_type: data.actionType,
      action_description: data.actionDescription,
      ip_address: data.ipAddress,
      user_agent: data.userAgent || null,
      request_method: data.requestMethod || null,
      request_path: data.requestPath || null,
      request_body: null,
      response_status: data.success !== false ? 200 : 500,
      success: data.success !== false,
      error_message: data.errorMessage || null,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
    });
  } catch (error) {
    console.error("Error logging user action:", error);
  }
}

