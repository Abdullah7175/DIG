import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import { redisService } from "./services/redisService.js";
import { trackingService } from "./services/trackingService.js";
import { 
  insertVehicleSchema, 
  vehicleRegistrationSchema,
  insertOwnerSchema, 
  insertDriverSchema, 
  insertConductorSchema, 
  insertVerificationSchema,
  insertVehicleCategorySchema,
  insertVehicleTypeSchema,
  insertFuelTypeSchema,
  insertTerminalSchema,
  insertRouteSchema,
  insertTrackerCompanySchema,
  insertTrackerPaymentSchema
} from "../shared/schema-validation.js";
import { generateQRCode } from "./lib/qr-generator.js";
import { generateVehicleQRCard } from "./lib/qr-card.js";
import { authRouter, useCookieParser } from "./auth.js";
import { db, pool } from "./db.js";
import { 
  users, 
  notifications, 
  vehicle_categories, 
  vehicle_types, 
  fuel_types, 
  terminals, 
  routes,
  tracker_companies,
  tracker_payments,
  vehicles,
  owners,
  drivers,
  conductors,
  tracking_events
} from "../shared/schema.js";
import { eq, and, like, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { requireAuth, requireAdmin, requireManager, requireAdminOnly } from "./auth.js";
import { requireApiToken } from "./middleware/apiAuth.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { authLimiter, apiLimiter, uploadLimiter } from "./middleware/security.js";
import { validateMixedFileUpload, FileType, validateFileUpload } from "./middleware/fileUploadSecurity.js";
import { logUserAction } from "./middleware/activityLogger.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Helper to get client IP address
function getClientIp(req: any): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(",")[0].trim();
    return ips || req.ip || req.socket.remoteAddress || "unknown";
  }
  return req.ip || req.socket.remoteAddress || "unknown";
}

// Helper to build a public base URL that respects proxies and allows env override
function getPublicBaseUrl(req: any): string {
  if (process.env.PUBLIC_BASE_URL) {
    return process.env.PUBLIC_BASE_URL.replace(/\/$/, "");
  }
  // Prefer forwarded headers (may be comma-separated lists)
  const xfProto = (req.headers['x-forwarded-proto'] || '').toString().split(',')[0].trim();
  const xfHost = (req.headers['x-forwarded-host'] || '').toString().split(',')[0].trim();
  let proto = xfProto || (req.secure ? 'https' : (req.protocol || 'http'));
  let host = xfHost || req.headers.host || req.get('host');

  // If still localhost, try Referer header origin (useful with dev tunnels)
  if (host && /localhost/i.test(host)) {
    const ref = (req.get('referer') || '').toString();
    try {
      if (ref) {
        const u = new URL(ref);
        proto = u.protocol.replace(':', '');
        host = u.host;
      }
    } catch {}
  }

  return `${proto}://${host}`;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // --- HEALTH CHECK (Public, for Docker health checks) ---
  app.get("/api/health", async (req, res) => {
    try {
      // Quick database check
      await pool.query('SELECT 1');
      const redisStatus = redisService.isAvailable();
      
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: 'connected',
        redis: redisStatus ? 'connected' : 'disconnected',
        uptime: process.uptime()
      });
    } catch (error: any) {
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: error.message
      });
    }
  });

  // --- AUTH ROUTES ---
  app.use(useCookieParser); // Parse cookies for JWT
  app.use("/api/auth", authLimiter, authRouter);


  // Dashboard stats - Cached for 1 minute
  app.get("/api/dashboard/stats", apiLimiter, async (req, res) => {
    try {
      const cacheKey = 'dashboard:stats';
      
      // Try to get from cache
      const cached = await redisService.get(cacheKey);
      if (cached) {
        res.set('X-Cache', 'HIT');
        return res.json(cached);
      }

      // Fetch from database
      const stats = await storage.getDashboardStats();
      
      // Cache for 1 minute
      await redisService.set(cacheKey, stats, 60);
      
      res.set('X-Cache', 'MISS');
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Multer setup for local uploads (duplicate from index.ts, but needed here for direct use)
  const uploadDir = path.join(__dirname, "../uploads");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
  }
  const storageMulter = multer.diskStorage({
    destination: function (_req, _file, cb) {
      cb(null, uploadDir);
    },
    filename: function (_req, file, cb) {
      const ext = path.extname(file.originalname);
      const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      cb(null, name);
    },
  });
  const upload = multer({ storage: storageMulter });

  // Image upload endpoint with security
  app.post("/api/upload", requireAuth, uploadLimiter, upload.single("image"), validateFileUpload(FileType.IMAGE), async (req, res) => {
    try {
      const file = req.file as Express.Multer.File | undefined;
      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      // Return the URL to access the image
      const url = `/uploads/${file.filename}`;
      res.json({ url });
    } catch (error: any) {
      console.error("Error uploading file:", error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  // Vehicle registration
  app.post("/api/vehicles/register", requireAuth, uploadLimiter, upload.any(), validateMixedFileUpload, async (req, res) => {
    try {
      // Parse JSON fields from multipart form
      console.log('Raw registration form data:', {
        vehicle: req.body.vehicle,
        owner: req.body.owner,
        driver: req.body.driver,
        conductor: req.body.conductor,
        documents: req.body.documents
      });
      
      const vehicle = JSON.parse(req.body.vehicle || '{}');
      const owner = JSON.parse(req.body.owner || '{}');
      const driver = JSON.parse(req.body.driver || '{}');
      const conductor = (req.body.conductor && req.body.conductor !== 'undefined') ? JSON.parse(req.body.conductor) : undefined;
      const documents = JSON.parse(req.body.documents || '{}');
      // Null handling for optional vehicle fields
      vehicle.passenger_doors_emergency_exit = vehicle.passenger_doors_emergency_exit || null;
      // Validate input using custom registration schema
      const validatedVehicle = vehicleRegistrationSchema.parse(vehicle);
      const validatedOwner = insertOwnerSchema.parse(owner);
      const validatedDriver = insertDriverSchema.parse(driver);
      // Check if owner already exists
      let existingOwner = await storage.getOwnerByCnic(validatedOwner.cnic);
      if (!existingOwner) {
        existingOwner = await storage.createOwner(validatedOwner);
      }
      // Check if driver already exists
      let existingDriver = await storage.getDriverByCnic(validatedDriver.cnic);
      if (!existingDriver) {
        existingDriver = await storage.createDriver(validatedDriver);
      }
      // Check if conductor exists (optional)
      let existingConductor = null;
      if (conductor && conductor.name && conductor.cnic) {
        // Null handling for optional conductor fields
        conductor.name = conductor.name || null;
        conductor.cnic = conductor.cnic || null;
        conductor.contact = conductor.contact || null;
        const validatedConductor = insertConductorSchema.parse(conductor);
        existingConductor = await storage.getConductorByCnic(validatedConductor.cnic);
        if (!existingConductor) {
          existingConductor = await storage.createConductor(validatedConductor);
        }
      }
      // Create vehicle - always set status to 'active' (no approval system)
      const newVehicle = await storage.createVehicle({
        ...validatedVehicle,
        status: 'active', // Always active by default, no approval needed
        owner_id: existingOwner.id,
        driver_id: existingDriver.id,
        conductor_id: existingConductor?.id || null,
        registered_by: 1, // TODO: Get from session
      });
      // Save vehicle documents
      if (documents && req.files && Array.isArray(req.files)) {
        for (const file of req.files) {
          // file.fieldname is like documentFiles[owner_cnic_copy]
          const match = file.fieldname.match(/^documentFiles\[(.+)\]$/);
          if (match) {
            const document_type = match[1];
            if (documents[document_type]) {
              await storage.createVehicleDocument({
                vehicle_id: newVehicle.id,
                document_type,
                file_path: `/uploads/${file.filename}`,
              });
            }
          }
        }
      }
      // Generate QR code + printable QR card (SVG)
      const publicUrl = `${getPublicBaseUrl(req)}/public/vehicle/${newVehicle.id}`;
      const qrCode = await generateQRCode(publicUrl);
      const createdAt = new Date();
      const expiry = new Date(createdAt);
      // 6 months validity
      expiry.setMonth(expiry.getMonth() + 6);
      const formatDate = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      const qrCard = await generateVehicleQRCard(publicUrl, {
        issuedDate: formatDate(createdAt),
        expiryDate: formatDate(expiry),
        registrationNumber: vehicle.vehicle_register_number
      });
      // Persist the styled card so existing UI shows the new design
      await storage.updateVehicleQRCode(newVehicle.id, qrCard);

      // Create notification for admin
      await storage.createNotification({
        user_id: 1, // TODO: set to admin user(s) or broadcast as needed
        type: 'vehicle_registered',
        entity_id: newVehicle.id,
        message: `New vehicle registered: ${newVehicle.vehicle_register_number}`,
        read: false
      });

      // Invalidate vehicle caches
      await redisService.invalidateVehicles();

      res.json({ 
        message: "Vehicle registered successfully", 
        vehicleId: newVehicle.id,
        qrCode,
        qrCard
      });
    } catch (error: any) {
      console.error("Error registering vehicle:", error);
      res.status(400).json({ message: error.message || "Failed to register vehicle" });
    }
  });

  // Get all vehicles - Optimized with Redis caching and ETags
  app.get("/api/vehicles", apiLimiter, async (req, res) => {
    const startTime = Date.now();
    try {
      // Check if request already timed out
      if ((req as any).timedOut || res.headersSent) {
        return;
      }

      const { type, status, search, page = 1, limit = 20 } = req.query; // Increased default limit to 20
      const offset = (Number(page) - 1) * Number(limit);

      // Generate cache key from query parameters
      const cacheParams: Record<string, string> = {
        type: (type as string) || 'all',
        status: (status as string) || 'all',
        search: (search as string) || '',
        page: String(page),
        limit: String(limit),
      };
      const sortedParams = Object.keys(cacheParams)
        .sort()
        .map(key => `${key}:${cacheParams[key]}`)
        .join('|');
      const cacheKey = `vehicles:${sortedParams}`;

      // Try to get from Redis cache (5 minute TTL) with timeout
      const cacheStartTime = Date.now();
      let cached: any = null;
      try {
        // Add timeout to Redis call to prevent hanging
        cached = await Promise.race([
          redisService.get<any>(cacheKey),
          new Promise<any>((_, reject) => 
            setTimeout(() => reject(new Error('Redis timeout')), 1000) // 1 second timeout
          )
        ]) as any;
      } catch (error) {
        // Redis unavailable or timeout - continue without cache
        console.warn('Redis cache unavailable, continuing without cache:', error instanceof Error ? error.message : String(error));
      }
      const cacheTime = Date.now() - cacheStartTime;
      
      if (cached) {
        if ((req as any).timedOut || res.headersSent) return;
        const totalTime = Date.now() - startTime;
        res.set({
          'X-Cache': 'HIT',
          'X-Response-Time': `${totalTime}ms`,
          'X-Cache-Time': `${cacheTime}ms`,
          'Cache-Control': 'private, max-age=300', // 5 minutes
          'X-Content-Type-Options': 'nosniff'
        });
        return res.json(cached);
      }

      // Check timeout before query
      if ((req as any).timedOut || res.headersSent) return;

      // Set cache headers for better performance
      res.set({
        'X-Cache': 'MISS',
        'Cache-Control': 'private, max-age=30', // 30 seconds browser cache
        'X-Content-Type-Options': 'nosniff'
      });

      const queryStartTime = Date.now();
      console.log(`[PERF] Starting getAllVehicles query at ${new Date().toISOString()}`);
      const result = await storage.getAllVehicles({
        type: type as string,
        status: status as string,
        search: search as string,
        limit: Number(limit),
        offset,
      });
      const queryTime = Date.now() - queryStartTime;
      console.log(`[PERF] getAllVehicles query completed in ${queryTime}ms, returned ${result.vehicles.length} vehicles`);

      // Check timeout after query
      if ((req as any).timedOut || res.headersSent) return;

      const responseData = {
        vehicles: result.vehicles,
        total: result.total,
        page: Number(page),
        totalPages: Math.ceil(result.total / Number(limit)),
      };

      // Cache in Redis for 5 minutes (300 seconds) - fire and forget with timeout
      if (!(req as any).timedOut) {
        Promise.race([
          redisService.set(cacheKey, responseData, 300),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Redis set timeout')), 500))
        ]).catch(err => 
          console.warn('Failed to cache vehicles (non-critical):', err instanceof Error ? err.message : String(err))
        );
      }

      // Generate ETag for conditional requests
      const etag = `"${Buffer.from(JSON.stringify(responseData)).toString('base64').slice(0, 16)}"`;
      const totalTime = Date.now() - startTime;
      
      // Final check before sending response
      if ((req as any).timedOut || res.headersSent) return;
      
      res.set({
        'ETag': etag,
        'X-Query-Time': `${queryTime}ms`,
        'X-Response-Time': `${totalTime}ms`
      });
      
      // Check if client has cached version
      if (req.headers['if-none-match'] === etag) {
        return res.status(304).end();
      }

      res.json(responseData);
    } catch (error: any) {
      // Only send error if headers haven't been sent
      if (!res.headersSent) {
        const errorTime = Date.now() - startTime;
        console.error(`Error fetching vehicles (${errorTime}ms):`, error);
        res.status(500).json({ message: "Failed to fetch vehicles" });
      } else {
        console.error('Error fetching vehicles (response already sent):', error);
      }
    }
  });

  // Get vehicle by ID
  app.get("/api/vehicles/:id", apiLimiter, async (req, res) => {
    try {
      // Validate vehicle ID from params
      const rawId = req.params.id;
      const vehicleId = typeof rawId === 'string' ? parseInt(rawId.trim(), 10) : Number(rawId);
      
      if (!Number.isInteger(vehicleId) || vehicleId <= 0 || !Number.isFinite(vehicleId) || isNaN(vehicleId)) {
        return res.status(400).json({ message: `Invalid vehicle ID: ${rawId}` });
      }
      
      const vehicle = await storage.getVehicle(vehicleId);
      
      if (!vehicle) {
        return res.status(404).json({ message: "Vehicle not found" });
      }

      res.json(vehicle);
    } catch (error) {
      console.error("Error fetching vehicle:", error);
      res.status(500).json({ message: "Failed to fetch vehicle" });
    }
  });

  // Check for vehicles with same registration number across regions
  app.get("/api/vehicles/check-registration/:registrationNumber", apiLimiter, async (req, res) => {
    try {
      const registrationNumber = req.params.registrationNumber;
      const vehicles = await storage.getVehiclesByRegistrationNumber(registrationNumber);
      
      res.json({
        registrationNumber,
        count: vehicles.length,
        vehicles: vehicles.map(v => ({
          id: v.id,
          registration_region: v.registration_region,
          vehicle_owner_name_on_book: v.vehicle_owner_name_on_book,
          status: v.status,
          created_at: v.created_at
        }))
      });
    } catch (error) {
      console.error("Error checking registration:", error);
      res.status(500).json({ message: "Failed to check registration" });
    }
  });

  // Verify QR code
  app.post("/api/qr/verify", apiLimiter, async (req, res) => {
    try {
      const { qrData, location } = req.body;
      
      let vehicleData;
      try {
        vehicleData = JSON.parse(qrData);
      } catch {
        return res.status(400).json({ message: "Invalid QR code format" });
      }

      const vehicle = await storage.getVehicleByRegistration(vehicleData.registration_number || vehicleData.vehicle_register_number);
      
      if (!vehicle) {
        await storage.createVerification({
          vehicle_id: null,
          verified_by: 1, // TODO: Get from session
          verification_result: "failed",
          location,
        });
        
        return res.status(404).json({ message: "Vehicle not found" });
      }

      // Record successful verification
      await storage.createVerification({
        vehicle_id: vehicle.id,
        verified_by: 1, // TODO: Get from session
        verification_result: "success",
        location,
      });

      res.json({
        success: true,
        vehicle,
        message: "Vehicle verified successfully"
      });
    } catch (error) {
      console.error("Error verifying QR code:", error);
      res.status(500).json({ message: "Failed to verify QR code" });
    }
  });

  // Get recent verifications
  app.get("/api/verifications/recent", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const verifications = await storage.getRecentVerifications(limit);
      res.json(verifications);
    } catch (error) {
      console.error("Error fetching verifications:", error);
      res.status(500).json({ message: "Failed to fetch verifications" });
    }
  });

  // Bulk update vehicle status (enable/disable multiple vehicles) - Only for managers and admins
  // CRITICAL: This route MUST be defined BEFORE /api/vehicles/:id to avoid route conflicts
  // Express matches routes in order, so specific routes must come before parameterized routes
  app.patch("/api/vehicles/bulk-status", requireAuth, requireManager, apiLimiter, async (req, res) => {
    try {
      // Log raw request body to debug parsing issues
      console.log('[Bulk Status Update] Raw request body:', JSON.stringify(req.body));
      console.log('[Bulk Status Update] Request body type:', typeof req.body);
      console.log('[Bulk Status Update] Request body keys:', Object.keys(req.body || {}));
      
      const { vehicleIds, status } = req.body;
      
      // Validate request body structure
      if (!req.body || typeof req.body !== 'object') {
        return res.status(400).json({ message: "Invalid request body" });
      }

      console.log('[Bulk Status Update] Received request:', { 
        vehicleIds, 
        status, 
        vehicleIdsType: typeof vehicleIds, 
        isArray: Array.isArray(vehicleIds),
        vehicleIdsStringified: JSON.stringify(vehicleIds),
        requestBody: JSON.stringify(req.body)
      });
      
      // Deep inspect the vehicleIds array
      if (Array.isArray(vehicleIds)) {
        vehicleIds.forEach((id, index) => {
          const numId = Number(id);
          console.log(`[Bulk Status Update] vehicleIds[${index}]:`, id, 'type:', typeof id, 'Number(id):', numId, 'isNaN:', isNaN(numId), 'isFinite:', isFinite(numId));
        });
      } else {
        console.error('[Bulk Status Update] vehicleIds is not an array!', vehicleIds);
      }

      if (!Array.isArray(vehicleIds) || vehicleIds.length === 0) {
        return res.status(400).json({ message: "vehicleIds must be a non-empty array" });
      }

      // Only allow 'active' (enabled) or 'suspended' (disabled by DIG traffic police)
      if (!["active", "suspended"].includes(status)) {
        return res.status(400).json({ message: "Invalid status. Only 'active' or 'suspended' allowed." });
      }

      // Validate and convert vehicle IDs to integers, filtering out invalid ones
      const validVehicleIds: number[] = [];
      const invalidIds: any[] = [];
      
      for (const id of vehicleIds) {
        // Skip null/undefined
        if (id === null || id === undefined) {
          invalidIds.push(id);
          continue;
        }

        // Handle both number and string inputs
        let parsedId: number;
        if (typeof id === 'number') {
          // Ensure it's a valid number (not NaN, Infinity, etc.)
          if (!Number.isFinite(id) || !Number.isInteger(id) || id <= 0) {
            console.warn(`[Bulk Status Update] Invalid number ID: ${id}`);
            invalidIds.push(id);
            continue;
          }
          parsedId = Math.floor(id); // Ensure it's an integer
        } else if (typeof id === 'string') {
          const trimmed = id.trim();
          if (trimmed === '' || trimmed === 'NaN' || trimmed === 'null' || trimmed === 'undefined' || trimmed === 'Infinity') {
            invalidIds.push(id);
            continue;
          }
          parsedId = parseInt(trimmed, 10);
        } else {
          invalidIds.push(id);
          continue;
        }
        
        // Final validation - ensure it's a valid positive integer
        if (Number.isFinite(parsedId) && Number.isInteger(parsedId) && parsedId > 0 && parsedId < Number.MAX_SAFE_INTEGER) {
          // Double-check it's not NaN
          if (parsedId === parsedId) { // NaN !== NaN, so this checks for NaN
            validVehicleIds.push(parsedId);
          } else {
            console.warn(`[Bulk Status Update] ID is NaN: ${id} (type: ${typeof id})`);
            invalidIds.push(id);
          }
        } else {
          console.warn(`[Bulk Status Update] Invalid ID: ${id} (type: ${typeof id}) parsed to: ${parsedId}`);
          invalidIds.push(id);
        }
      }

      console.log('[Bulk Status Update] Valid IDs:', validVehicleIds);
      console.log('[Bulk Status Update] Invalid IDs:', invalidIds);

      if (validVehicleIds.length === 0) {
        return res.status(400).json({ 
          message: "No valid vehicle IDs provided",
          invalidIds: invalidIds.length > 0 ? invalidIds : undefined,
          receivedIds: vehicleIds
        });
      }

      // Log warning if some IDs were invalid
      if (invalidIds.length > 0) {
        console.warn(`[Bulk Status Update] Filtered out ${invalidIds.length} invalid vehicle IDs:`, invalidIds);
      }

      // Update all vehicles - ensure all IDs are proper integers
      const results = [];
      for (let i = 0; i < validVehicleIds.length; i++) {
        const rawId = validVehicleIds[i];
        
        // Coerce to number and validate - use Math.floor to ensure integer
        let vehicleId: number;
        if (typeof rawId === 'number') {
          vehicleId = Math.floor(rawId);
        } else if (typeof rawId === 'string') {
          vehicleId = parseInt(String(rawId).trim(), 10);
        } else {
          vehicleId = Number(rawId);
        }
        
        // Final safety check before database call
        if (!Number.isInteger(vehicleId) || vehicleId <= 0 || !Number.isFinite(vehicleId) || isNaN(vehicleId) || vehicleId !== vehicleId) {
          console.error(`[Bulk Status Update] Skipping invalid vehicleId at index ${i}: ${rawId} (type: ${typeof rawId}, coerced: ${vehicleId}, isNaN: ${isNaN(vehicleId)})`);
          results.push({
            id: rawId,
            success: false,
            error: `Invalid vehicle ID: ${rawId}`
          });
          continue;
        }
        
        try {
          console.log(`[Bulk Status Update] Updating vehicle ${vehicleId} (raw: ${rawId}, type: ${typeof vehicleId}, isInteger: ${Number.isInteger(vehicleId)}) to status: ${status}`);
          
          // Double-check before calling updateVehicleStatus
          if (isNaN(vehicleId) || !Number.isInteger(vehicleId)) {
            throw new Error(`Invalid vehicle ID after validation: ${vehicleId}`);
          }
          
          const updatedVehicle = await storage.updateVehicleStatus(vehicleId, status);
          
          if (!updatedVehicle) {
            throw new Error(`Vehicle ${vehicleId} not found or update failed`);
          }
          
          results.push({
            id: updatedVehicle.id,
            status: updatedVehicle.status,
            vehicle_register_number: updatedVehicle.vehicle_register_number,
            success: true
          });
        } catch (err: any) {
          console.error(`[Bulk Status Update] Error updating vehicle ${vehicleId} (raw: ${rawId}):`, err);
          console.error(`[Bulk Status Update] Error stack:`, err.stack);
          results.push({
            id: vehicleId,
            success: false,
            error: err instanceof Error ? err.message : String(err) || "Failed to update"
          });
        }
      }

      // Invalidate vehicle caches
      await redisService.invalidateVehicles();
      
      const successCount = results.filter(r => r.success).length;
      res.json({ 
        message: `Updated ${successCount} of ${vehicleIds.length} vehicles`,
        results,
        successCount,
        totalCount: vehicleIds.length
      });
    } catch (error: any) {
      console.error("Error bulk updating vehicle status:", error);
      res.status(500).json({ message: "Failed to bulk update vehicle status" });
    }
  });

  // Update vehicle (full update with file uploads)
  app.patch("/api/vehicles/:id", requireAuth, uploadLimiter, upload.any(), validateMixedFileUpload, async (req, res) => {
    try {
      // Validate vehicle ID from params
      const rawId = req.params.id;
      const vehicleId = typeof rawId === 'string' ? parseInt(rawId.trim(), 10) : Number(rawId);
      
      if (!Number.isInteger(vehicleId) || vehicleId <= 0 || !Number.isFinite(vehicleId) || isNaN(vehicleId)) {
        return res.status(400).json({ message: `Invalid vehicle ID: ${rawId}` });
      }
      
      // Check if vehicle exists
      const existingVehicle = await storage.getVehicle(vehicleId);
      if (!existingVehicle) {
        return res.status(404).json({ message: "Vehicle not found" });
      }

      // Parse JSON fields from multipart form
      console.log('Raw form data:', {
        vehicle: req.body.vehicle,
        owner: req.body.owner,
        driver: req.body.driver,
        conductor: req.body.conductor,
        documents: req.body.documents
      });
      
      const vehicle = JSON.parse(req.body.vehicle || '{}');
      const owner = JSON.parse(req.body.owner || '{}');
      const driver = JSON.parse(req.body.driver || '{}');
      const conductor = (req.body.conductor && req.body.conductor !== 'undefined') ? JSON.parse(req.body.conductor) : undefined;
      const documents = JSON.parse(req.body.documents || '{}');

      // Validate and convert date fields
      if (driver.driving_license_expiry_date) {
        driver.driving_license_expiry_date = new Date(driver.driving_license_expiry_date);
      }

      // Validate input schemas
      const validatedVehicle = insertVehicleSchema.partial().parse(vehicle);
      const validatedOwner = insertOwnerSchema.partial().parse(owner);
      const validatedDriver = insertDriverSchema.partial().parse(driver);
      const validatedConductor = conductor ? insertConductorSchema.partial().parse(conductor) : undefined;

      // Ensure status is always 'active' when editing (unless explicitly disabled)
      // Remove status from update if it's being set to something other than 'suspended' (disabled)
      if (validatedVehicle.status && validatedVehicle.status !== 'suspended') {
        validatedVehicle.status = 'active';
      }

      // Update vehicle
      const updatedVehicle = await storage.updateVehicle(vehicleId, validatedVehicle);

      // Update owner if provided
      if (existingVehicle.owner_id && Object.keys(validatedOwner).length > 0) {
        await storage.updateOwner(existingVehicle.owner_id, validatedOwner);
      }

      // Update driver if provided
      if (existingVehicle.driver_id && Object.keys(validatedDriver).length > 0) {
        await storage.updateDriver(existingVehicle.driver_id, validatedDriver);
      }

      // Update conductor if provided and vehicle is a bus
      if (existingVehicle.conductor_id && validatedConductor && Object.keys(validatedConductor).length > 0) {
        await storage.updateConductor(existingVehicle.conductor_id, validatedConductor);
      }

      // Handle document updates
      if (req.files && Array.isArray(req.files)) {
        for (const file of req.files) {
          // file.fieldname is like documentFiles[owner_cnic_copy]
          const match = file.fieldname.match(/^documentFiles\[(.+)\]$/);
          if (match) {
            const document_type = match[1];
            if (documents[document_type]) {
              // Delete existing document of this type
              await storage.deleteVehicleDocument(vehicleId, document_type);
              // Create new document
              await storage.createVehicleDocument({
                vehicle_id: vehicleId,
                document_type,
                file_path: `/uploads/${file.filename}`,
              });
            }
          }
        }
      }

      res.json({ message: "Vehicle updated successfully", vehicle: updatedVehicle });
    } catch (error: any) {
      console.error("Error updating vehicle:", error);
      console.error("Error stack:", error.stack);
      res.status(400).json({ message: error.message || "Failed to update vehicle" });
    }
  });

  // Update vehicle status (enable/disable) - Only for managers and admins
  app.patch("/api/vehicles/:id/status", requireAuth, requireManager, apiLimiter, async (req, res) => {
    try {
      // Validate vehicle ID from params
      const rawId = req.params.id;
      const vehicleId = typeof rawId === 'string' ? parseInt(rawId.trim(), 10) : Number(rawId);
      
      if (!Number.isInteger(vehicleId) || vehicleId <= 0 || !Number.isFinite(vehicleId) || isNaN(vehicleId)) {
        return res.status(400).json({ message: `Invalid vehicle ID: ${rawId}` });
      }
      
      const { status } = req.body;

      // Only allow 'active' (enabled) or 'suspended' (disabled by DIG traffic police)
      if (!["active", "suspended"].includes(status)) {
        return res.status(400).json({ message: "Invalid status. Only 'active' or 'suspended' allowed." });
      }

      // Set no-cache headers for status updates (always fresh)
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      const updatedVehicle = await storage.updateVehicleStatus(vehicleId, status);
      
      // Invalidate vehicle caches
      await redisService.invalidateVehicles();
      
      // Return minimal response for faster processing
      res.json({ 
        message: "Vehicle status updated", 
        vehicle: {
          id: updatedVehicle.id,
          status: updatedVehicle.status,
          vehicle_register_number: updatedVehicle.vehicle_register_number
        }
      });
    } catch (error) {
      console.error("Error updating vehicle status:", error);
      res.status(500).json({ message: "Failed to update vehicle status" });
    }
  });

  // Generate QR code for existing vehicle
  app.post("/api/vehicles/:id/generate-qr", requireAuth, apiLimiter, async (req, res) => {
    const startTime = Date.now();
    try {
      // Check if request already timed out
      if ((req as any).timedOut || res.headersSent) {
        return;
      }

      const vehicleId = parseInt(req.params.id);
      
      // Optimize: Only fetch what we need for QR generation (not all joins)
      const [vehicle] = await db
        .select({
          id: vehicles.id,
          vehicle_register_number: vehicles.vehicle_register_number
        })
        .from(vehicles)
        .where(eq(vehicles.id, vehicleId));
      
      if (!vehicle) {
        if (!res.headersSent) {
          return res.status(404).json({ message: "Vehicle not found" });
        }
        return;
      }

      // Allow client to explicitly provide its visible origin for tunnels/proxies
      const clientBase = (req.body && req.body.baseUrl) ? String(req.body.baseUrl) : undefined;
      const baseUrl = clientBase || getPublicBaseUrl(req);
      const publicUrl = `${baseUrl.replace(/\/$/, '')}/public/vehicle/${vehicle.id}`;
      
      console.log(`Generating QR code for vehicle ID: ${vehicle.id}, URL: ${publicUrl}`);
      
      // Check timeout before expensive operations
      if ((req as any).timedOut || res.headersSent) return;
      
      // Generate QR code and card in parallel for speed
      const createdAt = new Date();
      const expiry = new Date(createdAt);
      expiry.setMonth(expiry.getMonth() + 6);
      const formatDate = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      
      const [qrCode, qrCard] = await Promise.all([
        generateQRCode(publicUrl),
        generateVehicleQRCard(publicUrl, {
          issuedDate: formatDate(createdAt),
          expiryDate: formatDate(expiry),
          registrationNumber: vehicle.vehicle_register_number
        })
      ]);
      
      // Check timeout before database update
      if ((req as any).timedOut || res.headersSent) return;
      
      // Persist the styled card so existing UI shows the new design (fire and forget for speed)
      storage.updateVehicleQRCode(vehicle.id, qrCard).catch(err => 
        console.error('Failed to update QR code in DB:', err)
      );

      // Final check before sending response
      if ((req as any).timedOut || res.headersSent) return;

      const totalTime = Date.now() - startTime;
      console.log(`QR generation completed in ${totalTime}ms`);

      res.json({ 
        qrCode,
        qrCard,
        registration_number: vehicle.vehicle_register_number,
        vehicleId: vehicle.id,
        publicUrl: publicUrl,
        message: "QR code generated successfully" 
      });
    } catch (error: any) {
      // Only send error if headers haven't been sent (e.g., timeout already sent response)
      if (!res.headersSent) {
        const errorTime = Date.now() - startTime;
        console.error(`Error generating QR code (${errorTime}ms):`, error);
        res.status(500).json({ message: "Failed to generate QR code" });
      } else {
        console.error("Error generating QR code (response already sent):", error);
      }
    }
  });

  // Public vehicle view endpoint (no authentication required)
  app.get("/api/public/vehicles/:id", async (req, res) => {
    try {
      // Validate vehicle ID from params
      const rawId = req.params.id;
      const vehicleId = typeof rawId === 'string' ? parseInt(rawId.trim(), 10) : Number(rawId);
      
      if (!Number.isInteger(vehicleId) || vehicleId <= 0 || !Number.isFinite(vehicleId) || isNaN(vehicleId)) {
        return res.status(400).json({ message: `Invalid vehicle ID: ${rawId}` });
      }
      
      const vehicle = await storage.getVehicle(vehicleId);
      
      if (!vehicle) {
        return res.status(404).json({ message: "Vehicle not found" });
      }

      // Only return active vehicles for public view
      if (vehicle.status !== 'active') {
        return res.status(404).json({ message: "Vehicle not available for public view" });
      }

      res.json(vehicle);
    } catch (error) {
      console.error("Error fetching public vehicle:", error);
      res.status(500).json({ message: "Failed to fetch vehicle details" });
    }
  });

  // --- USER MANAGEMENT ENDPOINTS ---
  // List all users (admin only)
  app.get("/api/users", requireAuth, requireAdminOnly, async (req, res) => {
    try {
      const cacheKey = 'users:all';
      
      // Try cache first (10 minute TTL)
      const cached = await redisService.get<any>(cacheKey);
      if (cached) {
        res.set('X-Cache', 'HIT');
        return res.json(cached);
      }
      
      const allUsers = await db.select().from(users);
      
      // Cache for 10 minutes
      await redisService.set(cacheKey, allUsers, 600);
      
      res.set('X-Cache', 'MISS');
      res.json(allUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Create user (admin only)
  app.post("/api/users", requireAuth, requireAdminOnly, async (req, res) => {
    try {
      const { name, email, password, contact_number, image, role } = req.body;
      if (!email || !password || !name) return res.status(400).json({ error: "Missing required fields" });
      const hash = await bcrypt.hash(password, 10);
      const [user] = await db.insert(users).values({ name, email, password: hash, contact_number, image, role }).returning();
      
      // Invalidate users cache
      await redisService.delPattern('users:*');
      
      res.json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Edit user (admin only)
  app.put("/api/users/:id", requireAuth, requireAdminOnly, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, email, password, contact_number, image, role } = req.body;
      const update: any = { name, email, contact_number, image, role };
      if (password) update.password = await bcrypt.hash(password, 10);
      const [user] = await db.update(users).set(update).where(eq(users.id, Number(id))).returning();
      
      // Invalidate users cache
      await redisService.delPattern('users:*');
      
      res.json(user);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Delete user (admin only)
  app.delete("/api/users/:id", requireAuth, requireAdminOnly, async (req, res) => {
    try {
      const { id } = req.params;
      await db.delete(users).where(eq(users.id, Number(id)));
      
      // Invalidate users cache
      await redisService.delPattern('users:*');
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // --- NOTIFICATIONS ENDPOINTS ---
  // List notifications for current user
  app.get("/api/notifications", requireAuth, async (req, res) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const notes = await db.select().from(notifications).where(eq(notifications.user_id, userId));
    res.json(notes);
  });

  // Mark notification as read
  app.post("/api/notifications/:id/read", requireAuth, async (req, res) => {
    const userId = req.user?.id;
    const { id } = req.params;
    const [note] = await db.update(notifications).set({ read: true }).where(eq(notifications.id, Number(id))).returning();
    res.json(note);
  });

  // --- OWNER ENDPOINTS ---
  app.get("/api/owners", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { status, search, page = 1, limit = 10 } = req.query;
      const offset = (Number(page) - 1) * Number(limit);
      
      // Generate cache key
      const cacheParams: Record<string, string> = {
        status: (status as string) || 'all',
        search: (search as string) || '',
        page: String(page),
        limit: String(limit),
      };
      const sortedParams = Object.keys(cacheParams)
        .sort()
        .map(key => `${key}:${cacheParams[key]}`)
        .join('|');
      const cacheKey = `owners:${sortedParams}`;

      // Try cache first (5 minute TTL)
      const cached = await redisService.get<any>(cacheKey);
      if (cached) {
        res.set('X-Cache', 'HIT');
        return res.json(cached);
      }
      
      const result = await storage.getAllOwners({
        status: status as string,
        search: search as string,
        limit: Number(limit),
        offset,
      });
      
      const responseData = {
        owners: result.owners,
        total: result.total,
        page: Number(page),
        totalPages: Math.ceil(result.total / Number(limit)),
      };

      // Cache for 5 minutes
      await redisService.set(cacheKey, responseData, 300);
      
      res.set('X-Cache', 'MISS');
      res.json(responseData);
    } catch (error) {
      console.error("Error fetching owners:", error);
      res.status(500).json({ message: "Failed to fetch owners" });
    }
  });
  app.get("/api/owners/:id", requireAuth, requireAdminOnly, async (req, res) => {
    const id = parseInt(req.params.id);
    const owner = await storage.getOwner(id);
    if (!owner) return res.status(404).json({ message: "Owner not found" });
    res.json(owner);
  });
  app.post("/api/owners", requireAuth, requireAdminOnly, async (req, res) => {
    try {
      const { vehicle_id, ...ownerData } = req.body;
      const created = await storage.createOwner(ownerData);
      
      // If vehicle_id is provided, update the vehicle to link with this owner
      if (vehicle_id) {
        await storage.updateVehicle(vehicle_id, { owner_id: created.id });
        await redisService.invalidateVehicles();
      }
      
      // Invalidate owners cache
      await redisService.delPattern('owners:*');
      
      res.json(created);
    } catch (error) {
      console.error("Error creating owner:", error);
      res.status(500).json({ message: "Failed to create owner" });
    }
  });
  app.put("/api/owners/:id", requireAuth, requireAdminOnly, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { vehicle_id, ...update } = req.body;
      const updated = await storage.updateOwner(id, update);
      
      // If vehicle_id is provided, update the vehicle to link with this owner
      if (vehicle_id) {
        await storage.updateVehicle(vehicle_id, { owner_id: updated.id });
        await redisService.invalidateVehicles();
      }
      
      // Invalidate owners cache
      await redisService.delPattern('owners:*');
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating owner:", error);
      res.status(500).json({ message: "Failed to update owner" });
    }
  });
  app.patch("/api/owners/:id/status", requireAuth, requireAdminOnly, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      const updated = await storage.updateOwnerStatus(id, status);
      
      // Invalidate owners cache
      await redisService.delPattern('owners:*');
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating owner status:", error);
      res.status(500).json({ message: "Failed to update owner status" });
    }
  });

  // --- DRIVER ENDPOINTS ---
  app.get("/api/drivers", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { status, search, page = 1, limit = 10 } = req.query;
      const offset = (Number(page) - 1) * Number(limit);
      
      // Generate cache key
      const cacheParams: Record<string, string> = {
        status: (status as string) || 'all',
        search: (search as string) || '',
        page: String(page),
        limit: String(limit),
      };
      const sortedParams = Object.keys(cacheParams)
        .sort()
        .map(key => `${key}:${cacheParams[key]}`)
        .join('|');
      const cacheKey = `drivers:${sortedParams}`;

      // Try cache first (5 minute TTL)
      const cached = await redisService.get<any>(cacheKey);
      if (cached) {
        res.set('X-Cache', 'HIT');
        return res.json(cached);
      }
      
      const result = await storage.getAllDrivers({
        status: status as string,
        search: search as string,
        limit: Number(limit),
        offset,
      });
      
      const responseData = {
        drivers: result.drivers,
        total: result.total,
        page: Number(page),
        totalPages: Math.ceil(result.total / Number(limit)),
      };

      // Cache for 5 minutes
      await redisService.set(cacheKey, responseData, 300);
      
      res.set('X-Cache', 'MISS');
      res.json(responseData);
    } catch (error) {
      console.error("Error fetching drivers:", error);
      res.status(500).json({ message: "Failed to fetch drivers" });
    }
  });
  app.get("/api/drivers/:id", requireAuth, requireAdminOnly, async (req, res) => {
    const id = parseInt(req.params.id);
    const driver = await storage.getDriver(id);
    if (!driver) return res.status(404).json({ message: "Driver not found" });
    res.json(driver);
  });
  app.post("/api/drivers", requireAuth, requireAdminOnly, async (req, res) => {
    try {
      const { vehicle_id, ...driverData } = req.body;
      const created = await storage.createDriver(driverData);
      
      // If vehicle_id is provided, update the vehicle to link with this driver
      if (vehicle_id) {
        await storage.updateVehicle(vehicle_id, { driver_id: created.id });
        await redisService.invalidateVehicles();
      }
      
      // Invalidate drivers cache
      await redisService.delPattern('drivers:*');
      
      res.json(created);
    } catch (error) {
      console.error("Error creating driver:", error);
      res.status(500).json({ message: "Failed to create driver" });
    }
  });
  app.put("/api/drivers/:id", requireAuth, requireAdminOnly, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { vehicle_id, ...update } = req.body;
      const updated = await storage.updateDriver(id, update);
      
      // If vehicle_id is provided, update the vehicle to link with this driver
      if (vehicle_id) {
        await storage.updateVehicle(vehicle_id, { driver_id: updated.id });
        await redisService.invalidateVehicles();
      }
      
      // Invalidate drivers cache
      await redisService.delPattern('drivers:*');
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating driver:", error);
      res.status(500).json({ message: "Failed to update driver" });
    }
  });
  app.patch("/api/drivers/:id/status", requireAuth, requireAdminOnly, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      const updated = await storage.updateDriverStatus(id, status);
      
      // Invalidate drivers cache
      await redisService.delPattern('drivers:*');
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating driver status:", error);
      res.status(500).json({ message: "Failed to update driver status" });
    }
  });

  // --- CONDUCTOR ENDPOINTS ---
  app.get("/api/conductors", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { status, search, page = 1, limit = 10 } = req.query;
      const offset = (Number(page) - 1) * Number(limit);
      
      // Generate cache key
      const cacheParams: Record<string, string> = {
        status: (status as string) || 'all',
        search: (search as string) || '',
        page: String(page),
        limit: String(limit),
      };
      const sortedParams = Object.keys(cacheParams)
        .sort()
        .map(key => `${key}:${cacheParams[key]}`)
        .join('|');
      const cacheKey = `conductors:${sortedParams}`;

      // Try cache first (5 minute TTL)
      const cached = await redisService.get<any>(cacheKey);
      if (cached) {
        res.set('X-Cache', 'HIT');
        return res.json(cached);
      }
      
      const result = await storage.getAllConductors({
        status: status as string,
        search: search as string,
        limit: Number(limit),
        offset,
      });
      
      const responseData = {
        conductors: result.conductors,
        total: result.total,
        page: Number(page),
        totalPages: Math.ceil(result.total / Number(limit)),
      };

      // Cache for 5 minutes
      await redisService.set(cacheKey, responseData, 300);
      
      res.set('X-Cache', 'MISS');
      res.json(responseData);
    } catch (error) {
      console.error("Error fetching conductors:", error);
      res.status(500).json({ message: "Failed to fetch conductors" });
    }
  });
  app.get("/api/conductors/:id", requireAuth, requireAdminOnly, async (req, res) => {
    const id = parseInt(req.params.id);
    const conductor = await storage.getConductor(id);
    if (!conductor) return res.status(404).json({ message: "Conductor not found" });
    res.json(conductor);
  });
  app.post("/api/conductors", requireAuth, requireAdminOnly, async (req, res) => {
    try {
      const { vehicle_id, ...conductorData } = req.body;
      const created = await storage.createConductor(conductorData);
      
      // If vehicle_id is provided, update the vehicle to link with this conductor
      if (vehicle_id) {
        await storage.updateVehicle(vehicle_id, { conductor_id: created.id });
        await redisService.invalidateVehicles();
      }
      
      // Invalidate conductors cache
      await redisService.delPattern('conductors:*');
      
      res.json(created);
    } catch (error) {
      console.error("Error creating conductor:", error);
      res.status(500).json({ message: "Failed to create conductor" });
    }
  });
  app.put("/api/conductors/:id", requireAuth, requireAdminOnly, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { vehicle_id, ...update } = req.body;
      const updated = await storage.updateConductor(id, update);
      
      // If vehicle_id is provided, update the vehicle to link with this conductor
      if (vehicle_id) {
        await storage.updateVehicle(vehicle_id, { conductor_id: updated.id });
        await redisService.invalidateVehicles();
      }
      
      // Invalidate conductors cache
      await redisService.delPattern('conductors:*');
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating conductor:", error);
      res.status(500).json({ message: "Failed to update conductor" });
    }
  });
  app.patch("/api/conductors/:id/status", requireAuth, requireAdminOnly, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      const updated = await storage.updateConductorStatus(id, status);
      
      // Invalidate conductors cache
      await redisService.delPattern('conductors:*');
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating conductor status:", error);
      res.status(500).json({ message: "Failed to update conductor status" });
    }
  });

  // --- VEHICLE CATEGORIES ENDPOINTS ---
  
  // Public vehicle categories endpoint (for forms)
  app.get("/api/vehicle-categories/public", async (req, res) => {
    const { status, search } = req.query;
    
    let whereConditions = [];
    if (status) whereConditions.push(eq(vehicle_categories.status, status as string));
    if (search) whereConditions.push(like(vehicle_categories.name, `%${search}%`));
    
    const result = await db.select({
      id: vehicle_categories.id,
      name: vehicle_categories.name,
      description: vehicle_categories.description,
      status: vehicle_categories.status,
    })
    .from(vehicle_categories)
    .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
    .orderBy(vehicle_categories.name);

    res.json({ categories: result });
  });

  app.get("/api/vehicle-categories", requireAuth, async (req, res) => {
    const { status, search, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    let whereConditions = [];
    if (status) whereConditions.push(eq(vehicle_categories.status, status as string));
    if (search) whereConditions.push(like(vehicle_categories.name, `%${search}%`));
    
    const result = await db.select().from(vehicle_categories)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .limit(Number(limit))
      .offset(offset);
    
    const totalResult = await db.select({ count: sql`count(*)` }).from(vehicle_categories)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);
    
    res.json({
      categories: result,
      total: Number(totalResult[0]?.count || 0),
      page: Number(page),
      totalPages: Math.ceil(Number(totalResult[0]?.count || 0) / Number(limit)),
    });
  });

  app.get("/api/vehicle-categories/:id", requireAuth, requireAdminOnly, async (req, res) => {
    const id = parseInt(req.params.id);
    const [category] = await db.select().from(vehicle_categories).where(eq(vehicle_categories.id, id));
    if (!category) return res.status(404).json({ message: "Vehicle category not found" });
    res.json(category);
  });

  app.post("/api/vehicle-categories", requireAuth, requireAdminOnly, async (req, res) => {
    try {
      const validatedData = insertVehicleCategorySchema.parse(req.body);
      const [category] = await db.insert(vehicle_categories).values(validatedData).returning();
      
      // Invalidate vehicle-categories and vehicle-types cache (types depend on categories)
      await Promise.all([
        redisService.delPattern('vehicle-categories:*'),
        redisService.delPattern('vehicle-types:*'),
      ]);
      
      res.json(category);
    } catch (error) {
      console.error("Error creating vehicle category:", error);
      res.status(500).json({ message: "Failed to create vehicle category" });
    }
  });

  app.put("/api/vehicle-categories/:id", requireAuth, requireAdminOnly, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertVehicleCategorySchema.partial().parse(req.body);
      const [category] = await db.update(vehicle_categories)
        .set({ ...validatedData, updated_at: new Date() })
        .where(eq(vehicle_categories.id, id))
        .returning();
      if (!category) return res.status(404).json({ message: "Vehicle category not found" });
      
      // Invalidate vehicle-categories and vehicle-types cache (types depend on categories)
      await Promise.all([
        redisService.delPattern('vehicle-categories:*'),
        redisService.delPattern('vehicle-types:*'),
      ]);
      
      res.json(category);
    } catch (error) {
      console.error("Error updating vehicle category:", error);
      res.status(500).json({ message: "Failed to update vehicle category" });
    }
  });

  app.patch("/api/vehicle-categories/:id/status", requireAuth, requireAdminOnly, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      const [category] = await db.update(vehicle_categories)
        .set({ status, updated_at: new Date() })
        .where(eq(vehicle_categories.id, id))
        .returning();
      if (!category) return res.status(404).json({ message: "Vehicle category not found" });
      
      // Invalidate vehicle-categories and vehicle-types cache (types depend on categories)
      await Promise.all([
        redisService.delPattern('vehicle-categories:*'),
        redisService.delPattern('vehicle-types:*'),
      ]);
      
      res.json(category);
    } catch (error) {
      console.error("Error updating vehicle category status:", error);
      res.status(500).json({ message: "Failed to update vehicle category status" });
    }
  });

  app.delete("/api/vehicle-categories/:id", requireAuth, requireAdminOnly, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(vehicle_categories).where(eq(vehicle_categories.id, id));
      
      // Invalidate vehicle-categories and vehicle-types cache (types depend on categories)
      await Promise.all([
        redisService.delPattern('vehicle-categories:*'),
        redisService.delPattern('vehicle-types:*'),
      ]);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting vehicle category:", error);
      res.status(500).json({ message: "Failed to delete vehicle category" });
    }
  });

  // --- VEHICLE TYPES ENDPOINTS ---
  
  // Public vehicle types endpoint (for forms)
  app.get("/api/vehicle-types/public", async (req, res) => {
    const { status, search, category_id } = req.query;
    
    let whereConditions = [];
    if (status) whereConditions.push(eq(vehicle_types.status, status as string));
    if (search) whereConditions.push(like(vehicle_types.name, `%${search}%`));
    if (category_id) whereConditions.push(eq(vehicle_types.vehicle_category_id, Number(category_id)));
    
    const result = await db.select({
      id: vehicle_types.id,
      name: vehicle_types.name,
      description: vehicle_types.description,
      status: vehicle_types.status,
      vehicle_category_id: vehicle_types.vehicle_category_id,
      category_name: vehicle_categories.name,
    })
    .from(vehicle_types)
    .leftJoin(vehicle_categories, eq(vehicle_types.vehicle_category_id, vehicle_categories.id))
    .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
    .orderBy(vehicle_types.name);

    res.json({ vehicleTypes: result });
  });

  app.get("/api/vehicle-types", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { status, search, category_id, page = 1, limit = 10 } = req.query;
      const offset = (Number(page) - 1) * Number(limit);
      
      // Generate cache key
      const cacheParams: Record<string, string> = {
        status: (status as string) || 'all',
        search: (search as string) || '',
        category_id: category_id ? String(category_id) : 'all',
        page: String(page),
        limit: String(limit),
      };
      const sortedParams = Object.keys(cacheParams)
        .sort()
        .map(key => `${key}:${cacheParams[key]}`)
        .join('|');
      const cacheKey = `vehicle-types:${sortedParams}`;

      // Try cache first (30 minute TTL)
      const cached = await redisService.get<any>(cacheKey);
      if (cached) {
        res.set('X-Cache', 'HIT');
        return res.json(cached);
      }
      
      let whereConditions = [];
      if (status) whereConditions.push(eq(vehicle_types.status, status as string));
      if (search) whereConditions.push(like(vehicle_types.name, `%${search}%`));
      if (category_id) whereConditions.push(eq(vehicle_types.vehicle_category_id, Number(category_id)));
      
      const result = await db.select({
        id: vehicle_types.id,
        name: vehicle_types.name,
        description: vehicle_types.description,
        status: vehicle_types.status,
        created_at: vehicle_types.created_at,
        updated_at: vehicle_types.updated_at,
        vehicle_category_id: vehicle_types.vehicle_category_id,
        category_name: vehicle_categories.name,
      })
      .from(vehicle_types)
      .leftJoin(vehicle_categories, eq(vehicle_types.vehicle_category_id, vehicle_categories.id))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .limit(Number(limit))
      .offset(offset);
      
      const totalResult = await db.select({ count: sql`count(*)` }).from(vehicle_types)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);
      
      const responseData = {
        types: result,
        total: Number(totalResult[0]?.count || 0),
        page: Number(page),
        totalPages: Math.ceil(Number(totalResult[0]?.count || 0) / Number(limit)),
      };

      // Cache for 30 minutes
      await redisService.set(cacheKey, responseData, 1800);
      
      res.set('X-Cache', 'MISS');
      res.json(responseData);
    } catch (error) {
      console.error("Error fetching vehicle types:", error);
      res.status(500).json({ message: "Failed to fetch vehicle types" });
    }
  });

  app.get("/api/vehicle-types/:id", requireAuth, requireAdminOnly, async (req, res) => {
    const id = parseInt(req.params.id);
    const [type] = await db.select().from(vehicle_types).where(eq(vehicle_types.id, id));
    if (!type) return res.status(404).json({ message: "Vehicle type not found" });
    res.json(type);
  });

  app.post("/api/vehicle-types", requireAuth, requireAdminOnly, async (req, res) => {
    try {
      const validatedData = insertVehicleTypeSchema.parse(req.body);
      const [type] = await db.insert(vehicle_types).values(validatedData).returning();
      
      // Invalidate vehicle-types cache
      await redisService.delPattern('vehicle-types:*');
      
      res.json(type);
    } catch (error) {
      console.error("Error creating vehicle type:", error);
      res.status(500).json({ message: "Failed to create vehicle type" });
    }
  });

  app.put("/api/vehicle-types/:id", requireAuth, requireAdminOnly, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertVehicleTypeSchema.partial().parse(req.body);
      const [type] = await db.update(vehicle_types)
        .set({ ...validatedData, updated_at: new Date() })
        .where(eq(vehicle_types.id, id))
        .returning();
      if (!type) return res.status(404).json({ message: "Vehicle type not found" });
      
      // Invalidate vehicle-types cache
      await redisService.delPattern('vehicle-types:*');
      
      res.json(type);
    } catch (error) {
      console.error("Error updating vehicle type:", error);
      res.status(500).json({ message: "Failed to update vehicle type" });
    }
  });

  app.patch("/api/vehicle-types/:id/status", requireAuth, requireAdminOnly, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      const [type] = await db.update(vehicle_types)
        .set({ status, updated_at: new Date() })
        .where(eq(vehicle_types.id, id))
        .returning();
      if (!type) return res.status(404).json({ message: "Vehicle type not found" });
      
      // Invalidate vehicle-types cache
      await redisService.delPattern('vehicle-types:*');
      
      res.json(type);
    } catch (error) {
      console.error("Error updating vehicle type status:", error);
      res.status(500).json({ message: "Failed to update vehicle type status" });
    }
  });

  app.delete("/api/vehicle-types/:id", requireAuth, requireAdminOnly, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(vehicle_types).where(eq(vehicle_types.id, id));
      
      // Invalidate vehicle-types cache
      await redisService.delPattern('vehicle-types:*');
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting vehicle type:", error);
      res.status(500).json({ message: "Failed to delete vehicle type" });
    }
  });

  // --- FUEL TYPES ENDPOINTS ---
  
  // Public fuel types endpoint (for forms)
  app.get("/api/fuel-types/public", async (req, res) => {
    const { status, search } = req.query;
    
    let whereConditions = [];
    if (status) whereConditions.push(eq(fuel_types.status, status as string));
    if (search) whereConditions.push(like(fuel_types.name, `%${search}%`));
    
    const result = await db.select({
      id: fuel_types.id,
      name: fuel_types.name,
      description: fuel_types.description,
      status: fuel_types.status,
    })
    .from(fuel_types)
    .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
    .orderBy(fuel_types.name);

    res.json({ fuelTypes: result });
  });

  app.get("/api/fuel-types", requireAuth, async (req, res) => {
    try {
      const { status, search, page = 1, limit = 10 } = req.query;
      const offset = (Number(page) - 1) * Number(limit);
      
      // Generate cache key
      const cacheParams: Record<string, string> = {
        status: (status as string) || 'all',
        search: (search as string) || '',
        page: String(page),
        limit: String(limit),
      };
      const sortedParams = Object.keys(cacheParams)
        .sort()
        .map(key => `${key}:${cacheParams[key]}`)
        .join('|');
      const cacheKey = `fuel-types:${sortedParams}`;

      // Try cache first (30 minute TTL)
      const cached = await redisService.get<any>(cacheKey);
      if (cached) {
        res.set('X-Cache', 'HIT');
        return res.json(cached);
      }
      
      let whereConditions = [];
      if (status) whereConditions.push(eq(fuel_types.status, status as string));
      if (search) whereConditions.push(like(fuel_types.name, `%${search}%`));
      
      const result = await db.select().from(fuel_types)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .limit(Number(limit))
        .offset(offset);
      
      const totalResult = await db.select({ count: sql`count(*)` }).from(fuel_types)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);
      
      const responseData = {
        fuelTypes: result,
        total: Number(totalResult[0]?.count || 0),
        page: Number(page),
        totalPages: Math.ceil(Number(totalResult[0]?.count || 0) / Number(limit)),
      };

      // Cache for 30 minutes
      await redisService.set(cacheKey, responseData, 1800);
      
      res.set('X-Cache', 'MISS');
      res.json(responseData);
    } catch (error) {
      console.error("Error fetching fuel types:", error);
      res.status(500).json({ message: "Failed to fetch fuel types" });
    }
  });

  app.get("/api/fuel-types/:id", requireAuth, requireAdminOnly, async (req, res) => {
    const id = parseInt(req.params.id);
    const [fuelType] = await db.select().from(fuel_types).where(eq(fuel_types.id, id));
    if (!fuelType) return res.status(404).json({ message: "Fuel type not found" });
    res.json(fuelType);
  });

  app.post("/api/fuel-types", requireAuth, requireAdminOnly, async (req, res) => {
    try {
      const validatedData = insertFuelTypeSchema.parse(req.body);
      const [fuelType] = await db.insert(fuel_types).values(validatedData).returning();
      
      // Invalidate fuel-types cache
      await redisService.delPattern('fuel-types:*');
      
      res.json(fuelType);
    } catch (error) {
      console.error("Error creating fuel type:", error);
      res.status(500).json({ message: "Failed to create fuel type" });
    }
  });

  app.put("/api/fuel-types/:id", requireAuth, requireAdminOnly, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertFuelTypeSchema.partial().parse(req.body);
      const [fuelType] = await db.update(fuel_types)
        .set({ ...validatedData, updated_at: new Date() })
        .where(eq(fuel_types.id, id))
        .returning();
      if (!fuelType) return res.status(404).json({ message: "Fuel type not found" });
      
      // Invalidate fuel-types cache
      await redisService.delPattern('fuel-types:*');
      
      res.json(fuelType);
    } catch (error) {
      console.error("Error updating fuel type:", error);
      res.status(500).json({ message: "Failed to update fuel type" });
    }
  });

  app.patch("/api/fuel-types/:id/status", requireAuth, requireAdminOnly, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      const [fuelType] = await db.update(fuel_types)
        .set({ status, updated_at: new Date() })
        .where(eq(fuel_types.id, id))
        .returning();
      if (!fuelType) return res.status(404).json({ message: "Fuel type not found" });
      
      // Invalidate fuel-types cache
      await redisService.delPattern('fuel-types:*');
      
      res.json(fuelType);
    } catch (error) {
      console.error("Error updating fuel type status:", error);
      res.status(500).json({ message: "Failed to update fuel type status" });
    }
  });

  app.delete("/api/fuel-types/:id", requireAuth, requireAdminOnly, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(fuel_types).where(eq(fuel_types.id, id));
      
      // Invalidate fuel-types cache
      await redisService.delPattern('fuel-types:*');
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting fuel type:", error);
      res.status(500).json({ message: "Failed to delete fuel type" });
    }
  });

  // --- TERMINALS ENDPOINTS ---
  
  // Public terminals endpoint (for forms)
  app.get("/api/terminals/public", async (req, res) => {
    const { status, search } = req.query;
    
    let whereConditions = [];
    if (status) whereConditions.push(eq(terminals.status, status as string));
    if (search) whereConditions.push(like(terminals.name, `%${search}%`));
    
    const result = await db.select({
      id: terminals.id,
      name: terminals.name,
      location: terminals.location,
      status: terminals.status,
    })
    .from(terminals)
    .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
    .orderBy(terminals.name);

    res.json({ terminals: result });
  });

  app.get("/api/terminals", requireAuth, async (req, res) => {
    try {
      const { status, search, page = 1, limit = 10 } = req.query;
      const offset = (Number(page) - 1) * Number(limit);
      
      // Generate cache key
      const cacheParams: Record<string, string> = {
        status: (status as string) || 'all',
        search: (search as string) || '',
        page: String(page),
        limit: String(limit),
      };
      const sortedParams = Object.keys(cacheParams)
        .sort()
        .map(key => `${key}:${cacheParams[key]}`)
        .join('|');
      const cacheKey = `terminals:${sortedParams}`;

      // Try cache first (30 minute TTL)
      const cached = await redisService.get<any>(cacheKey);
      if (cached) {
        res.set('X-Cache', 'HIT');
        return res.json(cached);
      }
      
      let whereConditions = [];
      if (status) whereConditions.push(eq(terminals.status, status as string));
      if (search) whereConditions.push(like(terminals.name, `%${search}%`));
      
      const result = await db.select().from(terminals)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .limit(Number(limit))
        .offset(offset);
      
      const totalResult = await db.select({ count: sql`count(*)` }).from(terminals)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);
      
      const responseData = {
        terminals: result,
        total: Number(totalResult[0]?.count || 0),
        page: Number(page),
        totalPages: Math.ceil(Number(totalResult[0]?.count || 0) / Number(limit)),
      };

      // Cache for 30 minutes
      await redisService.set(cacheKey, responseData, 1800);
      
      res.set('X-Cache', 'MISS');
      res.json(responseData);
    } catch (error) {
      console.error("Error fetching terminals:", error);
      res.status(500).json({ message: "Failed to fetch terminals" });
    }
  });

  app.get("/api/terminals/:id", requireAuth, requireAdminOnly, async (req, res) => {
    const id = parseInt(req.params.id);
    const [terminal] = await db.select().from(terminals).where(eq(terminals.id, id));
    if (!terminal) return res.status(404).json({ message: "Terminal not found" });
    res.json(terminal);
  });

  app.post("/api/terminals", requireAuth, requireAdminOnly, async (req, res) => {
    try {
      const validatedData = insertTerminalSchema.parse(req.body);
      const [terminal] = await db.insert(terminals).values(validatedData).returning();
      
      // Invalidate terminals and routes cache (routes depend on terminals)
      await Promise.all([
        redisService.delPattern('terminals:*'),
        redisService.delPattern('routes:*'),
      ]);
      
      res.json(terminal);
    } catch (error) {
      console.error("Error creating terminal:", error);
      res.status(500).json({ message: "Failed to create terminal" });
    }
  });

  app.put("/api/terminals/:id", requireAuth, requireAdminOnly, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertTerminalSchema.partial().parse(req.body);
      const [terminal] = await db.update(terminals)
        .set({ ...validatedData, updated_at: new Date() })
        .where(eq(terminals.id, id))
        .returning();
      if (!terminal) return res.status(404).json({ message: "Terminal not found" });
      
      // Invalidate terminals and routes cache (routes depend on terminals)
      await Promise.all([
        redisService.delPattern('terminals:*'),
        redisService.delPattern('routes:*'),
      ]);
      
      res.json(terminal);
    } catch (error) {
      console.error("Error updating terminal:", error);
      res.status(500).json({ message: "Failed to update terminal" });
    }
  });

  app.patch("/api/terminals/:id/status", requireAuth, requireAdminOnly, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      const [terminal] = await db.update(terminals)
        .set({ status, updated_at: new Date() })
        .where(eq(terminals.id, id))
        .returning();
      if (!terminal) return res.status(404).json({ message: "Terminal not found" });
      
      // Invalidate terminals and routes cache (routes depend on terminals)
      await Promise.all([
        redisService.delPattern('terminals:*'),
        redisService.delPattern('routes:*'),
      ]);
      
      res.json(terminal);
    } catch (error) {
      console.error("Error updating terminal status:", error);
      res.status(500).json({ message: "Failed to update terminal status" });
    }
  });

  app.delete("/api/terminals/:id", requireAuth, requireAdminOnly, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(terminals).where(eq(terminals.id, id));
      
      // Invalidate terminals and routes cache (routes depend on terminals)
      await Promise.all([
        redisService.delPattern('terminals:*'),
        redisService.delPattern('routes:*'),
      ]);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting terminal:", error);
      res.status(500).json({ message: "Failed to delete terminal" });
    }
  });

  // --- ROUTES ENDPOINTS ---
  
  // Public routes endpoint (for forms)
  app.get("/api/routes/public", async (req, res) => {
    const { status, search, terminal_id } = req.query;
    
    let whereConditions = [];
    if (status) whereConditions.push(eq(routes.status, status as string));
    if (search) whereConditions.push(like(routes.route_name, `%${search}%`));
    if (terminal_id) whereConditions.push(eq(routes.terminal_id, Number(terminal_id)));
    
    const result = await db.select({
      id: routes.id,
      route_number: routes.route_number,
      route_name: routes.route_name,
      route_area_via: routes.route_area_via,
      status: routes.status,
      terminal_id: routes.terminal_id,
      terminal_name: terminals.name,
    })
    .from(routes)
    .leftJoin(terminals, eq(routes.terminal_id, terminals.id))
    .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
    .orderBy(routes.route_name);

    res.json({ routes: result });
  });

  app.get("/api/routes", requireAuth, requireAdminOnly, async (req, res) => {
    try {
      const { status, search, terminal_id, page = 1, limit = 10 } = req.query;
      const offset = (Number(page) - 1) * Number(limit);
      
      // Generate cache key
      const cacheParams: Record<string, string> = {
        status: (status as string) || 'all',
        search: (search as string) || '',
        terminal_id: terminal_id ? String(terminal_id) : 'all',
        page: String(page),
        limit: String(limit),
      };
      const sortedParams = Object.keys(cacheParams)
        .sort()
        .map(key => `${key}:${cacheParams[key]}`)
        .join('|');
      const cacheKey = `routes:${sortedParams}`;

      // Try cache first (30 minute TTL)
      const cached = await redisService.get<any>(cacheKey);
      if (cached) {
        res.set('X-Cache', 'HIT');
        return res.json(cached);
      }
      
      let whereConditions = [];
      if (status) whereConditions.push(eq(routes.status, status as string));
      if (search) whereConditions.push(like(routes.route_name, `%${search}%`));
      if (terminal_id) whereConditions.push(eq(routes.terminal_id, Number(terminal_id)));
      
      const result = await db.select({
        id: routes.id,
        route_number: routes.route_number,
        route_name: routes.route_name,
        route_area_via: routes.route_area_via,
        status: routes.status,
        created_at: routes.created_at,
        updated_at: routes.updated_at,
        terminal_id: routes.terminal_id,
        terminal_name: terminals.name,
      })
      .from(routes)
      .leftJoin(terminals, eq(routes.terminal_id, terminals.id))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .limit(Number(limit))
      .offset(offset);
      
      const totalResult = await db.select({ count: sql`count(*)` }).from(routes)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);
      
      const responseData = {
        routes: result,
        total: Number(totalResult[0]?.count || 0),
        page: Number(page),
        totalPages: Math.ceil(Number(totalResult[0]?.count || 0) / Number(limit)),
      };

      // Cache for 30 minutes
      await redisService.set(cacheKey, responseData, 1800);
      
      res.set('X-Cache', 'MISS');
      res.json(responseData);
    } catch (error) {
      console.error("Error fetching routes:", error);
      res.status(500).json({ message: "Failed to fetch routes" });
    }
  });

  app.get("/api/routes/:id", requireAuth, requireAdminOnly, async (req, res) => {
    const id = parseInt(req.params.id);
    const [route] = await db.select().from(routes).where(eq(routes.id, id));
    if (!route) return res.status(404).json({ message: "Route not found" });
    res.json(route);
  });

  app.post("/api/routes", requireAuth, requireAdminOnly, async (req, res) => {
    try {
      const validatedData = insertRouteSchema.parse(req.body);
      const [route] = await db.insert(routes).values(validatedData).returning();
      
      // Invalidate routes cache
      await redisService.delPattern('routes:*');
      
      res.json(route);
    } catch (error) {
      console.error("Error creating route:", error);
      res.status(500).json({ message: "Failed to create route" });
    }
  });

  app.put("/api/routes/:id", requireAuth, requireAdminOnly, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertRouteSchema.partial().parse(req.body);
      const [route] = await db.update(routes)
        .set({ ...validatedData, updated_at: new Date() })
        .where(eq(routes.id, id))
        .returning();
      if (!route) return res.status(404).json({ message: "Route not found" });
      
      // Invalidate routes cache
      await redisService.delPattern('routes:*');
      
      res.json(route);
    } catch (error) {
      console.error("Error updating route:", error);
      res.status(500).json({ message: "Failed to update route" });
    }
  });

  app.patch("/api/routes/:id/status", requireAuth, requireAdminOnly, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      const [route] = await db.update(routes)
        .set({ status, updated_at: new Date() })
        .where(eq(routes.id, id))
        .returning();
      if (!route) return res.status(404).json({ message: "Route not found" });
      
      // Invalidate routes cache
      await redisService.delPattern('routes:*');
      
      res.json(route);
    } catch (error) {
      console.error("Error updating route status:", error);
      res.status(500).json({ message: "Failed to update route status" });
    }
  });

  app.delete("/api/routes/:id", requireAuth, requireAdminOnly, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(routes).where(eq(routes.id, id));
      
      // Invalidate routes cache
      await redisService.delPattern('routes:*');
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting route:", error);
      res.status(500).json({ message: "Failed to delete route" });
    }
  });

  // Tracker Companies CRUD endpoints
  
  // Public tracker companies endpoint (for forms)
  app.get("/api/tracker-companies/public", async (req, res) => {
    const { status, search } = req.query;
    
    let whereConditions = [];
    if (status) whereConditions.push(eq(tracker_companies.status, status as string));
    if (search) whereConditions.push(like(tracker_companies.name, `%${search}%`));
    
    const result = await db.select({
      id: tracker_companies.id,
      name: tracker_companies.name,
      contact_number: tracker_companies.contact_number,
      email: tracker_companies.email,
      status: tracker_companies.status,
    })
    .from(tracker_companies)
    .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
    .orderBy(tracker_companies.name);

    res.json({ trackerCompanies: result });
  });

  app.get("/api/tracker-companies", requireAuth, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string || "";
      const status = req.query.status as string || "";

      // Generate cache key
      const cacheParams: Record<string, string> = {
        status: status || 'all',
        search: search || '',
        page: String(page),
        limit: String(limit),
      };
      const sortedParams = Object.keys(cacheParams)
        .sort()
        .map(key => `${key}:${cacheParams[key]}`)
        .join('|');
      const cacheKey = `tracker-companies:${sortedParams}`;

      // Try cache first (30 minute TTL)
      const cached = await redisService.get<any>(cacheKey);
      if (cached) {
        res.set('X-Cache', 'HIT');
        return res.json(cached);
      }

      const offset = (page - 1) * limit;
      let whereConditions = [];

      if (search) {
        whereConditions.push(like(tracker_companies.name, `%${search}%`));
      }
      if (status) {
        whereConditions.push(eq(tracker_companies.status, status));
      }

      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      const [companies, totalResult] = await Promise.all([
        db.select()
          .from(tracker_companies)
          .where(whereClause)
          .limit(limit)
          .offset(offset)
          .orderBy(tracker_companies.name),
        db.select({ count: sql<number>`count(*)` })
          .from(tracker_companies)
          .where(whereClause)
      ]);

      const total = totalResult[0]?.count || 0;
      const responseData = {
        trackerCompanies: companies,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };

      // Cache for 30 minutes
      await redisService.set(cacheKey, responseData, 1800);
      
      res.set('X-Cache', 'MISS');
      res.json(responseData);
    } catch (error) {
      console.error("Error fetching tracker companies:", error);
      res.status(500).json({ message: "Failed to fetch tracker companies" });
    }
  });

  app.get("/api/tracker-companies/:id", requireAuth, requireAdminOnly, async (req, res) => {
    const id = parseInt(req.params.id);
    const [company] = await db.select()
      .from(tracker_companies)
      .where(eq(tracker_companies.id, id));
    if (!company) return res.status(404).json({ message: "Tracker company not found" });
    res.json(company);
  });

  app.post("/api/tracker-companies", requireAuth, requireAdminOnly, async (req, res) => {
    try {
      const validatedData = insertTrackerCompanySchema.parse(req.body);
      const [company] = await db.insert(tracker_companies).values(validatedData).returning();
      
      // Invalidate tracker-companies cache
      await redisService.delPattern('tracker-companies:*');
      
      res.json(company);
    } catch (error) {
      console.error("Error creating tracker company:", error);
      res.status(500).json({ message: "Failed to create tracker company" });
    }
  });

  app.put("/api/tracker-companies/:id", requireAuth, requireAdminOnly, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertTrackerCompanySchema.parse(req.body);
      const [company] = await db.update(tracker_companies)
        .set({ ...validatedData, updated_at: new Date() })
        .where(eq(tracker_companies.id, id))
        .returning();
      if (!company) return res.status(404).json({ message: "Tracker company not found" });
      
      // Invalidate tracker-companies cache
      await redisService.delPattern('tracker-companies:*');
      
      res.json(company);
    } catch (error) {
      console.error("Error updating tracker company:", error);
      res.status(500).json({ message: "Failed to update tracker company" });
    }
  });

  app.patch("/api/tracker-companies/:id/status", requireAuth, requireAdminOnly, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      const [company] = await db.update(tracker_companies)
        .set({ status, updated_at: new Date() })
        .where(eq(tracker_companies.id, id))
        .returning();
      if (!company) return res.status(404).json({ message: "Tracker company not found" });
      
      // Invalidate tracker-companies cache
      await redisService.delPattern('tracker-companies:*');
      
      res.json(company);
    } catch (error) {
      console.error("Error updating tracker company status:", error);
      res.status(500).json({ message: "Failed to update tracker company status" });
    }
  });

  app.delete("/api/tracker-companies/:id", requireAuth, requireAdminOnly, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(tracker_companies).where(eq(tracker_companies.id, id));
      
      // Invalidate tracker-companies cache
      await redisService.delPattern('tracker-companies:*');
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting tracker company:", error);
      res.status(500).json({ message: "Failed to delete tracker company" });
    }
  });

  // Tracker Payments CRUD endpoints
  app.get("/api/tracker-payments", requireAuth, async (req, res) => {
    try {
      const { vehicle_id, tracker_company_id, vehicle_type_id, status, expired, page = 1, limit = 50 } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const result = await storage.getAllTrackerPayments({
        vehicle_id: vehicle_id ? Number(vehicle_id) : undefined,
        tracker_company_id: tracker_company_id ? Number(tracker_company_id) : undefined,
        vehicle_type_id: vehicle_type_id ? Number(vehicle_type_id) : undefined,
        status: status as string,
        expired: expired === 'true',
        limit: Number(limit),
        offset,
      });

      res.json({
        payments: result.payments,
        total: result.total,
        page: Number(page),
        totalPages: Math.ceil(result.total / Number(limit)),
      });
    } catch (error) {
      console.error("Error fetching tracker payments:", error);
      res.status(500).json({ message: "Failed to fetch tracker payments" });
    }
  });

  // Summary endpoint for total payments (optimized)
  app.get("/api/tracker-payments/summary", requireAuth, async (req, res) => {
    try {
      // Use Drizzle query builder for type safety and better performance
      const summaryResult = await db
        .select({ 
          totalAmount: sql<number>`COALESCE(SUM(${tracker_payments.amount}::numeric), 0)`,
          totalCount: sql<number>`COUNT(*)::int`
        })
        .from(tracker_payments);
      
      res.json({
        totalAmount: Number(summaryResult[0]?.totalAmount || 0),
        totalCount: summaryResult[0]?.totalCount || 0
      });
    } catch (error) {
      console.error("Error fetching tracker payments summary:", error);
      res.status(500).json({ message: "Failed to fetch summary" });
    }
  });

  app.get("/api/tracker-payments/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const payment = await storage.getTrackerPayment(id);
      if (!payment) {
        return res.status(404).json({ message: "Tracker payment not found" });
      }
      res.json(payment);
    } catch (error) {
      console.error("Error fetching tracker payment:", error);
      res.status(500).json({ message: "Failed to fetch tracker payment" });
    }
  });

  app.post("/api/tracker-payments", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const validatedData = insertTrackerPaymentSchema.parse({
        ...req.body,
        created_by: user?.id || null,
      });
      const payment = await storage.createTrackerPayment(validatedData);
      res.json(payment);
    } catch (error) {
      console.error("Error creating tracker payment:", error);
      res.status(500).json({ message: "Failed to create tracker payment" });
    }
  });

  app.patch("/api/tracker-payments/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertTrackerPaymentSchema.partial().parse(req.body);
      const payment = await storage.updateTrackerPayment(id, validatedData);
      if (!payment) {
        return res.status(404).json({ message: "Tracker payment not found" });
      }
      res.json(payment);
    } catch (error) {
      console.error("Error updating tracker payment:", error);
      res.status(500).json({ message: "Failed to update tracker payment" });
    }
  });

  app.delete("/api/tracker-payments/:id", requireAuth, requireAdminOnly, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTrackerPayment(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting tracker payment:", error);
      res.status(500).json({ message: "Failed to delete tracker payment" });
    }
  });

  app.post("/api/tracker-payments/:id/renew", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { payment_date, amount } = req.body;
      
      if (!payment_date) {
        return res.status(400).json({ message: "Payment date is required" });
      }

      const payment = await storage.renewTrackerPayment(id, new Date(payment_date), amount);
      res.json(payment);
    } catch (error) {
      console.error("Error renewing tracker payment:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to renew tracker payment" });
    }
  });

  app.get("/api/tracker-payments/expired/list", requireAuth, async (req, res) => {
    try {
      const expiredPayments = await storage.getExpiredPayments();
      res.json({ payments: expiredPayments, count: expiredPayments.length });
    } catch (error) {
      console.error("Error fetching expired payments:", error);
      res.status(500).json({ message: "Failed to fetch expired payments" });
    }
  });

  // --- DIG API ENDPOINTS (External API with Token Authentication) ---
  // Secure API endpoint for DIG to fetch vehicle data
  app.get("/api/dig/vehicles", requireApiToken, async (req, res) => {
    try {
      // Generate cache key for DIG API
      const cacheKey = 'dig:vehicles:all';

      // Try cache first (10 minute TTL for external API)
      const cached = await redisService.get<any>(cacheKey);
      if (cached) {
        res.set({
          'X-Cache': 'HIT',
          'Content-Type': 'application/json',
        });
        return res.json(cached);
      }

      // Query vehicles with joins to owners and vehicle_types
      const result = await db
        .select({
          Vehicle_no: vehicles.vehicle_register_number,
          make_company: vehicles.make_company,
          model_number: vehicles.model_number,
          vehicle_type_name: vehicle_types.name, // Vehicle type/category name
          owner_name: owners.name,
          owner_address: owners.address,
          owner_contact: owners.contact,
        })
        .from(vehicles)
        .innerJoin(owners, eq(vehicles.owner_id, owners.id))
        .innerJoin(vehicle_types, eq(vehicles.vehicle_type_id, vehicle_types.id))
        .where(eq(vehicles.status, 'active')); // Only return active vehicles

      // Cache for 10 minutes
      await redisService.set(cacheKey, result, 600);

      res.set({
        'X-Cache': 'MISS',
        'Content-Type': 'application/json',
      });
      res.json(result);
    } catch (error) {
      console.error("Error fetching DIG vehicle data:", error);
      res.status(500).json({ 
        error: "Internal server error",
        message: "Failed to fetch vehicle data"
      });
    }
  });

  // --- MERGED TRAFFIC POLICE API ---
  
  // Merged API for Traffic Police - combines vehicle data with tracking events
  app.get("/api/traffic/merged-data", requireApiToken, async (req, res) => {
    try {
      const { start_date, end_date, vehicle_number, region } = req.query;

      // Validate datetime parameters
      if (!start_date || !end_date) {
        return res.status(400).json({
          error: "Bad Request",
          message: "start_date and end_date parameters are required. Formats supported: 'YYYY-MM-DD' or 'YYYY-MM-DD HH:mm:ss'"
        });
      }

      // Parse and validate datetimes with flexible format support
      let startDate: Date;
      let endDate: Date;

      try {
        // Handle different datetime formats
        const startStr = decodeURIComponent(start_date as string);
        const endStr = decodeURIComponent(end_date as string);

        // If only date provided (YYYY-MM-DD), add time
        const startDateTimeStr = startStr.includes(' ') ? startStr : `${startStr} 00:00:00`;
        const endDateTimeStr = endStr.includes(' ') ? endStr : `${endStr} 23:59:59`;

        startDate = new Date(startDateTimeStr);
        endDate = new Date(endDateTimeStr);

        // Validate parsed dates
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          throw new Error('Invalid date format');
        }

        // Ensure start is before end
        if (startDate >= endDate) {
          return res.status(400).json({
            error: "Bad Request",
            message: "start_date must be before end_date"
          });
        }

      } catch (error) {
        return res.status(400).json({
          error: "Bad Request", 
          message: "Invalid datetime format. Use 'YYYY-MM-DD' or 'YYYY-MM-DD HH:mm:ss' format. Example: '2024-01-15 14:30:00'"
        });
      }

      // Generate cache key with datetime precision
      const cacheParams = {
        start_datetime: startDate.toISOString(),
        end_datetime: endDate.toISOString(),
        vehicle_number: (vehicle_number as string) || 'all',
        region: (region as string) || 'all'
      };
      const cacheKey = `traffic:merged:${Object.entries(cacheParams).map(([k,v]) => `${k}:${v}`).join('|')}`;

      // Try cache first (5 minute TTL for real-time data)
      const cached = await redisService.get<any>(cacheKey);
      if (cached) {
        res.set('X-Cache', 'HIT');
        return res.json(cached);
      }

      console.log(`[Traffic API] Fetching merged data from ${startDate.toISOString()} to ${endDate.toISOString()}`);

      // Step 0: Automatically fetch and save data from all active API configs (non-blocking)
      // This ensures fresh data is always available
      const trackingApiConfigService = (await import("./services/trackingApiConfigService.js")).trackingApiConfigService;
      trackingApiConfigService.fetchAndSaveFromAllActiveConfigs(startDate, endDate).catch(err => {
        console.error(`[Traffic API] Error in background data fetch:`, err);
      });

      // Step 1: Get vehicle data from DIG portal
      let whereConditions = [eq(vehicles.status, 'active')];

      // Apply filters
      if (vehicle_number) {
        whereConditions.push(like(vehicles.vehicle_register_number, `%${vehicle_number}%`));
      }

      if (region) {
        whereConditions.push(like(vehicles.registration_region, `%${region}%`));
      }

      const vehicleData = await db
        .select({
          vehicle_register_number: vehicles.vehicle_register_number,
          registration_region: vehicles.registration_region,
          make_company: vehicles.make_company,
          model_number: vehicles.model_number,
          vehicle_type_name: vehicle_types.name,
          vehicle_category_name: vehicle_categories.name,
          owner_name: owners.name,
          owner_address: owners.address,
          owner_contact: owners.contact,
          owner_cnic: owners.cnic,
          driver_name: sql<string>`COALESCE(${drivers.name}, 'N/A')`,
          driver_contact: sql<string>`COALESCE(${drivers.contact}, 'N/A')`,
          conductor_name: sql<string>`COALESCE(${conductors.name}, 'N/A')`,
          conductor_contact: sql<string>`COALESCE(${conductors.contact}, 'N/A')`,
          vehicle_status: vehicles.status,
          created_at: vehicles.created_at
        })
        .from(vehicles)
        .innerJoin(owners, eq(vehicles.owner_id, owners.id))
        .leftJoin(drivers, eq(vehicles.driver_id, drivers.id))
        .leftJoin(conductors, eq(vehicles.conductor_id, conductors.id))
        .innerJoin(vehicle_types, eq(vehicles.vehicle_type_id, vehicle_types.id))
        .innerJoin(vehicle_categories, eq(vehicles.vehicle_category_id, vehicle_categories.id))
        .where(and(...whereConditions));

      // Step 2: Get tracking events for the datetime range
      console.log(`[Traffic API] Fetching tracking events from ${startDate.toISOString()} to ${endDate.toISOString()}`);
      
      let trackingEvents = await trackingService.getFilteredEvents({
        start_datetime: startDate.toISOString(),
        end_datetime: endDate.toISOString(),
        vehicle: vehicle_number as string,
        limit: 10000 // High limit to get all events
      });

      console.log(`[Traffic API] Found ${trackingEvents.length} tracking events`);

      // If no events found, try to fetch fresh data from external API
      if (trackingEvents.length === 0) {
        console.log(`[Traffic API] No cached events found, fetching from external API...`);
        try {
          const freshData = await trackingService.fetchTrackingData(startDate, endDate);
          if (freshData && freshData.length > 0) {
            await trackingService.processAndStoreData(freshData);
            // Retry getting events after storing fresh data
            trackingEvents = await trackingService.getFilteredEvents({
              start_datetime: startDate.toISOString(),
              end_datetime: endDate.toISOString(),
              vehicle: vehicle_number as string,
              limit: 10000
            });
            console.log(`[Traffic API] After fresh fetch: ${trackingEvents.length} events`);
          }
        } catch (fetchError) {
          console.error(`[Traffic API] Error fetching fresh tracking data:`, fetchError);
        }
      }

      // Step 3: Create a mapping strategy for vehicle matching
      // We'll use a combination of vehicle number and additional context
      const vehicleMap = new Map<string, any>();
      
      vehicleData.forEach(vehicle => {
        // Create multiple possible keys for matching
        const baseNumber = vehicle.vehicle_register_number.trim().toUpperCase();
        const region = vehicle.registration_region?.trim().toUpperCase() || '';
        
        // Primary key: vehicle_number + region
        const primaryKey = `${baseNumber}|${region}`;
        vehicleMap.set(primaryKey, vehicle);
        
        // Secondary key: just vehicle number (for fallback)
        if (!vehicleMap.has(baseNumber)) {
          vehicleMap.set(baseNumber, vehicle);
        }
        
        // Tertiary key: vehicle number with common variations
        const variations = [
          baseNumber.replace(/[-\s]/g, ''), // Remove dashes and spaces
          baseNumber.replace(/\s+/g, '-'),  // Replace spaces with dashes
          baseNumber.replace(/-+/g, ' ')    // Replace dashes with spaces
        ];
        
        variations.forEach(variation => {
          if (!vehicleMap.has(variation)) {
            vehicleMap.set(variation, vehicle);
          }
        });
      });

      // Step 4: Merge tracking events with vehicle data
      const mergedData = [];
      const unmatchedEvents = [];

      for (const event of trackingEvents) {
        const eventVehicleNumber = event.name?.trim().toUpperCase() || '';
        
        if (!eventVehicleNumber) {
          continue; // Skip events without vehicle names
        }

        // Try different matching strategies
        let matchedVehicle = null;
        
        // Strategy 1: Try exact match with region (if we can infer region from event)
        // For now, we'll try exact match first
        matchedVehicle = vehicleMap.get(eventVehicleNumber);
        
        // Strategy 2: Try variations
        if (!matchedVehicle) {
          const variations = [
            eventVehicleNumber.replace(/[-\s]/g, ''),
            eventVehicleNumber.replace(/\s+/g, '-'),
            eventVehicleNumber.replace(/-+/g, ' ')
          ];
          
          for (const variation of variations) {
            matchedVehicle = vehicleMap.get(variation);
            if (matchedVehicle) break;
          }
        }

        if (matchedVehicle) {
          mergedData.push({
            Vehicle_no: matchedVehicle.vehicle_register_number,
            make_company: matchedVehicle.make_company || 'N/A',
            model_number: matchedVehicle.model_number || 'N/A',
            vehicle_type_name: matchedVehicle.vehicle_type_name,
            owner_name: matchedVehicle.owner_name,
            owner_address: matchedVehicle.owner_address || 'N/A',
            owner_contact: matchedVehicle.owner_contact || 'N/A',
            owner_cnic: matchedVehicle.owner_cnic || 'N/A',
            tracker_company_name: 'ESSPL', // Default tracker company
            speed: event.speed || 0,
            latitude: parseFloat(event.lat) || 0,
            longitude: parseFloat(event.lng) || 0,
            event_description: event.event_desc,
            event_datetime: event.dt_tracker,
            registration_region: matchedVehicle.registration_region || 'N/A'
          });
        } else {
          // Keep track of unmatched events for debugging
          unmatchedEvents.push({
            Vehicle_no: event.name || 'Unknown',
            make_company: 'Unknown',
            model_number: 'Unknown',
            vehicle_type_name: 'Unknown',
            owner_name: 'Unknown',
            owner_address: 'Unknown',
            owner_contact: 'Unknown',
            owner_cnic: 'Unknown',
            tracker_company_name: 'ESSPL',
            speed: event.speed || 0,
            latitude: parseFloat(event.lat) || 0,
            longitude: parseFloat(event.lng) || 0,
            event_description: event.event_desc,
            event_datetime: event.dt_tracker,
            registration_region: 'Unknown'
          });
        }
      }

      // If no tracking events but we have vehicles, return vehicle data without tracking info
      if (trackingEvents.length === 0 && vehicleData.length > 0) {
        console.log(`[Traffic API] No tracking events found, returning vehicle data only`);
        vehicleData.forEach(vehicle => {
          mergedData.push({
            Vehicle_no: vehicle.vehicle_register_number,
            make_company: vehicle.make_company || 'N/A',
            model_number: vehicle.model_number || 'N/A',
            vehicle_type_name: vehicle.vehicle_type_name,
            owner_name: vehicle.owner_name,
            owner_address: vehicle.owner_address || 'N/A',
            owner_contact: vehicle.owner_contact || 'N/A',
            owner_cnic: vehicle.owner_cnic || 'N/A',
            tracker_company_name: 'ESSPL',
            speed: 0, // No tracking data available
            latitude: 0,
            longitude: 0,
            event_description: 'No tracking data available',
            event_datetime: null,
            registration_region: vehicle.registration_region || 'N/A'
          });
        });
      }

      // Simple response format as requested
      const response = mergedData;

      // Cache for 5 minutes
      await redisService.set(cacheKey, response, 300);

      res.set('X-Cache', 'MISS');
      res.json(response);

    } catch (error) {
      console.error("Error in merged traffic API:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to fetch merged traffic data",
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  });

  // Convenience endpoint for today's traffic data
  app.get("/api/traffic/today", requireApiToken, async (req, res) => {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    
    const startDateTime = startOfDay.toISOString().replace('T', ' ').substring(0, 19); // YYYY-MM-DD HH:mm:ss
    const endDateTime = now.toISOString().replace('T', ' ').substring(0, 19);
    
    // Redirect to the main endpoint with datetime range
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const redirectUrl = `${baseUrl}/api/traffic/merged-data?start_date=${encodeURIComponent(startDateTime)}&end_date=${encodeURIComponent(endDateTime)}&token=${req.query.token || req.headers['x-api-key']}`;
    
    res.redirect(302, redirectUrl);
  });

  // Convenience endpoint for yesterday's traffic data  
  app.get("/api/traffic/yesterday", requireApiToken, async (req, res) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const startOfDay = new Date(yesterday);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(yesterday);
    endOfDay.setHours(23, 59, 59, 999);
    
    const startDateTime = startOfDay.toISOString().replace('T', ' ').substring(0, 19);
    const endDateTime = endOfDay.toISOString().replace('T', ' ').substring(0, 19);
    
    // Redirect to the main endpoint with datetime range
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const redirectUrl = `${baseUrl}/api/traffic/merged-data?start_date=${encodeURIComponent(startDateTime)}&end_date=${encodeURIComponent(endDateTime)}&token=${req.query.token || req.headers['x-api-key']}`;
    
    res.redirect(302, redirectUrl);
  });

  // Convenience endpoint for last N hours of traffic data
  app.get("/api/traffic/last-hours/:hours", requireApiToken, async (req, res) => {
    const hours = parseInt(req.params.hours);
    if (isNaN(hours) || hours < 1 || hours > 168) { // Max 1 week
      return res.status(400).json({
        error: "Bad Request",
        message: "Hours must be a number between 1 and 168 (1 week)"
      });
    }

    const now = new Date();
    const startTime = new Date(now.getTime() - (hours * 60 * 60 * 1000));
    
    const startDateTime = startTime.toISOString().replace('T', ' ').substring(0, 19);
    const endDateTime = now.toISOString().replace('T', ' ').substring(0, 19);
    
    // Redirect to the main endpoint
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const redirectUrl = `${baseUrl}/api/traffic/merged-data?start_date=${encodeURIComponent(startDateTime)}&end_date=${encodeURIComponent(endDateTime)}&token=${req.query.token || req.headers['x-api-key']}`;
    
    res.redirect(302, redirectUrl);
  });

  // User Activity Logs - Admin only
  app.get("/api/activity-logs", requireAuth, requireAdminOnly, apiLimiter, async (req, res) => {
    try {
      const {
        user_id,
        action_type,
        ip_address,
        start_date,
        end_date,
        success,
        page = 1,
        limit = 50,
      } = req.query;

      const offset = (Number(page) - 1) * Number(limit);

      const filters: any = {
        limit: Number(limit),
        offset,
      };

      if (user_id) filters.user_id = Number(user_id);
      if (action_type) filters.action_type = action_type as string;
      if (ip_address) filters.ip_address = ip_address as string;
      if (start_date) filters.start_date = new Date(start_date as string);
      if (end_date) filters.end_date = new Date(end_date as string);
      if (success !== undefined) filters.success = success === "true";

      const result = await storage.getUserActivityLogs(filters);

      // Parse JSON fields safely
      const logs = result.logs.map((log: any) => {
        let request_body = null;
        let metadata = null;
        
        // Safely parse request_body
        if (log.request_body) {
          if (typeof log.request_body === 'string') {
            try {
              request_body = JSON.parse(log.request_body);
            } catch (e) {
              request_body = log.request_body; // Keep as string if parsing fails
            }
          } else {
            request_body = log.request_body; // Already an object
          }
        }
        
        // Safely parse metadata
        if (log.metadata) {
          if (typeof log.metadata === 'string') {
            try {
              metadata = JSON.parse(log.metadata);
            } catch (e) {
              metadata = log.metadata; // Keep as string if parsing fails
            }
          } else {
            metadata = log.metadata; // Already an object
          }
        }
        
        return {
          ...log,
          request_body,
          metadata,
        };
      });

      res.json({
        logs,
        total: result.total,
        page: Number(page),
        totalPages: Math.ceil(result.total / Number(limit)),
      });
    } catch (error: any) {
      console.error("Error fetching activity logs:", error);
      res.status(500).json({ message: "Failed to fetch activity logs" });
    }
  });

  // Get blocked users - Admin only
  app.get("/api/users/blocked", requireAuth, requireAdmin, apiLimiter, async (req, res) => {
    try {
      const blockedUsers = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          blocked_at: users.blocked_at,
          blocked_by: users.blocked_by,
          blocked_reason: users.blocked_reason,
        })
        .from(users)
        .where(eq(users.is_blocked, true));

      res.json({ users: blockedUsers });
    } catch (error: any) {
      console.error("Error fetching blocked users:", error);
      res.status(500).json({ message: "Failed to fetch blocked users" });
    }
  });

  // Unblock user - Admin only
  app.post("/api/users/:id/unblock", requireAuth, requireAdmin, apiLimiter, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const adminId = req.user?.id;

      if (!adminId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Check if user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Unblock user
      await storage.unblockUserAccount(userId);

      // Log the action
      const ipAddress = req.ip || req.socket.remoteAddress || "unknown";
      await logUserAction({
        userId: adminId,
        actionType: "unblock_user",
        actionDescription: `Admin unblocked user: ${user.email}`,
        ipAddress,
        userAgent: req.headers["user-agent"] || null,
        requestMethod: "POST",
        requestPath: `/api/users/${userId}/unblock`,
        success: true,
        metadata: { unblocked_user_id: userId, unblocked_user_email: user.email },
      });

      res.json({ message: "User unblocked successfully" });
    } catch (error: any) {
      console.error("Error unblocking user:", error);
      res.status(500).json({ message: "Failed to unblock user" });
    }
  });

  // --- TRACKING EVENTS ENDPOINTS ---
  
  // Get latest tracking events
  app.get("/api/tracking/events", requireAuth, apiLimiter, async (req, res) => {
    try {
      const { limit = 50, vehicle, event_type, start_date, end_date } = req.query;
      
      // Generate cache key
      const cacheParams: Record<string, string> = {
        limit: String(limit),
        vehicle: (vehicle as string) || 'all',
        event_type: (event_type as string) || 'all',
        start_date: (start_date as string) || 'all',
        end_date: (end_date as string) || 'all',
      };
      const sortedParams = Object.keys(cacheParams)
        .sort()
        .map(key => `${key}:${cacheParams[key]}`)
        .join('|');
      const cacheKey = `tracking:events:${sortedParams}`;

      // Try cache first (1 minute TTL for real-time data)
      const cached = await redisService.get<any>(cacheKey);
      if (cached) {
        res.set('X-Cache', 'HIT');
        return res.json(cached);
      }

      // Use the new filtered method that handles all filters including date range
      const events = await trackingService.getFilteredEvents({
        limit: Number(limit),
        vehicle: vehicle as string,
        event_type: event_type as string,
        start_date: start_date as string,
        end_date: end_date as string,
      });

      // Cache for 1 minute
      await redisService.set(cacheKey, events, 60);
      
      res.set('X-Cache', 'MISS');
      res.json(events);
    } catch (error) {
      console.error("Error fetching tracking events:", error);
      res.status(500).json({ message: "Failed to fetch tracking events" });
    }
  });

  // Manual sync tracking data
  app.post("/api/tracking/sync", requireAuth, requireAdmin, apiLimiter, async (req, res) => {
    try {
      const { start_date, end_date } = req.body;
      
      if (!start_date || !end_date) {
        return res.status(400).json({ message: "Start date and end date are required" });
      }

      const startDate = new Date(start_date);
      const endDate = new Date(end_date);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }

      const insertedCount = await trackingService.syncDateRange(startDate, endDate);
      
      // Invalidate tracking cache
      await redisService.delPattern('tracking:*');
      
      res.json({ 
        message: "Sync completed successfully", 
        recordsProcessed: insertedCount,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });
    } catch (error) {
      console.error("Error syncing tracking data:", error);
      res.status(500).json({ message: "Failed to sync tracking data" });
    }
  });

  // Start/stop real-time tracking updates
  app.post("/api/tracking/realtime/:action", requireAuth, requireAdmin, apiLimiter, async (req, res) => {
    try {
      const { action } = req.params;
      const { interval_minutes = 5 } = req.body;

      if (action === 'start') {
        trackingService.startRealTimeUpdates(Number(interval_minutes));
        res.json({ 
          message: "Real-time tracking updates started", 
          intervalMinutes: Number(interval_minutes) 
        });
      } else if (action === 'stop') {
        trackingService.stopRealTimeUpdates();
        res.json({ message: "Real-time tracking updates stopped" });
      } else {
        return res.status(400).json({ message: "Invalid action. Use 'start' or 'stop'" });
      }
    } catch (error) {
      console.error("Error managing real-time tracking:", error);
      res.status(500).json({ message: "Failed to manage real-time tracking" });
    }
  });

  // Get tracking service status
  app.get("/api/tracking/status", requireAuth, apiLimiter, async (req, res) => {
    try {
      const status = trackingService.getStatus();
      
      // Simple response without database queries to avoid timeouts
      res.json({
        ...status,
        recentEventsCount: 0,
        totalEventsCount: 0,
        lastUpdated: new Date().toISOString(),
        databaseStatus: 'unknown' // Will be determined by other endpoints
      });
    } catch (error) {
      console.error("Error fetching tracking status:", error);
      res.status(500).json({ message: "Failed to fetch tracking status" });
    }
  });

  // Database health check endpoint
  app.get("/api/tracking/health", requireAuth, apiLimiter, async (req, res) => {
    try {
      // Simple database connectivity test
      const result = await pool.query('SELECT 1 as healthy');
      res.json({ 
        database: 'connected',
        timestamp: new Date().toISOString(),
        healthy: result.rows[0].healthy === 1
      });
    } catch (error: any) {
      console.error("Database health check failed:", error);
      res.status(500).json({ 
        database: 'disconnected',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Create tracking table endpoint (admin only)
  app.post("/api/tracking/setup-table", requireAuth, requireAdmin, apiLimiter, async (req, res) => {
    try {
      // Check if table already exists
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'tracking_events'
        );
      `);
      
      if (tableCheck.rows[0].exists) {
        return res.json({ 
          message: "Table already exists",
          tableExists: true,
          timestamp: new Date().toISOString()
        });
      }

      // Read and execute table creation SQL
      const fs = await import('fs');
      const path = await import('path');
      const { fileURLToPath } = await import('url');
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      
      const sqlPath = path.join(__dirname, '../scripts/create-tracking-events-table.sql');
      const sql = fs.readFileSync(sqlPath, 'utf8');
      
      await pool.query(sql);
      
      // Verify creation
      const countResult = await pool.query('SELECT COUNT(*) FROM tracking_events');
      
      res.json({ 
        message: "Tracking events table created successfully",
        tableExists: true,
        recordCount: countResult.rows[0].count,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error("Error setting up tracking table:", error);
      res.status(500).json({ 
        message: "Failed to setup tracking table",
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Test external API connectivity
  app.get("/api/tracking/test-connection", requireAuth, requireAdmin, async (req, res) => {
    try {
      console.log('[TrackingAPI] Testing external API connectivity...');
      
      const testStart = new Date();
      testStart.setHours(testStart.getHours() - 1); // 1 hour ago
      const testEnd = new Date();
      
      const startTime = Date.now();
      const data = await trackingService.fetchTrackingData(testStart, testEnd);
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      res.json({
        success: true,
        message: "External API connection successful",
        responseTime: `${responseTime}ms`,
        recordsFound: data.length,
        testPeriod: {
          start: testStart.toISOString(),
          end: testEnd.toISOString()
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (error: any) {
      console.error('[TrackingAPI] External API connection test failed:', error);
      res.status(500).json({
        success: false,
        message: "External API connection failed",
        error: error.message,
        errorCode: error.code,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Clean up old tracking data
  app.delete("/api/tracking/cleanup", requireAuth, requireAdmin, apiLimiter, async (req, res) => {
    try {
      const { days_to_keep = 30 } = req.body;
      
      const deletedCount = await trackingService.cleanupOldData(Number(days_to_keep));
      
      // Invalidate tracking cache
      await redisService.delPattern('tracking:*');
      
      res.json({ 
        message: "Cleanup completed successfully", 
        recordsDeleted: deletedCount,
        daysKept: Number(days_to_keep)
      });
    } catch (error) {
      console.error("Error cleaning up tracking data:", error);
      res.status(500).json({ message: "Failed to cleanup tracking data" });
    }
  });

  // Get tracking statistics
  app.get("/api/tracking/stats", requireAuth, apiLimiter, async (req, res) => {
    try {
      const cacheKey = 'tracking:stats';
      
      // Try cache first (5 minute TTL)
      const cached = await redisService.get<any>(cacheKey);
      if (cached) {
        res.set('X-Cache', 'HIT');
        return res.json(cached);
      }

      // Get various statistics - handle case where table doesn't exist
      let totalEvents: any[], todayEvents: any[], eventTypes: any[], topVehicles: any[], speedingEvents: any[];
      
      try {
        [
          totalEvents,
          todayEvents,
          eventTypes,
          topVehicles,
          speedingEvents
        ] = await Promise.all([
          // Total events
          db.select({ count: sql<number>`count(*)` }).from(tracking_events),
          
          // Today's events
          db.select({ count: sql<number>`count(*)` })
            .from(tracking_events)
            .where(sql`DATE(${tracking_events.created_at}) = CURRENT_DATE`),
          
          // Event types distribution
          db.select({ 
            event_desc: tracking_events.event_desc,
            count: sql<number>`count(*)` 
          })
            .from(tracking_events)
            .groupBy(tracking_events.event_desc)
            .orderBy(sql`count(*) DESC`)
            .limit(10),
          
          // Top vehicles by event count
          db.select({ 
            name: tracking_events.name,
            count: sql<number>`count(*)` 
          })
            .from(tracking_events)
            .groupBy(tracking_events.name)
            .orderBy(sql`count(*) DESC`)
            .limit(10),
          
          // All speed events (same as total events since all tracking events have speed data)
          db.select({ count: sql<number>`count(*)` })
            .from(tracking_events)
        ]);
      } catch (error: any) {
        // Handle case where table doesn't exist yet
        if (error.code === '42P01') {
          console.warn('[TrackingStats] tracking_events table does not exist yet');
          totalEvents = [{ count: 0 }];
          todayEvents = [{ count: 0 }];
          eventTypes = [];
          topVehicles = [];
          speedingEvents = [{ count: 0 }];
        } else {
          throw error;
        }
      }

      const stats = {
        totalEvents: totalEvents[0]?.count || 0,
        todayEvents: todayEvents[0]?.count || 0,
        speedingEvents: speedingEvents[0]?.count || 0,
        eventTypes: eventTypes,
        topVehicles: topVehicles,
        lastUpdated: new Date().toISOString()
      };

      // Cache for 5 minutes
      await redisService.set(cacheKey, stats, 300);
      
      res.set('X-Cache', 'MISS');
      res.json(stats);
    } catch (error) {
      console.error("Error fetching tracking statistics:", error);
      res.status(500).json({ message: "Failed to fetch tracking statistics" });
    }
  });

  // --- TRACKING API CONFIGURATION MANAGEMENT ---
  
  // Get all tracking API configurations
  app.get("/api/tracking-api-configs", requireAuth, requireManager, apiLimiter, async (req, res) => {
    try {
      const { includeInactive } = req.query;
      const trackingApiConfigService = (await import("./services/trackingApiConfigService.js")).trackingApiConfigService;
      
      const configs = await trackingApiConfigService.getAllConfigs(includeInactive === 'true');
      
      res.json({ 
        success: true,
        configs 
      });
    } catch (error: any) {
      console.error("Error fetching tracking API configs:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to fetch tracking API configurations",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Get a single tracking API configuration
  app.get("/api/tracking-api-configs/:id", requireAuth, requireManager, apiLimiter, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const trackingApiConfigService = (await import("./services/trackingApiConfigService.js")).trackingApiConfigService;
      
      const config = await trackingApiConfigService.getConfigById(id);
      
      if (!config) {
        return res.status(404).json({ 
          success: false,
          message: "Tracking API configuration not found" 
        });
      }
      
      res.json({ 
        success: true,
        config 
      });
    } catch (error: any) {
      console.error("Error fetching tracking API config:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to fetch tracking API configuration",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Create a new tracking API configuration
  app.post("/api/tracking-api-configs", requireAuth, requireManager, apiLimiter, async (req, res) => {
    try {
      const trackingApiConfigService = (await import("./services/trackingApiConfigService.js")).trackingApiConfigService;
      const user = (req as any).user;
      
      // Validate required fields
      const { name, tracker_company_id, api_url, api_key, api_type = 'esspl' } = req.body;
      
      if (!name || !tracker_company_id || !api_url || !api_key) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields: name, tracker_company_id, api_url, api_key"
        });
      }

      // Parse api_params if provided as object
      let apiParams = req.body.api_params;
      if (apiParams && typeof apiParams === 'object') {
        apiParams = JSON.stringify(apiParams);
      }

      const configStatus = req.body.status || 'active';
      const config = await trackingApiConfigService.createConfig({
        name,
        tracker_company_id: parseInt(tracker_company_id),
        api_url,
        api_key,
        api_type,
        api_params: apiParams || '{}',
        url_template: req.body.url_template || null,
        status: configStatus,
        auto_sync: req.body.auto_sync !== undefined ? req.body.auto_sync : true,
        sync_interval_minutes: req.body.sync_interval_minutes || 15,
        description: req.body.description || null,
        created_by: user?.id || null,
      });

      // If status is active, automatically fetch and save data in background
      if (configStatus === 'active') {
        trackingApiConfigService.fetchAndSaveFromConfig(config.id).catch(err => {
          console.error(`[Routes] Error auto-fetching after config creation:`, err);
        });
      }

      // Log activity
      if (user) {
        await logUserAction({
          userId: user.id,
          actionType: 'create_tracking_api_config',
          actionDescription: `Created tracking API config: ${name}`,
          ipAddress: getClientIp(req),
          userAgent: req.headers["user-agent"] || null,
          requestMethod: req.method,
          requestPath: req.path,
          success: true,
        });
      }

      res.status(201).json({
        success: true,
        message: "Tracking API configuration created successfully",
        config
      });
    } catch (error: any) {
      console.error("Error creating tracking API config:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create tracking API configuration",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Update a tracking API configuration
  app.patch("/api/tracking-api-configs/:id", requireAuth, requireManager, apiLimiter, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const trackingApiConfigService = (await import("./services/trackingApiConfigService.js")).trackingApiConfigService;
      const user = (req as any).user;

      const updateData: any = {};
      
      if (req.body.name !== undefined) updateData.name = req.body.name;
      if (req.body.tracker_company_id !== undefined) updateData.tracker_company_id = parseInt(req.body.tracker_company_id);
      if (req.body.api_url !== undefined) updateData.api_url = req.body.api_url;
      if (req.body.api_key !== undefined) updateData.api_key = req.body.api_key;
      if (req.body.api_type !== undefined) updateData.api_type = req.body.api_type;
      if (req.body.api_params !== undefined) {
        updateData.api_params = typeof req.body.api_params === 'object' 
          ? JSON.stringify(req.body.api_params) 
          : req.body.api_params;
      }
      if (req.body.url_template !== undefined) updateData.url_template = req.body.url_template;
      if (req.body.status !== undefined) updateData.status = req.body.status;
      if (req.body.auto_sync !== undefined) updateData.auto_sync = req.body.auto_sync;
      if (req.body.sync_interval_minutes !== undefined) updateData.sync_interval_minutes = parseInt(req.body.sync_interval_minutes);
      if (req.body.description !== undefined) updateData.description = req.body.description;

      // Get old config to check if status changed
      const oldConfig = await trackingApiConfigService.getConfigById(id);
      const wasActive = oldConfig?.status === 'active';
      
      const config = await trackingApiConfigService.updateConfig(id, updateData);
      
      // If status changed to active, automatically fetch and save data in background
      const isNowActive = config.status === 'active';
      if (!wasActive && isNowActive) {
        trackingApiConfigService.fetchAndSaveFromConfig(config.id).catch(err => {
          console.error(`[Routes] Error auto-fetching after config activation:`, err);
        });
      }

      // Log activity
      if (user) {
        await logUserAction({
          userId: user.id,
          actionType: 'update_tracking_api_config',
          actionDescription: `Updated tracking API config: ${config.name}`,
          ipAddress: getClientIp(req),
          userAgent: req.headers["user-agent"] || null,
          requestMethod: req.method,
          requestPath: req.path,
          success: true,
        });
      }

      res.json({
        success: true,
        message: "Tracking API configuration updated successfully",
        config
      });
    } catch (error: any) {
      console.error("Error updating tracking API config:", error);
      if (error.message?.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      res.status(500).json({
        success: false,
        message: "Failed to update tracking API configuration",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Delete a tracking API configuration
  app.delete("/api/tracking-api-configs/:id", requireAuth, requireManager, apiLimiter, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const trackingApiConfigService = (await import("./services/trackingApiConfigService.js")).trackingApiConfigService;
      const user = (req as any).user;

      // Get config name for logging before deletion
      const config = await trackingApiConfigService.getConfigById(id);
      if (!config) {
        return res.status(404).json({
          success: false,
          message: "Tracking API configuration not found"
        });
      }

      await trackingApiConfigService.deleteConfig(id);

      // Log activity
      if (user) {
        await logUserAction({
          userId: user.id,
          actionType: 'delete_tracking_api_config',
          actionDescription: `Deleted tracking API config: ${config.name}`,
          ipAddress: getClientIp(req),
          userAgent: req.headers["user-agent"] || null,
          requestMethod: req.method,
          requestPath: req.path,
          success: true,
        });
      }

      res.json({
        success: true,
        message: "Tracking API configuration deleted successfully"
      });
    } catch (error: any) {
      console.error("Error deleting tracking API config:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete tracking API configuration",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Test API connection with date range
  app.post("/api/tracking-api-configs/:id/test", requireAuth, requireManager, apiLimiter, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const trackingApiConfigService = (await import("./services/trackingApiConfigService.js")).trackingApiConfigService;
      const { start_date, end_date, save_to_db } = req.body;

      const config = await trackingApiConfigService.getConfigById(id);
      if (!config) {
        return res.status(404).json({
          success: false,
          message: "Tracking API configuration not found"
        });
      }

      // Parse dates if provided
      let startDate: Date | undefined;
      let endDate: Date | undefined;

      if (start_date) {
        startDate = new Date(start_date);
        if (isNaN(startDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid start_date format. Use 'YYYY-MM-DD HH:mm:ss' format."
          });
        }
      }

      if (end_date) {
        endDate = new Date(end_date);
        if (isNaN(endDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid end_date format. Use 'YYYY-MM-DD HH:mm:ss' format."
          });
        }
      }

      // Validate date range
      if (startDate && endDate && startDate >= endDate) {
        return res.status(400).json({
          success: false,
          message: "start_date must be before end_date"
        });
      }

      const saveToDatabase = save_to_db === true || save_to_db === 'true';

      const testResult = await trackingApiConfigService.testApiConnection(
        config,
        startDate,
        endDate,
        saveToDatabase
      );

      // Update health status based on test result
      await trackingApiConfigService.updateHealthStatus(id, {
        isHealthy: testResult.success,
        error: testResult.error,
      });

      if (testResult.success) {
        res.json({
          success: true,
          message: "API connection test successful",
          data: testResult.data
        });
      } else {
        res.status(500).json({
          success: false,
          message: "API connection test failed",
          error: testResult.error
        });
      }
    } catch (error: any) {
      console.error("Error testing API connection:", error);
      res.status(500).json({
        success: false,
        message: "Failed to test API connection",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  const httpServer = createServer(app);
  
  return httpServer;
}
