import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getWebSocketService } from "./services/websocketService";
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
  insertTrackerCompanySchema
} from "@shared/schema";
import { generateQRCode } from "./lib/qr-generator";
import { generateVehicleQRCard } from "./lib/qr-card";
import { authRouter, useCookieParser } from "./auth";
import { db } from "./db";
import { 
  users, 
  notifications, 
  vehicle_categories, 
  vehicle_types, 
  fuel_types, 
  terminals, 
  routes,
  tracker_companies
} from "@shared/schema";
import { eq, and, like, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { requireAuth, requireAdmin } from "./auth";
import trackingRouter from "./routes/tracking";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
  // --- AUTH ROUTES ---
  app.use(useCookieParser); // Parse cookies for JWT
  app.use("/api/auth", authRouter);

  // --- TRACKING ROUTES ---
  app.use("/api/tracking", trackingRouter);

  // Dashboard stats
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
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

  // Vehicle registration
  app.post("/api/vehicles/register", upload.any(), async (req, res) => {
    try {
      // Parse JSON fields from multipart form
      const vehicle = JSON.parse(req.body.vehicle);
      const owner = JSON.parse(req.body.owner);
      const driver = JSON.parse(req.body.driver);
      const conductor = req.body.conductor ? JSON.parse(req.body.conductor) : undefined;
      const documents = JSON.parse(req.body.documents);
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
      // Create vehicle
      const newVehicle = await storage.createVehicle({
        ...validatedVehicle,
        status: validatedVehicle.status || 'pending', // Ensure status is always a string
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

  // Get all vehicles
  app.get("/api/vehicles", async (req, res) => {
    try {
      const { type, status, search, page = 1, limit = 10 } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const result = await storage.getAllVehicles({
        type: type as string,
        status: status as string,
        search: search as string,
        limit: Number(limit),
        offset,
      });

      res.json({
        vehicles: result.vehicles,
        total: result.total,
        page: Number(page),
        totalPages: Math.ceil(result.total / Number(limit)),
      });
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      res.status(500).json({ message: "Failed to fetch vehicles" });
    }
  });

  // Get vehicle by ID
  app.get("/api/vehicles/:id", async (req, res) => {
    try {
      const vehicleId = parseInt(req.params.id);
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

  // Verify QR code
  app.post("/api/qr/verify", async (req, res) => {
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

  // Update vehicle (full update with file uploads)
  app.patch("/api/vehicles/:id", upload.any(), async (req, res) => {
    try {
      const vehicleId = parseInt(req.params.id);
      
      // Check if vehicle exists
      const existingVehicle = await storage.getVehicle(vehicleId);
      if (!existingVehicle) {
        return res.status(404).json({ message: "Vehicle not found" });
      }

      // Parse JSON fields from multipart form
      const vehicle = JSON.parse(req.body.vehicle || '{}');
      const owner = JSON.parse(req.body.owner || '{}');
      const driver = JSON.parse(req.body.driver || '{}');
      const conductor = req.body.conductor ? JSON.parse(req.body.conductor) : undefined;
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

  // Update vehicle status (approve/reject)
  app.patch("/api/vehicles/:id/status", async (req, res) => {
    try {
      const vehicleId = parseInt(req.params.id);
      const { status } = req.body;

      if (!["active", "rejected", "suspended"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const updatedVehicle = await storage.updateVehicleStatus(vehicleId, status);
      res.json({ message: "Vehicle status updated", vehicle: updatedVehicle });
    } catch (error) {
      console.error("Error updating vehicle status:", error);
      res.status(500).json({ message: "Failed to update vehicle status" });
    }
  });

  // Generate QR code for existing vehicle
  app.post("/api/vehicles/:id/generate-qr", async (req, res) => {
    try {
      const vehicleId = parseInt(req.params.id);
      const vehicle = await storage.getVehicle(vehicleId);
      
      if (!vehicle) {
        return res.status(404).json({ message: "Vehicle not found" });
      }

      // Allow client to explicitly provide its visible origin for tunnels/proxies
      const clientBase = (req.body && req.body.baseUrl) ? String(req.body.baseUrl) : undefined;
      const baseUrl = clientBase || getPublicBaseUrl(req);
      const publicUrl = `${baseUrl.replace(/\/$/, '')}/public/vehicle/${vehicle.id}`;
      
      console.log(`Generating QR code for vehicle ID: ${vehicle.id}, URL: ${publicUrl}`);
      
      const qrCode = await generateQRCode(publicUrl);
      const createdAt = vehicle.created_at ? new Date(vehicle.created_at as any) : new Date();
      const expiry = new Date(createdAt);
      expiry.setMonth(expiry.getMonth() + 6);
      const formatDate = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      const qrCard = await generateVehicleQRCard(publicUrl, {
        issuedDate: formatDate(createdAt),
        expiryDate: formatDate(expiry),
        registrationNumber: vehicle.vehicle_register_number
      });
      // Persist the styled card so existing UI shows the new design
      await storage.updateVehicleQRCode(vehicle.id, qrCard);

      res.json({ 
        qrCode,
        qrCard,
        registration_number: vehicle.vehicle_register_number,
        vehicleId: vehicle.id,
        publicUrl: publicUrl,
        message: "QR code generated successfully" 
      });
    } catch (error) {
      console.error("Error generating QR code:", error);
      res.status(500).json({ message: "Failed to generate QR code" });
    }
  });

  // Public vehicle view endpoint (no authentication required)
  app.get("/api/public/vehicles/:id", async (req, res) => {
    try {
      const vehicleId = parseInt(req.params.id);
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
  app.get("/api/users", requireAuth, requireAdmin, async (req, res) => {
    const allUsers = await db.select().from(users);
    res.json(allUsers);
  });

  // Create user (admin only)
  app.post("/api/users", requireAuth, requireAdmin, async (req, res) => {
    const { name, email, password, contact_number, image, role } = req.body;
    if (!email || !password || !name) return res.status(400).json({ error: "Missing required fields" });
    const hash = await bcrypt.hash(password, 10);
    const [user] = await db.insert(users).values({ name, email, password: hash, contact_number, image, role }).returning();
    res.json(user);
  });

  // Edit user (admin only)
  app.put("/api/users/:id", requireAuth, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { name, email, password, contact_number, image, role } = req.body;
    const update: any = { name, email, contact_number, image, role };
    if (password) update.password = await bcrypt.hash(password, 10);
    const [user] = await db.update(users).set(update).where(eq(users.id, Number(id))).returning();
    res.json(user);
  });

  // Delete user (admin only)
  app.delete("/api/users/:id", requireAuth, requireAdmin, async (req, res) => {
    const { id } = req.params;
    await db.delete(users).where(eq(users.id, Number(id)));
    res.json({ success: true });
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
    const { status, search, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const result = await storage.getAllOwners({
      status: status as string,
      search: search as string,
      limit: Number(limit),
      offset,
    });
    res.json({
      owners: result.owners,
      total: result.total,
      page: Number(page),
      totalPages: Math.ceil(result.total / Number(limit)),
    });
  });
  app.get("/api/owners/:id", requireAuth, requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const owner = await storage.getOwner(id);
    if (!owner) return res.status(404).json({ message: "Owner not found" });
    res.json(owner);
  });
  app.post("/api/owners", requireAuth, requireAdmin, async (req, res) => {
    const { vehicle_id, ...ownerData } = req.body;
    const created = await storage.createOwner(ownerData);
    
    // If vehicle_id is provided, update the vehicle to link with this owner
    if (vehicle_id) {
      await storage.updateVehicle(vehicle_id, { owner_id: created.id });
    }
    
    res.json(created);
  });
  app.put("/api/owners/:id", requireAuth, requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const { vehicle_id, ...update } = req.body;
    const updated = await storage.updateOwner(id, update);
    
    // If vehicle_id is provided, update the vehicle to link with this owner
    if (vehicle_id) {
      await storage.updateVehicle(vehicle_id, { owner_id: updated.id });
    }
    
    res.json(updated);
  });
  app.patch("/api/owners/:id/status", requireAuth, requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    const updated = await storage.updateOwnerStatus(id, status);
    res.json(updated);
  });

  // --- DRIVER ENDPOINTS ---
  app.get("/api/drivers", requireAuth, requireAdmin, async (req, res) => {
    const { status, search, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const result = await storage.getAllDrivers({
      status: status as string,
      search: search as string,
      limit: Number(limit),
      offset,
    });
    res.json({
      drivers: result.drivers,
      total: result.total,
      page: Number(page),
      totalPages: Math.ceil(result.total / Number(limit)),
    });
  });
  app.get("/api/drivers/:id", requireAuth, requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const driver = await storage.getDriver(id);
    if (!driver) return res.status(404).json({ message: "Driver not found" });
    res.json(driver);
  });
  app.post("/api/drivers", requireAuth, requireAdmin, async (req, res) => {
    const { vehicle_id, ...driverData } = req.body;
    const created = await storage.createDriver(driverData);
    
    // If vehicle_id is provided, update the vehicle to link with this driver
    if (vehicle_id) {
      await storage.updateVehicle(vehicle_id, { driver_id: created.id });
    }
    
    res.json(created);
  });
  app.put("/api/drivers/:id", requireAuth, requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const { vehicle_id, ...update } = req.body;
    const updated = await storage.updateDriver(id, update);
    
    // If vehicle_id is provided, update the vehicle to link with this driver
    if (vehicle_id) {
      await storage.updateVehicle(vehicle_id, { driver_id: updated.id });
    }
    
    res.json(updated);
  });
  app.patch("/api/drivers/:id/status", requireAuth, requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    const updated = await storage.updateDriverStatus(id, status);
    res.json(updated);
  });

  // --- CONDUCTOR ENDPOINTS ---
  app.get("/api/conductors", requireAuth, requireAdmin, async (req, res) => {
    const { status, search, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const result = await storage.getAllConductors({
      status: status as string,
      search: search as string,
      limit: Number(limit),
      offset,
    });
    res.json({
      conductors: result.conductors,
      total: result.total,
      page: Number(page),
      totalPages: Math.ceil(result.total / Number(limit)),
    });
  });
  app.get("/api/conductors/:id", requireAuth, requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const conductor = await storage.getConductor(id);
    if (!conductor) return res.status(404).json({ message: "Conductor not found" });
    res.json(conductor);
  });
  app.post("/api/conductors", requireAuth, requireAdmin, async (req, res) => {
    const { vehicle_id, ...conductorData } = req.body;
    const created = await storage.createConductor(conductorData);
    
    // If vehicle_id is provided, update the vehicle to link with this conductor
    if (vehicle_id) {
      await storage.updateVehicle(vehicle_id, { conductor_id: created.id });
    }
    
    res.json(created);
  });
  app.put("/api/conductors/:id", requireAuth, requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const { vehicle_id, ...update } = req.body;
    const updated = await storage.updateConductor(id, update);
    
    // If vehicle_id is provided, update the vehicle to link with this conductor
    if (vehicle_id) {
      await storage.updateVehicle(vehicle_id, { conductor_id: updated.id });
    }
    
    res.json(updated);
  });
  app.patch("/api/conductors/:id/status", requireAuth, requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    const updated = await storage.updateConductorStatus(id, status);
    res.json(updated);
  });

  // --- VEHICLE CATEGORIES ENDPOINTS ---
  app.get("/api/vehicle-categories", requireAuth, requireAdmin, async (req, res) => {
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

  app.get("/api/vehicle-categories/:id", requireAuth, requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const [category] = await db.select().from(vehicle_categories).where(eq(vehicle_categories.id, id));
    if (!category) return res.status(404).json({ message: "Vehicle category not found" });
    res.json(category);
  });

  app.post("/api/vehicle-categories", requireAuth, requireAdmin, async (req, res) => {
    const validatedData = insertVehicleCategorySchema.parse(req.body);
    const [category] = await db.insert(vehicle_categories).values(validatedData).returning();
    res.json(category);
  });

  app.put("/api/vehicle-categories/:id", requireAuth, requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const validatedData = insertVehicleCategorySchema.partial().parse(req.body);
    const [category] = await db.update(vehicle_categories)
      .set({ ...validatedData, updated_at: new Date() })
      .where(eq(vehicle_categories.id, id))
      .returning();
    if (!category) return res.status(404).json({ message: "Vehicle category not found" });
    res.json(category);
  });

  app.patch("/api/vehicle-categories/:id/status", requireAuth, requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    const [category] = await db.update(vehicle_categories)
      .set({ status, updated_at: new Date() })
      .where(eq(vehicle_categories.id, id))
      .returning();
    if (!category) return res.status(404).json({ message: "Vehicle category not found" });
    res.json(category);
  });

  app.delete("/api/vehicle-categories/:id", requireAuth, requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    await db.delete(vehicle_categories).where(eq(vehicle_categories.id, id));
    res.json({ success: true });
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
    const { status, search, category_id, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
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
    
    res.json({
      types: result,
      total: Number(totalResult[0]?.count || 0),
      page: Number(page),
      totalPages: Math.ceil(Number(totalResult[0]?.count || 0) / Number(limit)),
    });
  });

  app.get("/api/vehicle-types/:id", requireAuth, requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const [type] = await db.select().from(vehicle_types).where(eq(vehicle_types.id, id));
    if (!type) return res.status(404).json({ message: "Vehicle type not found" });
    res.json(type);
  });

  app.post("/api/vehicle-types", requireAuth, requireAdmin, async (req, res) => {
    const validatedData = insertVehicleTypeSchema.parse(req.body);
    const [type] = await db.insert(vehicle_types).values(validatedData).returning();
    res.json(type);
  });

  app.put("/api/vehicle-types/:id", requireAuth, requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const validatedData = insertVehicleTypeSchema.partial().parse(req.body);
    const [type] = await db.update(vehicle_types)
      .set({ ...validatedData, updated_at: new Date() })
      .where(eq(vehicle_types.id, id))
      .returning();
    if (!type) return res.status(404).json({ message: "Vehicle type not found" });
    res.json(type);
  });

  app.patch("/api/vehicle-types/:id/status", requireAuth, requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    const [type] = await db.update(vehicle_types)
      .set({ status, updated_at: new Date() })
      .where(eq(vehicle_types.id, id))
      .returning();
    if (!type) return res.status(404).json({ message: "Vehicle type not found" });
    res.json(type);
  });

  app.delete("/api/vehicle-types/:id", requireAuth, requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    await db.delete(vehicle_types).where(eq(vehicle_types.id, id));
    res.json({ success: true });
  });

  // --- FUEL TYPES ENDPOINTS ---
  app.get("/api/fuel-types", requireAuth, requireAdmin, async (req, res) => {
    const { status, search, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    let whereConditions = [];
    if (status) whereConditions.push(eq(fuel_types.status, status as string));
    if (search) whereConditions.push(like(fuel_types.name, `%${search}%`));
    
    const result = await db.select().from(fuel_types)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .limit(Number(limit))
      .offset(offset);
    
    const totalResult = await db.select({ count: sql`count(*)` }).from(fuel_types)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);
    
    res.json({
      fuelTypes: result,
      total: Number(totalResult[0]?.count || 0),
      page: Number(page),
      totalPages: Math.ceil(Number(totalResult[0]?.count || 0) / Number(limit)),
    });
  });

  app.get("/api/fuel-types/:id", requireAuth, requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const [fuelType] = await db.select().from(fuel_types).where(eq(fuel_types.id, id));
    if (!fuelType) return res.status(404).json({ message: "Fuel type not found" });
    res.json(fuelType);
  });

  app.post("/api/fuel-types", requireAuth, requireAdmin, async (req, res) => {
    const validatedData = insertFuelTypeSchema.parse(req.body);
    const [fuelType] = await db.insert(fuel_types).values(validatedData).returning();
    res.json(fuelType);
  });

  app.put("/api/fuel-types/:id", requireAuth, requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const validatedData = insertFuelTypeSchema.partial().parse(req.body);
    const [fuelType] = await db.update(fuel_types)
      .set({ ...validatedData, updated_at: new Date() })
      .where(eq(fuel_types.id, id))
      .returning();
    if (!fuelType) return res.status(404).json({ message: "Fuel type not found" });
    res.json(fuelType);
  });

  app.patch("/api/fuel-types/:id/status", requireAuth, requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    const [fuelType] = await db.update(fuel_types)
      .set({ status, updated_at: new Date() })
      .where(eq(fuel_types.id, id))
      .returning();
    if (!fuelType) return res.status(404).json({ message: "Fuel type not found" });
    res.json(fuelType);
  });

  app.delete("/api/fuel-types/:id", requireAuth, requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    await db.delete(fuel_types).where(eq(fuel_types.id, id));
    res.json({ success: true });
  });

  // --- TERMINALS ENDPOINTS ---
  app.get("/api/terminals", requireAuth, requireAdmin, async (req, res) => {
    const { status, search, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    let whereConditions = [];
    if (status) whereConditions.push(eq(terminals.status, status as string));
    if (search) whereConditions.push(like(terminals.name, `%${search}%`));
    
    const result = await db.select().from(terminals)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .limit(Number(limit))
      .offset(offset);
    
    const totalResult = await db.select({ count: sql`count(*)` }).from(terminals)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);
    
    res.json({
      terminals: result,
      total: Number(totalResult[0]?.count || 0),
      page: Number(page),
      totalPages: Math.ceil(Number(totalResult[0]?.count || 0) / Number(limit)),
    });
  });

  app.get("/api/terminals/:id", requireAuth, requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const [terminal] = await db.select().from(terminals).where(eq(terminals.id, id));
    if (!terminal) return res.status(404).json({ message: "Terminal not found" });
    res.json(terminal);
  });

  app.post("/api/terminals", requireAuth, requireAdmin, async (req, res) => {
    const validatedData = insertTerminalSchema.parse(req.body);
    const [terminal] = await db.insert(terminals).values(validatedData).returning();
    res.json(terminal);
  });

  app.put("/api/terminals/:id", requireAuth, requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const validatedData = insertTerminalSchema.partial().parse(req.body);
    const [terminal] = await db.update(terminals)
      .set({ ...validatedData, updated_at: new Date() })
      .where(eq(terminals.id, id))
      .returning();
    if (!terminal) return res.status(404).json({ message: "Terminal not found" });
    res.json(terminal);
  });

  app.patch("/api/terminals/:id/status", requireAuth, requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    const [terminal] = await db.update(terminals)
      .set({ status, updated_at: new Date() })
      .where(eq(terminals.id, id))
      .returning();
    if (!terminal) return res.status(404).json({ message: "Terminal not found" });
    res.json(terminal);
  });

  app.delete("/api/terminals/:id", requireAuth, requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    await db.delete(terminals).where(eq(terminals.id, id));
    res.json({ success: true });
  });

  // --- ROUTES ENDPOINTS ---
  app.get("/api/routes", requireAuth, requireAdmin, async (req, res) => {
    const { status, search, terminal_id, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
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
    
    res.json({
      routes: result,
      total: Number(totalResult[0]?.count || 0),
      page: Number(page),
      totalPages: Math.ceil(Number(totalResult[0]?.count || 0) / Number(limit)),
    });
  });

  app.get("/api/routes/:id", requireAuth, requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const [route] = await db.select().from(routes).where(eq(routes.id, id));
    if (!route) return res.status(404).json({ message: "Route not found" });
    res.json(route);
  });

  app.post("/api/routes", requireAuth, requireAdmin, async (req, res) => {
    const validatedData = insertRouteSchema.parse(req.body);
    const [route] = await db.insert(routes).values(validatedData).returning();
    res.json(route);
  });

  app.put("/api/routes/:id", requireAuth, requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const validatedData = insertRouteSchema.partial().parse(req.body);
    const [route] = await db.update(routes)
      .set({ ...validatedData, updated_at: new Date() })
      .where(eq(routes.id, id))
      .returning();
    if (!route) return res.status(404).json({ message: "Route not found" });
    res.json(route);
  });

  app.patch("/api/routes/:id/status", requireAuth, requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    const [route] = await db.update(routes)
      .set({ status, updated_at: new Date() })
      .where(eq(routes.id, id))
      .returning();
    if (!route) return res.status(404).json({ message: "Route not found" });
    res.json(route);
  });

  app.delete("/api/routes/:id", requireAuth, requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    await db.delete(routes).where(eq(routes.id, id));
    res.json({ success: true });
  });

  // Tracker Companies CRUD endpoints
  app.get("/api/tracker-companies", requireAuth, requireAdmin, async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string || "";
    const status = req.query.status as string || "";

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
    res.json({
      trackerCompanies: companies,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  });

  app.get("/api/tracker-companies/:id", requireAuth, requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const [company] = await db.select()
      .from(tracker_companies)
      .where(eq(tracker_companies.id, id));
    if (!company) return res.status(404).json({ message: "Tracker company not found" });
    res.json(company);
  });

  app.post("/api/tracker-companies", requireAuth, requireAdmin, async (req, res) => {
    const validatedData = insertTrackerCompanySchema.parse(req.body);
    const [company] = await db.insert(tracker_companies).values(validatedData).returning();
    res.json(company);
  });

  app.put("/api/tracker-companies/:id", requireAuth, requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const validatedData = insertTrackerCompanySchema.parse(req.body);
    const [company] = await db.update(tracker_companies)
      .set({ ...validatedData, updated_at: new Date() })
      .where(eq(tracker_companies.id, id))
      .returning();
    if (!company) return res.status(404).json({ message: "Tracker company not found" });
    res.json(company);
  });

  app.patch("/api/tracker-companies/:id/status", requireAuth, requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    const [company] = await db.update(tracker_companies)
      .set({ status, updated_at: new Date() })
      .where(eq(tracker_companies.id, id))
      .returning();
    if (!company) return res.status(404).json({ message: "Tracker company not found" });
    res.json(company);
  });

  app.delete("/api/tracker-companies/:id", requireAuth, requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    await db.delete(tracker_companies).where(eq(tracker_companies.id, id));
    res.json({ success: true });
  });

  // Traccar Proxy Routes
  app.post("/api/traccar/login", async (req, res) => {
    try {
      // Try different credential combinations
      const credentials = [
        { email: 'admin', password: 'admin' },
        { email: 'admin@admin', password: 'admin' },
        { email: 'bridge@cvi-ms.pk', password: 'admin123' },
        { email: 'bridge@cvi-ms.pk', password: '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9' } // SHA-256 of 'admin123'
      ];

      for (const cred of credentials) {
        try {
          const params = new URLSearchParams();
          params.append('email', cred.email);
          params.append('password', cred.password);

          const response = await fetch('http://localhost:8082/api/session', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString()
          });

          if (response.ok) {
            const sessionToken = await response.text();
            res.json({ success: true, sessionToken, credentials: cred });
            return;
          }
        } catch (error) {
          console.log(`Failed with credentials ${cred.email}:`, error instanceof Error ? error.message : String(error));
          continue;
        }
      }

      // If all credentials fail, return a demo mode token
      console.log('All Traccar credentials failed, using demo mode');
      res.json({ 
        success: true, 
        sessionToken: 'demo-token-12345', 
        credentials: { email: 'demo', password: 'demo' },
        demo: true 
      });
    } catch (error) {
      console.error('Traccar login proxy error:', error);
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get("/api/traccar/devices", async (req, res) => {
    try {
      const sessionToken = req.headers.authorization?.replace('Bearer ', '');
      
      if (!sessionToken) {
        return res.status(401).json({ error: 'No session token provided' });
      }

      // Demo mode - return mock data
      if (sessionToken === 'demo-token-12345') {
        const mockDevices = [
          {
            id: 1,
            name: "Demo Vehicle 1",
            uniqueId: "DEMO001",
            status: "online",
            lastUpdate: new Date().toISOString(),
            positionId: 1,
            groupId: 0,
            phone: "+1234567890",
            model: "Demo Tracker",
            contact: "Demo Contact",
            category: "Vehicle"
          },
          {
            id: 2,
            name: "Demo Vehicle 2", 
            uniqueId: "DEMO002",
            status: "offline",
            lastUpdate: new Date(Date.now() - 3600000).toISOString(),
            positionId: 2,
            groupId: 0,
            phone: "+1234567891",
            model: "Demo Tracker",
            contact: "Demo Contact 2",
            category: "Vehicle"
          }
        ];
        return res.json(mockDevices);
      }

      const response = await fetch('http://localhost:8082/api/devices', {
        headers: {
          'Cookie': `JSESSIONID=${sessionToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        res.json(data);
      } else {
        res.status(response.status).json({ error: 'Failed to fetch devices' });
      }
    } catch (error) {
      console.error('Traccar devices proxy error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get("/api/traccar/positions", async (req, res) => {
    try {
      const sessionToken = req.headers.authorization?.replace('Bearer ', '');
      
      if (!sessionToken) {
        return res.status(401).json({ error: 'No session token provided' });
      }

      // Demo mode - return mock data
      if (sessionToken === 'demo-token-12345') {
        const mockPositions = [
          {
            id: 1,
            deviceId: 1,
            protocol: "demo",
            deviceTime: new Date().toISOString(),
            fixTime: new Date().toISOString(),
            serverTime: new Date().toISOString(),
            valid: true,
            latitude: 24.8607,
            longitude: 67.0011,
            altitude: 0,
            speed: 0,
            course: 0,
            address: "Demo Location, Karachi, Pakistan",
            accuracy: 0,
            network: null
          }
        ];
        return res.json(mockPositions);
      }

      const deviceId = req.query.deviceId;
      const endpoint = deviceId ? `/positions?deviceId=${deviceId}` : '/positions';

      const response = await fetch(`http://localhost:8082/api${endpoint}`, {
        headers: {
          'Cookie': `JSESSIONID=${sessionToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        res.json(data);
      } else {
        res.status(response.status).json({ error: 'Failed to fetch positions' });
      }
    } catch (error) {
      console.error('Traccar positions proxy error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get("/api/traccar/events", async (req, res) => {
    try {
      const sessionToken = req.headers.authorization?.replace('Bearer ', '');
      
      if (!sessionToken) {
        return res.status(401).json({ error: 'No session token provided' });
      }

      const deviceId = req.query.deviceId;
      const endpoint = deviceId ? `/events?deviceId=${deviceId}` : '/events';

      const response = await fetch(`http://localhost:8082/api${endpoint}`, {
        headers: {
          'Cookie': `JSESSIONID=${sessionToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        res.json(data);
      } else {
        res.status(response.status).json({ error: 'Failed to fetch events' });
      }
    } catch (error) {
      console.error('Traccar events proxy error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get("/api/traccar/geofences", async (req, res) => {
    try {
      const sessionToken = req.headers.authorization?.replace('Bearer ', '');
      
      if (!sessionToken) {
        return res.status(401).json({ error: 'No session token provided' });
      }

      // Demo mode - return mock data
      if (sessionToken === 'demo-token-12345') {
        const mockGeofences = [
          {
            id: 1,
            name: "Demo Geofence 1",
            description: "Demo geofence for testing",
            area: "POLYGON((67.0011 24.8607, 67.0021 24.8607, 67.0021 24.8617, 67.0011 24.8617, 67.0011 24.8607))",
            calendarId: 0,
            attributes: {}
          }
        ];
        return res.json(mockGeofences);
      }

      const response = await fetch('http://localhost:8082/api/geofences', {
        headers: {
          'Cookie': `JSESSIONID=${sessionToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        res.json(data);
      } else {
        res.status(response.status).json({ error: 'Failed to fetch geofences' });
      }
    } catch (error) {
      console.error('Traccar geofences proxy error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get("/api/traccar/notifications", async (req, res) => {
    try {
      const sessionToken = req.headers.authorization?.replace('Bearer ', '');
      
      if (!sessionToken) {
        return res.status(401).json({ error: 'No session token provided' });
      }

      // Demo mode - return mock data
      if (sessionToken === 'demo-token-12345') {
        const mockNotifications = [
          {
            id: 1,
            type: "alarm",
            always: false,
            attributes: {},
            calendarId: 0,
            web: true,
            mail: false,
            sms: false
          }
        ];
        return res.json(mockNotifications);
      }

      const response = await fetch('http://localhost:8082/api/notifications', {
        headers: {
          'Cookie': `JSESSIONID=${sessionToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        res.json(data);
      } else {
        res.status(response.status).json({ error: 'Failed to fetch notifications' });
      }
    } catch (error) {
      console.error('Traccar notifications proxy error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  const httpServer = createServer(app);
  
  // Initialize WebSocket service
  const wsService = getWebSocketService();
  wsService.initialize(httpServer);
  
  return httpServer;
}
