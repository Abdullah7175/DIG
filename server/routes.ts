import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertVehicleSchema, insertOwnerSchema, insertDriverSchema, insertConductorSchema, insertVerificationSchema } from "@shared/schema";
import { generateQRCode } from "./lib/qr-generator";

export async function registerRoutes(app: Express): Promise<Server> {
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

  // Vehicle registration
  app.post("/api/vehicles/register", async (req, res) => {
    try {
      const { vehicle, owner, driver, conductor } = req.body;
      
      // Validate input
      const validatedVehicle = insertVehicleSchema.parse(vehicle);
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
        const validatedConductor = insertConductorSchema.parse(conductor);
        existingConductor = await storage.getConductorByCnic(validatedConductor.cnic);
        if (!existingConductor) {
          existingConductor = await storage.createConductor(validatedConductor);
        }
      }

      // Create vehicle
      const newVehicle = await storage.createVehicle({
        ...validatedVehicle,
        owner_id: existingOwner.id,
        driver_id: existingDriver.id,
        conductor_id: existingConductor?.id || null,
        registered_by: 1, // TODO: Get from session
      });

      // Generate QR code
      const qrData = {
        id: newVehicle.id,
        registration_number: newVehicle.vehicle_register_number,
        category: newVehicle.vehicle_category,
        owner: existingOwner.name,
      };
      
      const qrCode = await generateQRCode(JSON.stringify(qrData));
      await storage.updateVehicleQRCode(newVehicle.id, qrCode);

      res.json({ 
        message: "Vehicle registered successfully", 
        vehicleId: newVehicle.id 
      });
    } catch (error) {
      console.error("Error registering vehicle:", error);
      res.status(400).json({ message: "Failed to register vehicle" });
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

      const vehicle = await storage.getVehicleByRegistration(vehicleData.registration_number);
      
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

      const qrData = {
        id: vehicle.id,
        registration_number: vehicle.registration_number,
        type: vehicle.vehicle_type,
        owner: vehicle.owner.name,
      };
      
      const qrCode = await generateQRCode(JSON.stringify(qrData));
      await storage.updateVehicleQRCode(vehicle.id, qrCode);

      res.json({ qrCode, message: "QR code generated successfully" });
    } catch (error) {
      console.error("Error generating QR code:", error);
      res.status(500).json({ message: "Failed to generate QR code" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
