import { pgTable, text, serial, integer, boolean, timestamp, varchar, date, numeric, unique, jsonb } from "drizzle-orm/pg-core";
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
  tracker_company_id: integer("tracker_company_id").references(() => tracker_companies.id, { onDelete: "set null" }),
  created_date: timestamp("created_date").defaultNow().notNull(),
  updated_date: timestamp("updated_date").defaultNow().notNull(),
  session_token: varchar("session_token", { length: 255 }),
  is_blocked: boolean("is_blocked").default(false).notNull(),
  blocked_at: timestamp("blocked_at"),
  blocked_by: integer("blocked_by"),
  blocked_reason: text("blocked_reason"),
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
  vehicle_register_number: text("vehicle_register_number").notNull(),
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
  affiliated_with: text("affiliated_with"),
  
  // System fields
  status: text("status").notNull().default("active"), // pending, active, rejected, suspended
  qr_code: text("qr_code"), // Generated QR code data
  owner_id: integer("owner_id").references(() => owners.id),
  driver_id: integer("driver_id").references(() => drivers.id),
  conductor_id: integer("conductor_id").references(() => conductors.id),
  registered_by: integer("registered_by").references(() => users.id),
  
  // New foreign key fields
  vehicle_category_id: integer("vehicle_category_id").references(() => vehicle_categories.id).notNull(),
  vehicle_type_id: integer("vehicle_type_id").references(() => vehicle_types.id).notNull(),
  fuel_type_id: integer("fuel_type_id").references(() => fuel_types.id),
  terminal_id: integer("terminal_id").references(() => terminals.id),
  route_id: integer("route_id").references(() => routes.id),
  tracker_company_id: integer("tracker_company_id").references(() => tracker_companies.id),
  tracker_link: text("tracker_link"),
  
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Composite unique constraint: same registration number allowed in different regions
  registrationRegionUnique: unique().on(table.vehicle_register_number, table.registration_region),
}));

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

export const tracker_payments = pgTable("tracker_payments", {
  id: serial("id").primaryKey(),
  vehicle_id: integer("vehicle_id").references(() => vehicles.id, { onDelete: "cascade" }).notNull(),
  tracker_company_id: integer("tracker_company_id").references(() => tracker_companies.id).notNull(),
  installation_date: date("installation_date").notNull(),
  payment_date: date("payment_date").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }),
  payment_period_months: integer("payment_period_months").notNull().default(12),
  next_payment_due_date: date("next_payment_due_date").notNull(),
  status: text("status").notNull().default("active"), // active, expired, pending, cancelled
  payment_receipt_number: text("payment_receipt_number"),
  notes: text("notes"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
  created_by: integer("created_by").references(() => users.id),
});

export const login_attempts = pgTable("login_attempts", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 255 }).notNull(),
  ip_address: varchar("ip_address", { length: 45 }).notNull(),
  attempt_count: integer("attempt_count").notNull().default(1),
  last_attempt_at: timestamp("last_attempt_at").defaultNow().notNull(),
  blocked_until: timestamp("blocked_until"),
  is_blocked: boolean("is_blocked").notNull().default(false),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const user_activity_logs = pgTable("user_activity_logs", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  action_type: varchar("action_type", { length: 100 }).notNull(),
  action_description: text("action_description").notNull(),
  ip_address: varchar("ip_address", { length: 45 }).notNull(),
  user_agent: text("user_agent"),
  request_method: varchar("request_method", { length: 10 }),
  request_path: text("request_path"),
  request_body: text("request_body"), // Stored as JSON string, will be parsed when needed
  response_status: integer("response_status"),
  success: boolean("success").notNull().default(true),
  error_message: text("error_message"),
  metadata: text("metadata"), // Stored as JSON string
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const tracking_events = pgTable("tracking_events", {
  id: serial("id").primaryKey(),
  event_desc: varchar("event_desc", { length: 50 }).notNull(), // OverSpeed, etc.
  name: varchar("name", { length: 50 }).notNull(), // Vehicle name like GLTA-2296
  dt_tracker: timestamp("dt_tracker").notNull(), // Tracker timestamp
  dt_server: timestamp("dt_server").notNull(), // Server timestamp
  lat: numeric("lat", { precision: 10, scale: 6 }).notNull(), // Latitude with 6 decimal precision
  lng: numeric("lng", { precision: 10, scale: 6 }).notNull(), // Longitude with 6 decimal precision
  speed: integer("speed").notNull(), // Speed in km/h
  tracker_company_id: integer("tracker_company_id").references(() => tracker_companies.id, { onDelete: "set null" }), // Which tracker company provided this event
  created_at: timestamp("created_at").defaultNow().notNull(), // When record was inserted
  updated_at: timestamp("updated_at").defaultNow().notNull(), // When record was last updated
});

export const tracking_api_configs = pgTable("tracking_api_configs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // Friendly name for the API
  tracker_company_id: integer("tracker_company_id").references(() => tracker_companies.id, { onDelete: "restrict" }).notNull(), // Link to tracker company
  api_url: text("api_url").notNull(), // Base URL of the API endpoint
  api_key: text("api_key").notNull(), // API key/authentication token
  api_type: text("api_type").notNull().default("esspl"), // Type: esspl, custom, standard
  api_params: jsonb("api_params").default({}), // JSON object for additional parameters (stored as JSONB in database)
  url_template: text("url_template"), // Optional custom URL template
  status: text("status").notNull().default("active"), // active, inactive, testing
  auto_sync: boolean("auto_sync").notNull().default(true), // Whether to auto sync
  sync_interval_minutes: integer("sync_interval_minutes").default(15), // Sync interval in minutes
  last_sync_at: timestamp("last_sync_at"), // Last sync attempt
  last_successful_sync_at: timestamp("last_successful_sync_at"), // Last successful sync
  last_sync_status: text("last_sync_status"), // success, failed, error
  last_sync_error: text("last_sync_error"), // Error message
  last_health_check_at: timestamp("last_health_check_at"), // Last health check
  is_healthy: boolean("is_healthy").default(true), // API health status
  consecutive_failures: integer("consecutive_failures").default(0), // Consecutive failure count
  description: text("description"), // Description/notes
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  created_by: integer("created_by").references(() => users.id, { onDelete: "set null" }), // User who created this
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
  trackerPayments: many(tracker_payments),
  trackingEvents: many(tracking_events),
  apiConfigs: many(tracking_api_configs),
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
  trackerPayments: many(tracker_payments),
}));

export const trackerPaymentRelations = relations(tracker_payments, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [tracker_payments.vehicle_id],
    references: [vehicles.id],
  }),
  trackerCompany: one(tracker_companies, {
    fields: [tracker_payments.tracker_company_id],
    references: [tracker_companies.id],
  }),
  createdBy: one(users, {
    fields: [tracker_payments.created_by],
    references: [users.id],
  }),
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

export const userRelations = relations(users, ({ one, many }) => ({
  registeredVehicles: many(vehicles),
  verifications: many(qr_verifications),
  notifications: many(notifications),
  loginAttempts: many(login_attempts),
  activityLogs: many(user_activity_logs),
  blockedBy: one(users, {
    fields: [users.blocked_by],
    references: [users.id],
    relationName: "blockedBy",
  }),
  blockedUsers: many(users, {
    relationName: "blockedBy",
  }),
  trackerCompany: one(tracker_companies, {
    fields: [users.tracker_company_id],
    references: [tracker_companies.id],
  }),
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

export const loginAttemptRelations = relations(login_attempts, ({ one }) => ({
  user: one(users, {
    fields: [login_attempts.user_id],
    references: [users.id],
  }),
}));

export const userActivityLogRelations = relations(user_activity_logs, ({ one }) => ({
  user: one(users, {
    fields: [user_activity_logs.user_id],
    references: [users.id],
  }),
}));

export const trackingEventRelations = relations(tracking_events, ({ one }) => ({
  trackerCompany: one(tracker_companies, {
    fields: [tracking_events.tracker_company_id],
    references: [tracker_companies.id],
  }),
}));

export const trackingApiConfigRelations = relations(tracking_api_configs, ({ one }) => ({
  trackerCompany: one(tracker_companies, {
    fields: [tracking_api_configs.tracker_company_id],
    references: [tracker_companies.id],
  }),
  createdBy: one(users, {
    fields: [tracking_api_configs.created_by],
    references: [users.id],
  }),
}));

// Schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, created_date: true, updated_date: true, session_token: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, created_at: true });

export const insertLoginAttemptSchema = createInsertSchema(login_attempts).omit({ id: true, created_at: true, updated_at: true });
export const insertUserActivityLogSchema = createInsertSchema(user_activity_logs).omit({ id: true, created_at: true });
export const insertTrackingEventSchema = createInsertSchema(tracking_events).omit({ id: true, created_at: true, updated_at: true });
export const insertTrackingApiConfigSchema = createInsertSchema(tracking_api_configs).omit({ id: true, created_at: true, updated_at: true });

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

export const insertTrackerPaymentSchema = createInsertSchema(tracker_payments).omit({
  id: true,
  created_at: true,
  updated_at: true,
  next_payment_due_date: true, // Will be calculated by trigger
}).extend({
  installation_date: z.preprocess(
    (val) => typeof val === 'string' ? new Date(val) : val,
    z.date()
  ),
  payment_date: z.preprocess(
    (val) => typeof val === 'string' ? new Date(val) : val,
    z.date()
  ),
  amount: z.string().nullable().optional().transform((val) => val ? val : null),
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
  affiliated_with: z.string().nullable().optional(),
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

export type TrackerPayment = typeof tracker_payments.$inferSelect;
export type InsertTrackerPayment = z.infer<typeof insertTrackerPaymentSchema>;

export type Vehicle = typeof vehicles.$inferSelect;
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;

export type VehicleDocument = typeof vehicle_documents.$inferSelect;

export type QRVerification = typeof qr_verifications.$inferSelect;
export type InsertVerification = z.infer<typeof insertVerificationSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type LoginAttempt = typeof login_attempts.$inferSelect;
export type InsertLoginAttempt = z.infer<typeof insertLoginAttemptSchema>;

export type UserActivityLog = typeof user_activity_logs.$inferSelect;
export type InsertUserActivityLog = z.infer<typeof insertUserActivityLogSchema>;

export type TrackingEvent = typeof tracking_events.$inferSelect;
export type InsertTrackingEvent = z.infer<typeof insertTrackingEventSchema>;
export type TrackingApiConfig = typeof tracking_api_configs.$inferSelect;
export type InsertTrackingApiConfig = z.infer<typeof insertTrackingApiConfigSchema>;

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
