import { 
  vehicles, 
  owners, 
  drivers,
  conductors,
  users,
  qr_verifications,
  vehicle_documents,
  notifications,
  vehicle_categories,
  vehicle_types,
  fuel_types,
  terminals,
  routes,
  tracker_companies,
  tracker_payments,
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
  type QRVerification,
  type InsertNotification,
  type TrackerPayment,
  type InsertTrackerPayment
} from "../shared/schema.js";
import { db } from "./db.js";
import { eq, desc, and, or, like, count, sql, ilike, ne } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Owner methods
  createOwner(owner: InsertOwner): Promise<Owner>;
  getOwnerByCnic(cnic: string): Promise<Owner | undefined>;
  getOwner(id: number): Promise<(Owner & { vehicle_registration_numbers: string[] }) | undefined>;
  getAllOwners(filters?: { status?: string; search?: string; limit?: number; offset?: number }): Promise<{owners: (Owner & { vehicle_registration_numbers: string[] })[], total: number}>;
  updateOwner(id: number, update: Partial<InsertOwner>): Promise<Owner>;
  updateOwnerStatus(id: number, status: string): Promise<Owner>;

  // Driver methods
  createDriver(driver: InsertDriver): Promise<Driver>;
  getDriverByCnic(cnic: string): Promise<Driver | undefined>;
  getDriver(id: number): Promise<(Driver & { vehicle_registration_numbers: string[] }) | undefined>;
  getAllDrivers(filters?: { status?: string; search?: string; limit?: number; offset?: number }): Promise<{drivers: (Driver & { vehicle_registration_numbers: string[] })[], total: number}>;
  updateDriver(id: number, update: Partial<InsertDriver>): Promise<Driver>;
  updateDriverStatus(id: number, status: string): Promise<Driver>;

  // Conductor methods
  createConductor(conductor: InsertConductor): Promise<Conductor>;
  getConductorByCnic(cnic: string): Promise<Conductor | undefined>;
  getConductor(id: number): Promise<(Conductor & { vehicle_registration_numbers: string[] }) | undefined>;
  getAllConductors(filters?: { status?: string; search?: string; limit?: number; offset?: number }): Promise<{conductors: (Conductor & { vehicle_registration_numbers: string[] })[], total: number}>;
  updateConductor(id: number, update: Partial<InsertConductor>): Promise<Conductor>;
  updateConductorStatus(id: number, status: string): Promise<Conductor>;

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
  updateVehicle(id: number, update: Partial<InsertVehicle>): Promise<Vehicle>;
  updateVehicleStatus(id: number, status: string): Promise<Vehicle>;
  updateVehicleQRCode(id: number, qrCode: string): Promise<Vehicle>;
  createVehicleDocument(document: { vehicle_id: number; document_type: string; file_path: string }): Promise<void>;
  deleteVehicleDocument(vehicleId: number, documentType: string): Promise<void>;

  // Verification methods
  createVerification(verification: InsertVerification): Promise<QRVerification>;
  getRecentVerifications(limit?: number): Promise<QRVerification[]>;

  // Dashboard stats
  getDashboardStats(): Promise<{
    totalVehicles: number;
    pendingApproval: number;
    qrScansToday: number;
    activeOfficers: number;
    totalOwners: number;
    totalDrivers: number;
    totalConductors: number;
    vehiclesByType: { type: string; count: number }[];
    vehiclesByStatus: { status: string; count: number }[];
    recentRegistrations: any[];
    monthlyRegistrations: { month: string; count: number }[];
    // New dynamic entity counts
    totalVehicleCategories: number;
    totalVehicleTypes: number;
    totalFuelTypes: number;
    totalTerminals: number;
    totalRoutes: number;
    totalTrackerCompanies: number;
  }>;
  // Notification methods
  createNotification(notification: InsertNotification): Promise<void>;

  // Tracker Payment methods
  createTrackerPayment(payment: InsertTrackerPayment): Promise<TrackerPayment>;
  getTrackerPayment(id: number): Promise<TrackerPayment | undefined>;
  getAllTrackerPayments(filters?: {
    vehicle_id?: number;
    tracker_company_id?: number;
    vehicle_type_id?: number;
    status?: string;
    expired?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{payments: (TrackerPayment & { vehicle?: Vehicle, trackerCompany?: any })[], total: number}>;
  updateTrackerPayment(id: number, update: Partial<InsertTrackerPayment>): Promise<TrackerPayment>;
  deleteTrackerPayment(id: number): Promise<void>;
  getExpiredPayments(): Promise<TrackerPayment[]>;
  renewTrackerPayment(paymentId: number, newPaymentDate: Date, amount?: string): Promise<TrackerPayment>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, username));
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

  async getOwner(id: number): Promise<(Owner & { vehicle_registration_numbers: string[] }) | undefined> {
    const [owner] = await db.select({
      id: owners.id,
      name: owners.name,
      cnic: owners.cnic,
      contact: owners.contact,
      address: owners.address,
      status: owners.status,
      created_at: owners.created_at,
      vehicle_registration_numbers: sql<string[]>`ARRAY(
        SELECT ${vehicles.vehicle_register_number} 
        FROM ${vehicles} 
        WHERE ${vehicles.owner_id} = ${owners.id}
      )`
    }).from(owners).where(eq(owners.id, id));
    return owner || undefined;
  }
  async getAllOwners(filters?: { status?: string; search?: string; limit?: number; offset?: number }): Promise<{owners: (Owner & { vehicle_registration_numbers: string[] })[], total: number}> {
    const limit = filters?.limit || 10;
    const offset = filters?.offset || 0;
    let whereConditions = [];
    if (filters?.status) whereConditions.push(eq(owners.status, filters.status));
    if (filters?.search) whereConditions.push(like(owners.name, `%${filters.search}%`));
    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;
    
    const [ownerResults, totalResults] = await Promise.all([
      db.select({
        id: owners.id,
        name: owners.name,
        cnic: owners.cnic,
        contact: owners.contact,
        address: owners.address,
        status: owners.status,
        created_at: owners.created_at,
        vehicle_registration_numbers: sql<string[]>`ARRAY(
          SELECT ${vehicles.vehicle_register_number} 
          FROM ${vehicles} 
          WHERE ${vehicles.owner_id} = ${owners.id}
        )`
      }).from(owners).where(whereClause).orderBy(desc(owners.created_at)).limit(limit).offset(offset),
      db.select({ count: count() }).from(owners).where(whereClause)
    ]);
    return { owners: ownerResults, total: totalResults[0].count };
  }
  async updateOwner(id: number, update: Partial<InsertOwner>): Promise<Owner> {
    const [owner] = await db.update(owners).set({ ...update }).where(eq(owners.id, id)).returning();
    return owner;
  }
  async updateOwnerStatus(id: number, status: string): Promise<Owner> {
    const [owner] = await db.update(owners).set({ status }).where(eq(owners.id, id)).returning();
    return owner;
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

  async getDriver(id: number): Promise<(Driver & { vehicle_registration_numbers: string[] }) | undefined> {
    const [driver] = await db.select({
      id: drivers.id,
      name: drivers.name,
      cnic: drivers.cnic,
      contact: drivers.contact,
      driving_license_number: drivers.driving_license_number,
      driving_license_category: drivers.driving_license_category,
      driving_license_expiry_date: drivers.driving_license_expiry_date,
      status: drivers.status,
      created_at: drivers.created_at,
      vehicle_registration_numbers: sql<string[]>`ARRAY(
        SELECT ${vehicles.vehicle_register_number} 
        FROM ${vehicles} 
        WHERE ${vehicles.driver_id} = ${drivers.id}
      )`
    }).from(drivers).where(eq(drivers.id, id));
    return driver || undefined;
  }
  async getAllDrivers(filters?: { status?: string; search?: string; limit?: number; offset?: number }): Promise<{drivers: (Driver & { vehicle_registration_numbers: string[] })[], total: number}> {
    const limit = filters?.limit || 10;
    const offset = filters?.offset || 0;
    let whereConditions = [];
    if (filters?.status) whereConditions.push(eq(drivers.status, filters.status));
    if (filters?.search) whereConditions.push(like(drivers.name, `%${filters.search}%`));
    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;
    
    const [driverResults, totalResults] = await Promise.all([
      db.select({
        id: drivers.id,
        name: drivers.name,
        cnic: drivers.cnic,
        contact: drivers.contact,
        driving_license_number: drivers.driving_license_number,
        driving_license_category: drivers.driving_license_category,
        driving_license_expiry_date: drivers.driving_license_expiry_date,
        status: drivers.status,
        created_at: drivers.created_at,
        vehicle_registration_numbers: sql<string[]>`ARRAY(
          SELECT ${vehicles.vehicle_register_number} 
          FROM ${vehicles} 
          WHERE ${vehicles.driver_id} = ${drivers.id}
        )`
      }).from(drivers).where(whereClause).orderBy(desc(drivers.created_at)).limit(limit).offset(offset),
      db.select({ count: count() }).from(drivers).where(whereClause)
    ]);
    return { drivers: driverResults, total: totalResults[0].count };
  }
  async updateDriver(id: number, update: Partial<InsertDriver>): Promise<Driver> {
    const [driver] = await db.update(drivers).set({ ...update }).where(eq(drivers.id, id)).returning();
    return driver;
  }
  async updateDriverStatus(id: number, status: string): Promise<Driver> {
    const [driver] = await db.update(drivers).set({ status }).where(eq(drivers.id, id)).returning();
    return driver;
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

  async getConductor(id: number): Promise<(Conductor & { vehicle_registration_numbers: string[] }) | undefined> {
    const [conductor] = await db.select({
      id: conductors.id,
      name: conductors.name,
      cnic: conductors.cnic,
      contact: conductors.contact,
      status: conductors.status,
      created_at: conductors.created_at,
      vehicle_registration_numbers: sql<string[]>`ARRAY(
        SELECT ${vehicles.vehicle_register_number} 
        FROM ${vehicles} 
        WHERE ${vehicles.conductor_id} = ${conductors.id}
      )`
    }).from(conductors).where(eq(conductors.id, id));
    return conductor || undefined;
  }
  async getAllConductors(filters?: { status?: string; search?: string; limit?: number; offset?: number }): Promise<{conductors: (Conductor & { vehicle_registration_numbers: string[] })[], total: number}> {
    const limit = filters?.limit || 10;
    const offset = filters?.offset || 0;
    let whereConditions = [];
    if (filters?.status) whereConditions.push(eq(conductors.status, filters.status));
    if (filters?.search) whereConditions.push(like(conductors.name, `%${filters.search}%`));
    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;
    
    const [conductorResults, totalResults] = await Promise.all([
      db.select({
        id: conductors.id,
        name: conductors.name,
        cnic: conductors.cnic,
        contact: conductors.contact,
        status: conductors.status,
        created_at: conductors.created_at,
        vehicle_registration_numbers: sql<string[]>`ARRAY(
          SELECT ${vehicles.vehicle_register_number} 
          FROM ${vehicles} 
          WHERE ${vehicles.conductor_id} = ${conductors.id}
        )`
      }).from(conductors).where(whereClause).orderBy(desc(conductors.created_at)).limit(limit).offset(offset),
      db.select({ count: count() }).from(conductors).where(whereClause)
    ]);
    return { conductors: conductorResults, total: totalResults[0].count };
  }
  async updateConductor(id: number, update: Partial<InsertConductor>): Promise<Conductor> {
    const [conductor] = await db.update(conductors).set({ ...update }).where(eq(conductors.id, id)).returning();
    return conductor;
  }
  async updateConductorStatus(id: number, status: string): Promise<Conductor> {
    const [conductor] = await db.update(conductors).set({ status }).where(eq(conductors.id, id)).returning();
    return conductor;
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
      .leftJoin(drivers, eq(vehicles.driver_id, drivers.id))
      .leftJoin(conductors, eq(vehicles.conductor_id, conductors.id))
      .leftJoin(users, eq(vehicles.registered_by, users.id))
      .leftJoin(vehicle_categories, eq(vehicles.vehicle_category_id, vehicle_categories.id))
      .leftJoin(vehicle_types, eq(vehicles.vehicle_type_id, vehicle_types.id))
      .where(eq(vehicles.id, id));

    if (!result) return undefined;

    // Fetch all documents for this vehicle
    const documents = await db
      .select()
      .from(vehicle_documents)
      .where(eq(vehicle_documents.vehicle_id, id));

    return {
      ...result.vehicles,
      owner: result.owners!,
      driver: result.drivers || undefined,
      conductor: result.conductors || undefined,
      registeredBy: result.users || undefined,
      vehicleCategory: result.vehicle_categories || undefined,
      vehicleType: result.vehicle_types || undefined,
      documents: documents || [],
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
      .leftJoin(vehicle_categories, eq(vehicles.vehicle_category_id, vehicle_categories.id))
      .where(eq(vehicles.vehicle_register_number, registrationNumber));

    if (!result) return undefined;

    return {
      ...result.vehicles,
      owner: result.owners!,
      driver: result.drivers || undefined,
      conductor: result.conductors || undefined,
      registeredBy: result.users || undefined,
      vehicleCategory: result.vehicle_categories || undefined,
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
    const needsOwnersJoin = filters?.search && filters.search.trim() ? true : false;
    const needsTypeJoin = filters?.type ? true : false;

    if (filters?.type) {
      whereConditions.push(eq(vehicle_types.name, filters.type));
    }

    if (filters?.status) {
      whereConditions.push(eq(vehicles.status, filters.status));
    }

    if (filters?.search && filters.search.trim()) {
      // Use PostgreSQL ILIKE for case-insensitive search (faster than LOWER + LIKE)
      const searchTerm = `%${filters.search.trim()}%`;
      // Prioritize most common searches: registration number, owner name, CNIC
      // Only search in owners table if we're joining it
      const searchConditions = [
        ilike(vehicles.vehicle_register_number, searchTerm),
        ilike(vehicles.engine_number, searchTerm),
        ilike(vehicles.chassis_number, searchTerm),
        ilike(vehicles.vehicle_owner_name_on_book, searchTerm),
        ilike(vehicles.make_company, searchTerm),
        ilike(vehicles.model_number, searchTerm),
        ilike(vehicles.book_number, searchTerm),
        ilike(vehicles.registration_region, searchTerm)
      ];
      
      // Only add owner search conditions if we're joining owners table
      if (needsOwnersJoin) {
        searchConditions.push(
          ilike(owners.name, searchTerm),
          ilike(owners.cnic, searchTerm),
          ilike(owners.contact, searchTerm)
        );
      }
      
      whereConditions.push(or(...searchConditions));
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    // Optimize count query - only join tables needed for filtering
    let countQuery;
    if (!needsOwnersJoin && !needsTypeJoin) {
      // Simple count without joins - fastest
      countQuery = db
        .select({ count: sql<number>`count(*)::int` })
        .from(vehicles)
        .where(whereClause);
    } else {
      // Need joins for filtering
      const countQueryBuilder = db
        .select({ count: sql<number>`count(distinct ${vehicles.id})::int` })
        .from(vehicles);
      
      if (needsOwnersJoin && needsTypeJoin) {
        countQuery = countQueryBuilder
          .leftJoin(owners, eq(vehicles.owner_id, owners.id))
          .leftJoin(vehicle_types, eq(vehicles.vehicle_type_id, vehicle_types.id))
          .where(whereClause);
      } else if (needsOwnersJoin) {
        countQuery = countQueryBuilder
          .leftJoin(owners, eq(vehicles.owner_id, owners.id))
          .where(whereClause);
      } else {
        countQuery = countQueryBuilder
          .leftJoin(vehicle_types, eq(vehicles.vehicle_type_id, vehicle_types.id))
          .where(whereClause);
      }
    }

    // Build main query with all necessary joins
    const vehicleQuery = db
      .select({
        vehicles: vehicles,
        owners: owners,
        drivers: drivers,
        conductors: conductors,
        users: users,
        vehicle_categories: vehicle_categories,
        vehicle_types: vehicle_types
      })
      .from(vehicles)
      .leftJoin(owners, eq(vehicles.owner_id, owners.id))
      .leftJoin(drivers, eq(vehicles.driver_id, drivers.id))
      .leftJoin(conductors, eq(vehicles.conductor_id, conductors.id))
      .leftJoin(users, eq(vehicles.registered_by, users.id))
      .leftJoin(vehicle_categories, eq(vehicles.vehicle_category_id, vehicle_categories.id))
      .leftJoin(vehicle_types, eq(vehicles.vehicle_type_id, vehicle_types.id))
      .where(whereClause)
      .orderBy(desc(vehicles.created_at))
      .limit(limit)
      .offset(offset);

    const queryStart = Date.now();
    const [vehicleResults, totalResults] = await Promise.all([
      vehicleQuery,
      countQuery
    ]);
    const queryEnd = Date.now();
    console.log(`[PERF] Database query executed in ${queryEnd - queryStart}ms (vehicles: ${vehicleResults.length}, total: ${totalResults[0].count})`);

    const vehiclesWithOwner = vehicleResults.map(result => ({
      ...result.vehicles,
      owner: result.owners!,
      driver: result.drivers || undefined,
      conductor: result.conductors || undefined,
      registeredBy: result.users || undefined,
      vehicleCategory: result.vehicle_categories || undefined,
      vehicleType: result.vehicle_types || undefined,
    }));

    return {
      vehicles: vehiclesWithOwner,
      total: totalResults[0].count
    };
  }

  async updateVehicle(id: number, update: Partial<InsertVehicle>): Promise<Vehicle> {
    const [vehicle] = await db
      .update(vehicles)
      .set({ ...update, updated_at: new Date() })
      .where(eq(vehicles.id, id))
      .returning();
    return vehicle;
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

  async createVehicleDocument(document: { vehicle_id: number; document_type: string; file_path: string }): Promise<void> {
    await db.insert(vehicle_documents).values(document);
  }

  async deleteVehicleDocument(vehicleId: number, documentType: string): Promise<void> {
    await db.delete(vehicle_documents)
      .where(and(
        eq(vehicle_documents.vehicle_id, vehicleId),
        eq(vehicle_documents.document_type, documentType)
      ));
  }

  async createNotification(notification: InsertNotification): Promise<void> {
    await db.insert(notifications).values(notification);
  }

  async getDashboardStats(): Promise<{
    totalVehicles: number;
    pendingApproval: number;
    qrScansToday: number;
    activeOfficers: number;
    totalOwners: number;
    totalDrivers: number;
    totalConductors: number;
    vehiclesByType: { type: string; count: number }[];
    vehiclesByStatus: { status: string; count: number }[];
    recentRegistrations: any[];
    monthlyRegistrations: { month: string; count: number }[];
    // New dynamic entity counts
    totalVehicleCategories: number;
    totalVehicleTypes: number;
    totalFuelTypes: number;
    totalTerminals: number;
    totalRoutes: number;
    totalTrackerCompanies: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Basic counts
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
      .where(eq(users.role, 2));

    // People counts
    const [totalOwnersResult] = await db
      .select({ count: count() })
      .from(owners);

    const [totalDriversResult] = await db
      .select({ count: count() })
      .from(drivers);

    const [totalConductorsResult] = await db
      .select({ count: count() })
      .from(conductors);

    // New dynamic entity counts
    const [totalVehicleCategoriesResult] = await db
      .select({ count: count() })
      .from(vehicle_categories);

    const [totalVehicleTypesResult] = await db
      .select({ count: count() })
      .from(vehicle_types);

    const [totalFuelTypesResult] = await db
      .select({ count: count() })
      .from(fuel_types);

    const [totalTerminalsResult] = await db
      .select({ count: count() })
      .from(terminals);

    const [totalRoutesResult] = await db
      .select({ count: count() })
      .from(routes);

    const [totalTrackerCompaniesResult] = await db
      .select({ count: count() })
      .from(tracker_companies);

    // Vehicles by type
    const vehiclesByTypeResult = await db
      .select({
        type: sql<string>`COALESCE(${vehicle_categories.name}, 'Unknown')`,
        count: count()
      })
      .from(vehicles)
      .leftJoin(vehicle_categories, eq(vehicles.vehicle_category_id, vehicle_categories.id))
      .groupBy(vehicle_categories.name);

    // Vehicles by status
    const vehiclesByStatusResult = await db
      .select({
        status: vehicles.status,
        count: count()
      })
      .from(vehicles)
      .groupBy(vehicles.status);

    // Recent registrations (last 5)
    const recentRegistrationsResult = await db
      .select({
        id: vehicles.id,
        registration_number: vehicles.vehicle_register_number,
        vehicle_category: vehicle_categories.name,
        owner_name: owners.name,
        status: vehicles.status,
        created_at: vehicles.created_at
      })
      .from(vehicles)
      .leftJoin(owners, eq(vehicles.owner_id, owners.id))
      .leftJoin(vehicle_categories, eq(vehicles.vehicle_category_id, vehicle_categories.id))
      .orderBy(desc(vehicles.created_at))
      .limit(5);

    // Monthly registrations for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const monthlyRegistrationsResult = await db
      .select({
        month: sql<string>`to_char(${vehicles.created_at}, 'YYYY-MM')`,
        count: count()
      })
      .from(vehicles)
      .where(sql`${vehicles.created_at} >= ${sixMonthsAgo}`)
      .groupBy(sql`to_char(${vehicles.created_at}, 'YYYY-MM')`)
      .orderBy(sql`to_char(${vehicles.created_at}, 'YYYY-MM')`);

    return {
      totalVehicles: totalVehiclesResult.count,
      pendingApproval: pendingApprovalResult.count,
      qrScansToday: qrScansTodayResult.count,
      activeOfficers: activeOfficersResult.count,
      totalOwners: totalOwnersResult.count,
      totalDrivers: totalDriversResult.count,
      totalConductors: totalConductorsResult.count,
      vehiclesByType: vehiclesByTypeResult,
      vehiclesByStatus: vehiclesByStatusResult,
      recentRegistrations: recentRegistrationsResult,
      monthlyRegistrations: monthlyRegistrationsResult,
      // New dynamic entity counts
      totalVehicleCategories: totalVehicleCategoriesResult.count,
      totalVehicleTypes: totalVehicleTypesResult.count,
      totalFuelTypes: totalFuelTypesResult.count,
      totalTerminals: totalTerminalsResult.count,
      totalRoutes: totalRoutesResult.count,
      totalTrackerCompanies: totalTrackerCompaniesResult.count,
    };
  }

  // Tracker Payment methods
  async createTrackerPayment(payment: InsertTrackerPayment): Promise<TrackerPayment> {
    // Convert Date objects to ISO date strings (YYYY-MM-DD)
    const installationDateStr = payment.installation_date instanceof Date 
      ? payment.installation_date.toISOString().split('T')[0] 
      : payment.installation_date;
    const paymentDateStr = payment.payment_date instanceof Date 
      ? payment.payment_date.toISOString().split('T')[0] 
      : payment.payment_date;

    // Check for duplicate: same vehicle + tracker company + payment date
    const existingPayment = await db
      .select()
      .from(tracker_payments)
      .where(
        and(
          eq(tracker_payments.vehicle_id, payment.vehicle_id),
          eq(tracker_payments.tracker_company_id, payment.tracker_company_id),
          eq(tracker_payments.payment_date, paymentDateStr),
          ne(tracker_payments.status, 'cancelled') // Don't count cancelled payments as duplicates
        )
      )
      .limit(1);

    if (existingPayment.length > 0) {
      throw new Error('A payment record already exists for this vehicle, tracker company, and payment date combination.');
    }

    const paymentData = {
      ...payment,
      installation_date: installationDateStr,
      payment_date: paymentDateStr,
      // Calculate next_payment_due_date: payment_date + payment_period_months
      next_payment_due_date: (() => {
        const paymentDate = payment.payment_date instanceof Date 
          ? payment.payment_date 
          : new Date(payment.payment_date);
        const months = payment.payment_period_months || 12;
        const dueDate = new Date(paymentDate);
        dueDate.setMonth(dueDate.getMonth() + months);
        return dueDate.toISOString().split('T')[0];
      })(),
    };
    const [result] = await db.insert(tracker_payments).values(paymentData as any).returning();
    return result;
  }

  async getTrackerPayment(id: number): Promise<TrackerPayment | undefined> {
    const [result] = await db.select().from(tracker_payments).where(eq(tracker_payments.id, id));
    return result;
  }

  async getAllTrackerPayments(filters?: {
    vehicle_id?: number;
    tracker_company_id?: number;
    vehicle_type_id?: number;
    status?: string;
    expired?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{payments: (TrackerPayment & { vehicle?: Vehicle, trackerCompany?: any })[], total: number}> {
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    let whereConditions = [];

    if (filters?.vehicle_id) {
      whereConditions.push(eq(tracker_payments.vehicle_id, filters.vehicle_id));
    }

    if (filters?.tracker_company_id) {
      whereConditions.push(eq(tracker_payments.tracker_company_id, filters.tracker_company_id));
    }

    if (filters?.vehicle_type_id) {
      whereConditions.push(eq(vehicles.vehicle_type_id, filters.vehicle_type_id));
    }

    if (filters?.status) {
      whereConditions.push(eq(tracker_payments.status, filters.status));
    }

    if (filters?.expired) {
      whereConditions.push(sql`${tracker_payments.next_payment_due_date} < CURRENT_DATE`);
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    // Count query - need to join with vehicles if vehicle_type_id filter is used
    let countQuery;
    if (filters?.vehicle_type_id) {
      countQuery = db
        .select({ count: sql<number>`count(*)::int` })
        .from(tracker_payments)
        .leftJoin(vehicles, eq(tracker_payments.vehicle_id, vehicles.id))
        .where(whereClause);
    } else {
      countQuery = db
        .select({ count: sql<number>`count(*)::int` })
        .from(tracker_payments)
        .where(whereClause);
    }

    // Main query with joins
    const paymentsQuery = db
      .select({
        payment: tracker_payments,
        vehicle: vehicles,
        trackerCompany: tracker_companies,
      })
      .from(tracker_payments)
      .leftJoin(vehicles, eq(tracker_payments.vehicle_id, vehicles.id))
      .leftJoin(tracker_companies, eq(tracker_payments.tracker_company_id, tracker_companies.id))
      .where(whereClause)
      .orderBy(desc(tracker_payments.payment_date))
      .limit(limit)
      .offset(offset);

    // Use EXPLAIN to ensure indexes are being used (in development)
    if (process.env.NODE_ENV === 'development') {
      // Log query for debugging
      console.log('Tracker payments query filters:', filters);
    }

    const [paymentsResults, totalResults] = await Promise.all([
      paymentsQuery,
      countQuery
    ]);

    const paymentsWithRelations = paymentsResults.map(result => ({
      ...result.payment,
      vehicle: result.vehicle || undefined,
      trackerCompany: result.trackerCompany || undefined,
    }));

    return {
      payments: paymentsWithRelations,
      total: totalResults[0].count
    };
  }

  async updateTrackerPayment(id: number, update: Partial<InsertTrackerPayment>): Promise<TrackerPayment> {
    // Get existing payment first
    const existingPayment = await this.getTrackerPayment(id);
    if (!existingPayment) {
      throw new Error('Payment not found');
    }

    // Convert Date objects to ISO date strings if present
    const updateData: any = { ...update, updated_at: new Date() };
    
    if (update.installation_date instanceof Date) {
      updateData.installation_date = update.installation_date.toISOString().split('T')[0];
    }
    
    const paymentDateStr = update.payment_date instanceof Date
      ? update.payment_date.toISOString().split('T')[0]
      : update.payment_date;

    // Check for duplicate if vehicle_id, tracker_company_id, or payment_date is being changed
    if (update.vehicle_id || update.tracker_company_id || update.payment_date) {
      const checkVehicleId = update.vehicle_id || existingPayment.vehicle_id;
      const checkTrackerCompanyId = update.tracker_company_id || existingPayment.tracker_company_id;
      const checkPaymentDate = paymentDateStr || existingPayment.payment_date;

      const duplicateCheck = await db
        .select()
        .from(tracker_payments)
        .where(
          and(
            eq(tracker_payments.vehicle_id, checkVehicleId),
            eq(tracker_payments.tracker_company_id, checkTrackerCompanyId),
            eq(tracker_payments.payment_date, checkPaymentDate),
            ne(tracker_payments.id, id), // Exclude current payment
            ne(tracker_payments.status, 'cancelled') // Don't count cancelled payments
          )
        )
        .limit(1);

      if (duplicateCheck.length > 0) {
        throw new Error('A payment record already exists for this vehicle, tracker company, and payment date combination.');
      }
    }

    if (update.payment_date && paymentDateStr) {
      updateData.payment_date = paymentDateStr;
      // Recalculate next_payment_due_date if payment_date or payment_period_months changed
      const months = update.payment_period_months || existingPayment.payment_period_months || 12;
      const dueDate = new Date(paymentDateStr);
      dueDate.setMonth(dueDate.getMonth() + months);
      updateData.next_payment_due_date = dueDate.toISOString().split('T')[0];
    }
    if (update.payment_period_months && !update.payment_date) {
      // Recalculate if only payment_period_months changed
      // existingPayment.payment_date is a string from the database
      const paymentDateStr = typeof existingPayment.payment_date === 'string'
        ? existingPayment.payment_date
        : String(existingPayment.payment_date);
      if (paymentDateStr) {
        const dueDate = new Date(paymentDateStr);
        dueDate.setMonth(dueDate.getMonth() + update.payment_period_months);
        updateData.next_payment_due_date = dueDate.toISOString().split('T')[0];
      }
    }
    
    const [result] = await db
      .update(tracker_payments)
      .set(updateData)
      .where(eq(tracker_payments.id, id))
      .returning();
    return result;
  }

  async deleteTrackerPayment(id: number): Promise<void> {
    await db.delete(tracker_payments).where(eq(tracker_payments.id, id));
  }

  async getExpiredPayments(): Promise<TrackerPayment[]> {
    const results = await db
      .select()
      .from(tracker_payments)
      .where(
        and(
          eq(tracker_payments.status, 'active'),
          sql`${tracker_payments.next_payment_due_date} < CURRENT_DATE`
        )
      );
    return results;
  }

  async renewTrackerPayment(paymentId: number, newPaymentDate: Date, amount?: string): Promise<TrackerPayment> {
    const existingPayment = await this.getTrackerPayment(paymentId);
    if (!existingPayment) {
      throw new Error('Payment not found');
    }

    // Create a new payment record for renewal
    // Convert dates to Date objects for the schema
    // existingPayment.installation_date is a string from the database
    const installationDate = typeof existingPayment.installation_date === 'string'
      ? new Date(existingPayment.installation_date)
      : existingPayment.installation_date;
    
    const renewalPayment: InsertTrackerPayment = {
      vehicle_id: existingPayment.vehicle_id,
      tracker_company_id: existingPayment.tracker_company_id,
      installation_date: installationDate, // Keep original installation date
      payment_date: newPaymentDate,
      amount: amount || existingPayment.amount,
      payment_period_months: existingPayment.payment_period_months,
      status: 'active',
      payment_receipt_number: null,
      notes: `Renewal of payment #${paymentId}`,
      created_by: existingPayment.created_by || null,
    };

    // Mark old payment as cancelled
    await this.updateTrackerPayment(paymentId, { status: 'cancelled' });

    // Create new payment
    return await this.createTrackerPayment(renewalPayment);
  }
}

export const storage = new DatabaseStorage();
