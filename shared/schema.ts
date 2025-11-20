import { pgTable, text, serial, integer, boolean, timestamp, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  contact_number: varchar("contact_number", { length: 50 }),
  image: varchar("image", { length: 250 }),
  role: integer("role"),
  created_date: timestamp("created_date").defaultNow().notNull(),
  updated_date: timestamp("updated_date").defaultNow().notNull(),
  session_token: varchar("session_token", { length: 255 }),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id"),
  type: varchar("type", { length: 32 }).notNull(),
  entity_id: integer("entity_id").notNull(),
  message: text("message").notNull(),
  created_at: timestamp("created_at").defaultNow(),
  read: boolean("read").default(false),
});

export const vehicle_categories = pgTable("vehicle_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  status: text("status").notNull().default("active"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const vehicle_types = pgTable("vehicle_types", {
  id: serial("id").primaryKey(),
  vehicle_category_id: integer("vehicle_category_id").references(() => vehicle_categories.id).notNull(),
  name: text("name").notNull().unique(),
  description: text("description"),
  status: text("status").notNull().default("active"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const fuel_types = pgTable("fuel_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  status: text("status").notNull().default("active"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const terminals = pgTable("terminals", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  location: text("location"),
  city: text("city"),
  province: text("province"),
  status: text("status").notNull().default("active"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const routes = pgTable("routes", {
  id: serial("id").primaryKey(),
  route_number: text("route_number").notNull().unique(),
  route_name: text("route_name").notNull(),
  route_area_via: text("route_area_via"),
  terminal_id: integer("terminal_id").references(() => terminals.id),
  status: text("status").notNull().default("active"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const tracker_companies = pgTable("tracker_companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  contact_number: text("contact_number"),
  email: text("email"),
  website: text("website"),
  address: text("address"),
  status: text("status").notNull().default("active"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const owners = pgTable("owners", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  cnic: text("cnic").notNull().unique(),
  contact: text("contact").notNull(),
  address: text("address"),
  created_at: timestamp("created_at").defaultNow(),
  status: text("status").notNull().default("active"),
});

export const drivers = pgTable("drivers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  cnic: text("cnic").notNull().unique(),
  contact: text("contact").notNull(),
  driving_license_number: text("driving_license_number").notNull(),
  driving_license_category: text("driving_license_category").notNull(),
  driving_license_expiry_date: timestamp("driving_license_expiry_date").notNull(),
  created_at: timestamp("created_at").defaultNow(),
  status: text("status").notNull().default("active"),
});

export const conductors = pgTable("conductors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  cnic: text("cnic").notNull().unique(),
  contact: text("contact").notNull(),
  created_at: timestamp("created_at").defaultNow(),
  status: text("status").notNull().default("active"),
});

export const vehicles = pgTable("vehicles", {
  id: serial("id").primaryKey(),
  // Vehicle Details
  vehicle_register_number: text("vehicle_register_number").notNull().unique(),
  registration_region: text("registration_region").notNull(),
  vehicle_owner_name_on_book: text("vehicle_owner_name_on_book").notNull(),
  book_number: text("book_number").notNull(),
  engine_number: text("engine_number").notNull(),
  chassis_number: text("chassis_number").notNull(),
  make_company: text("make_company").notNull(),
  model_number: text("model_number").notNull(),
  seating_capacity: integer("seating_capacity"),
  vehicle_body_color: text("vehicle_body_color").notNull(),
  wheels: integer("wheels"),
  passenger_doors_emergency_exit: text("passenger_doors_emergency_exit"),
  
  // System fields
  status: text("status").notNull().default("pending"), // pending, active, rejected, suspended
  qr_code: text("qr_code"), // Generated QR code data
  owner_id: integer("owner_id").references(() => owners.id),
  driver_id: integer("driver_id").references(() => drivers.id),
  conductor_id: integer("conductor_id").references(() => conductors.id),
  registered_by: integer("registered_by").references(() => users.id),
  
  // New foreign key fields
  vehicle_category_id: integer("vehicle_category_id").references(() => vehicle_categories.id).notNull(),
  vehicle_type_id: integer("vehicle_type_id").references(() => vehicle_types.id).notNull(),
  fuel_type_id: integer("fuel_type_id").references(() => fuel_types.id).notNull(),
  terminal_id: integer("terminal_id").references(() => terminals.id),
  route_id: integer("route_id").references(() => routes.id),
  tracker_company_id: integer("tracker_company_id").references(() => tracker_companies.id),
  tracker_link: text("tracker_link"),
  
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const vehicle_documents = pgTable("vehicle_documents", {
  id: serial("id").primaryKey(),
  vehicle_id: integer("vehicle_id").references(() => vehicles.id),
  document_type: text("document_type").notNull(), // registration_book, cnic_copy
  file_path: text("file_path").notNull(),
  uploaded_at: timestamp("uploaded_at").defaultNow(),
});

export const qr_verifications = pgTable("qr_verifications", {
  id: serial("id").primaryKey(),
  vehicle_id: integer("vehicle_id").references(() => vehicles.id),
  verified_by: integer("verified_by").references(() => users.id),
  verification_result: text("verification_result").notNull(), // success, failed
  location: text("location"),
  verified_at: timestamp("verified_at").defaultNow(),
});


// Relations
export const vehicleCategoryRelations = relations(vehicle_categories, ({ many }) => ({
  vehicleTypes: many(vehicle_types),
  vehicles: many(vehicles),
}));

export const vehicleTypeRelations = relations(vehicle_types, ({ one, many }) => ({
  vehicleCategory: one(vehicle_categories, {
    fields: [vehicle_types.vehicle_category_id],
    references: [vehicle_categories.id],
  }),
  vehicles: many(vehicles),
}));

export const fuelTypeRelations = relations(fuel_types, ({ many }) => ({
  vehicles: many(vehicles),
}));

export const terminalRelations = relations(terminals, ({ many }) => ({
  routes: many(routes),
  vehicles: many(vehicles),
}));

export const routeRelations = relations(routes, ({ one, many }) => ({
  terminal: one(terminals, {
    fields: [routes.terminal_id],
    references: [terminals.id],
  }),
  vehicles: many(vehicles),
}));

export const trackerCompanyRelations = relations(tracker_companies, ({ many }) => ({
  vehicles: many(vehicles),
}));

export const vehicleRelations = relations(vehicles, ({ one, many }) => ({
  owner: one(owners, {
    fields: [vehicles.owner_id],
    references: [owners.id],
  }),
  driver: one(drivers, {
    fields: [vehicles.driver_id],
    references: [drivers.id],
  }),
  conductor: one(conductors, {
    fields: [vehicles.conductor_id],
    references: [conductors.id],
  }),
  registeredBy: one(users, {
    fields: [vehicles.registered_by],
    references: [users.id],
  }),
  vehicleCategory: one(vehicle_categories, {
    fields: [vehicles.vehicle_category_id],
    references: [vehicle_categories.id],
  }),
  vehicleType: one(vehicle_types, {
    fields: [vehicles.vehicle_type_id],
    references: [vehicle_types.id],
  }),
  fuelType: one(fuel_types, {
    fields: [vehicles.fuel_type_id],
    references: [fuel_types.id],
  }),
  terminal: one(terminals, {
    fields: [vehicles.terminal_id],
    references: [terminals.id],
  }),
  route: one(routes, {
    fields: [vehicles.route_id],
    references: [routes.id],
  }),
  trackerCompany: one(tracker_companies, {
    fields: [vehicles.tracker_company_id],
    references: [tracker_companies.id],
  }),
  documents: many(vehicle_documents),
  verifications: many(qr_verifications),
}));

export const ownerRelations = relations(owners, ({ many }) => ({
  vehicles: many(vehicles),
}));

export const driverRelations = relations(drivers, ({ many }) => ({
  vehicles: many(vehicles),
}));

export const conductorRelations = relations(conductors, ({ many }) => ({
  vehicles: many(vehicles),
}));

export const userRelations = relations(users, ({ many }) => ({
  registeredVehicles: many(vehicles),
  verifications: many(qr_verifications),
  notifications: many(notifications),
}));

export const notificationRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.user_id],
    references: [users.id],
  }),
}));

export const documentRelations = relations(vehicle_documents, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [vehicle_documents.vehicle_id],
    references: [vehicles.id],
  }),
}));

export const verificationRelations = relations(qr_verifications, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [qr_verifications.vehicle_id],
    references: [vehicles.id],
  }),
  verifiedBy: one(users, {
    fields: [qr_verifications.verified_by],
    references: [users.id],
  }),
}));

// Schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, created_date: true, updated_date: true, session_token: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, created_at: true });

// Vehicle-related schemas
export const insertVehicleCategorySchema = createInsertSchema(vehicle_categories).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertVehicleTypeSchema = createInsertSchema(vehicle_types).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertFuelTypeSchema = createInsertSchema(fuel_types).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertTerminalSchema = createInsertSchema(terminals).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertRouteSchema = createInsertSchema(routes).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertTrackerCompanySchema = createInsertSchema(tracker_companies).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertOwnerSchema = createInsertSchema(owners).omit({
  id: true,
  created_at: true,
});

export const insertDriverSchema = createInsertSchema(drivers).omit({
  id: true,
  created_at: true,
}).extend({
  driving_license_expiry_date: z.preprocess(
    (val) => typeof val === 'string' ? new Date(val) : val,
    z.date()
  ),
});

export const insertConductorSchema = createInsertSchema(conductors).omit({
  id: true,
  created_at: true,
});

export const insertVehicleSchema = createInsertSchema(vehicles).omit({
  id: true,
  created_at: true,
  updated_at: true,
  qr_code: true,
});

// Custom schema for vehicle registration with new dynamic fields
export const vehicleRegistrationSchema = z.object({
  // Required fields
  vehicle_register_number: z.string().min(1),
  registration_region: z.string().min(1),
  vehicle_owner_name_on_book: z.string().min(1),
  book_number: z.string().min(1),
  engine_number: z.string().min(1),
  chassis_number: z.string().min(1),
  make_company: z.string().min(1),
  model_number: z.string().min(1),
  vehicle_body_color: z.string().min(1),
  
  // New required dynamic fields
  vehicle_category_id: z.number().min(1),
  vehicle_type_id: z.number().min(1),
  fuel_type_id: z.number().min(1),
  
  // Optional fields
  seating_capacity: z.number().nullable().optional(),
  wheels: z.number().nullable().optional(),
  passenger_doors_emergency_exit: z.string().nullable().optional(),
  terminal_id: z.number().nullable().optional(),
  route_id: z.number().nullable().optional(),
  tracker_company_id: z.number().nullable().optional(),
  tracker_link: z.string().nullable().optional(),
  
  // Foreign keys
  owner_id: z.number().nullable().optional(),
  driver_id: z.number().nullable().optional(),
  conductor_id: z.number().nullable().optional(),
  registered_by: z.number().nullable().optional(),
  status: z.string().nullable().optional(),
});

export const insertVerificationSchema = createInsertSchema(qr_verifications).omit({
  id: true,
  verified_at: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type VehicleCategory = typeof vehicle_categories.$inferSelect;
export type InsertVehicleCategory = z.infer<typeof insertVehicleCategorySchema>;

export type VehicleType = typeof vehicle_types.$inferSelect;
export type InsertVehicleType = z.infer<typeof insertVehicleTypeSchema>;

export type FuelType = typeof fuel_types.$inferSelect;
export type InsertFuelType = z.infer<typeof insertFuelTypeSchema>;

export type Terminal = typeof terminals.$inferSelect;
export type InsertTerminal = z.infer<typeof insertTerminalSchema>;

export type Route = typeof routes.$inferSelect;
export type InsertRoute = z.infer<typeof insertRouteSchema>;

export type TrackerCompany = typeof tracker_companies.$inferSelect;
export type InsertTrackerCompany = z.infer<typeof insertTrackerCompanySchema>;

export type Owner = typeof owners.$inferSelect;
export type InsertOwner = z.infer<typeof insertOwnerSchema>;

export type Driver = typeof drivers.$inferSelect;
export type InsertDriver = z.infer<typeof insertDriverSchema>;

export type Conductor = typeof conductors.$inferSelect;
export type InsertConductor = z.infer<typeof insertConductorSchema>;

export type Vehicle = typeof vehicles.$inferSelect;
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;

export type VehicleDocument = typeof vehicle_documents.$inferSelect;

export type QRVerification = typeof qr_verifications.$inferSelect;
export type InsertVerification = z.infer<typeof insertVerificationSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

// Extended types for API responses
export type VehicleWithOwner = Vehicle & {
  owner: Owner;
  driver?: Driver;
  conductor?: Conductor;
  registeredBy?: User;
  vehicleCategory?: VehicleCategory;
  vehicleType?: VehicleType;
  fuelType?: FuelType;
  terminal?: Terminal;
  route?: Route;
  trackerCompany?: TrackerCompany;
  documents?: VehicleDocument[];
};

export type VehicleTypeWithCategory = VehicleType & {
  vehicleCategory: VehicleCategory;
};

export type RouteWithTerminal = Route & {
  terminal: Terminal;
};
