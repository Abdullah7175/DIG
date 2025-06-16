import { 
  vehicles, 
  owners, 
  drivers,
  conductors,
  users,
  qr_verifications,
  vehicle_documents,
  type Vehicle, 
  type Owner,
  type Driver,
  type Conductor,
  type User,
  type InsertVehicle,
  type InsertOwner,
  type InsertDriver,
  type InsertConductor,
  type InsertUser,
  type InsertVerification,
  type VehicleWithOwner,
  type QRVerification
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, like, count } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Owner methods
  createOwner(owner: InsertOwner): Promise<Owner>;
  getOwnerByCnic(cnic: string): Promise<Owner | undefined>;

  // Driver methods
  createDriver(driver: InsertDriver): Promise<Driver>;
  getDriverByCnic(cnic: string): Promise<Driver | undefined>;

  // Conductor methods
  createConductor(conductor: InsertConductor): Promise<Conductor>;
  getConductorByCnic(cnic: string): Promise<Conductor | undefined>;

  // Vehicle methods
  createVehicle(vehicle: InsertVehicle): Promise<Vehicle>;
  getVehicle(id: number): Promise<VehicleWithOwner | undefined>;
  getVehicleByRegistration(registrationNumber: string): Promise<VehicleWithOwner | undefined>;
  getAllVehicles(filters?: {
    category?: string;
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{vehicles: VehicleWithOwner[], total: number}>;
  updateVehicleStatus(id: number, status: string): Promise<Vehicle>;
  updateVehicleQRCode(id: number, qrCode: string): Promise<Vehicle>;

  // Verification methods
  createVerification(verification: InsertVerification): Promise<QRVerification>;
  getRecentVerifications(limit?: number): Promise<QRVerification[]>;

  // Dashboard stats
  getDashboardStats(): Promise<{
    totalVehicles: number;
    pendingApproval: number;
    qrScansToday: number;
    activeOfficers: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async createOwner(insertOwner: InsertOwner): Promise<Owner> {
    const [owner] = await db
      .insert(owners)
      .values(insertOwner)
      .returning();
    return owner;
  }

  async getOwnerByCnic(cnic: string): Promise<Owner | undefined> {
    const [owner] = await db.select().from(owners).where(eq(owners.cnic, cnic));
    return owner || undefined;
  }

  async createDriver(insertDriver: InsertDriver): Promise<Driver> {
    const [driver] = await db
      .insert(drivers)
      .values(insertDriver)
      .returning();
    return driver;
  }

  async getDriverByCnic(cnic: string): Promise<Driver | undefined> {
    const [driver] = await db.select().from(drivers).where(eq(drivers.cnic, cnic));
    return driver || undefined;
  }

  async createConductor(insertConductor: InsertConductor): Promise<Conductor> {
    const [conductor] = await db
      .insert(conductors)
      .values(insertConductor)
      .returning();
    return conductor;
  }

  async getConductorByCnic(cnic: string): Promise<Conductor | undefined> {
    const [conductor] = await db.select().from(conductors).where(eq(conductors.cnic, cnic));
    return conductor || undefined;
  }

  async createVehicle(insertVehicle: InsertVehicle): Promise<Vehicle> {
    const [vehicle] = await db
      .insert(vehicles)
      .values(insertVehicle)
      .returning();
    return vehicle;
  }

  async getVehicle(id: number): Promise<VehicleWithOwner | undefined> {
    const [result] = await db
      .select()
      .from(vehicles)
      .leftJoin(owners, eq(vehicles.owner_id, owners.id))
      .leftJoin(users, eq(vehicles.registered_by, users.id))
      .where(eq(vehicles.id, id));

    if (!result) return undefined;

    return {
      ...result.vehicles,
      owner: result.owners!,
      registeredBy: result.users || undefined,
    };
  }

  async getVehicleByRegistration(registrationNumber: string): Promise<VehicleWithOwner | undefined> {
    const [result] = await db
      .select()
      .from(vehicles)
      .leftJoin(owners, eq(vehicles.owner_id, owners.id))
      .leftJoin(drivers, eq(vehicles.driver_id, drivers.id))
      .leftJoin(conductors, eq(vehicles.conductor_id, conductors.id))
      .leftJoin(users, eq(vehicles.registered_by, users.id))
      .where(eq(vehicles.vehicle_register_number, registrationNumber));

    if (!result) return undefined;

    return {
      ...result.vehicles,
      owner: result.owners!,
      registeredBy: result.users || undefined,
    };
  }

  async getAllVehicles(filters?: {
    type?: string;
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{vehicles: VehicleWithOwner[], total: number}> {
    const limit = filters?.limit || 10;
    const offset = filters?.offset || 0;

    let whereConditions = [];

    if (filters?.type) {
      whereConditions.push(eq(vehicles.vehicle_type, filters.type));
    }

    if (filters?.status) {
      whereConditions.push(eq(vehicles.status, filters.status));
    }

    if (filters?.search) {
      whereConditions.push(
        or(
          like(vehicles.registration_number, `%${filters.search}%`),
          like(vehicles.make_model, `%${filters.search}%`),
          like(owners.name, `%${filters.search}%`)
        )
      );
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const [vehicleResults, totalResults] = await Promise.all([
      db
        .select()
        .from(vehicles)
        .leftJoin(owners, eq(vehicles.owner_id, owners.id))
        .leftJoin(users, eq(vehicles.registered_by, users.id))
        .where(whereClause)
        .orderBy(desc(vehicles.created_at))
        .limit(limit)
        .offset(offset),
      
      db
        .select({ count: count() })
        .from(vehicles)
        .leftJoin(owners, eq(vehicles.owner_id, owners.id))
        .where(whereClause)
    ]);

    const vehiclesWithOwner = vehicleResults.map(result => ({
      ...result.vehicles,
      owner: result.owners!,
      registeredBy: result.users || undefined,
    }));

    return {
      vehicles: vehiclesWithOwner,
      total: totalResults[0].count
    };
  }

  async updateVehicleStatus(id: number, status: string): Promise<Vehicle> {
    const [vehicle] = await db
      .update(vehicles)
      .set({ status, updated_at: new Date() })
      .where(eq(vehicles.id, id))
      .returning();
    return vehicle;
  }

  async updateVehicleQRCode(id: number, qrCode: string): Promise<Vehicle> {
    const [vehicle] = await db
      .update(vehicles)
      .set({ qr_code: qrCode, updated_at: new Date() })
      .where(eq(vehicles.id, id))
      .returning();
    return vehicle;
  }

  async createVerification(insertVerification: InsertVerification): Promise<QRVerification> {
    const [verification] = await db
      .insert(qr_verifications)
      .values(insertVerification)
      .returning();
    return verification;
  }

  async getRecentVerifications(limit = 10): Promise<QRVerification[]> {
    return await db
      .select()
      .from(qr_verifications)
      .orderBy(desc(qr_verifications.verified_at))
      .limit(limit);
  }

  async getDashboardStats(): Promise<{
    totalVehicles: number;
    pendingApproval: number;
    qrScansToday: number;
    activeOfficers: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalVehiclesResult] = await db
      .select({ count: count() })
      .from(vehicles);

    const [pendingApprovalResult] = await db
      .select({ count: count() })
      .from(vehicles)
      .where(eq(vehicles.status, 'pending'));

    const [qrScansTodayResult] = await db
      .select({ count: count() })
      .from(qr_verifications)
      .where(eq(qr_verifications.verified_at, today));

    const [activeOfficersResult] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.role, 'officer'));

    return {
      totalVehicles: totalVehiclesResult.count,
      pendingApproval: pendingApprovalResult.count,
      qrScansToday: qrScansTodayResult.count,
      activeOfficers: activeOfficersResult.count,
    };
  }
}

export const storage = new DatabaseStorage();
