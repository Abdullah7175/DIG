import { pgTable, text, serial, integer, boolean, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

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
  
  // Tracking fields
  traccar_device_id: integer("traccar_device_id"),
  traccar_unique_id: text("traccar_unique_id"),
  last_position_update: timestamp("last_position_update"),
  current_status: text("current_status").default("unknown"),
  last_latitude: text("last_latitude"),
  last_longitude: text("last_longitude"),
  last_speed: text("last_speed"),
  last_course: text("last_course"),
  tracking_enabled: boolean("tracking_enabled").default(false),
  
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

// Tracking tables
export const tracking_positions = pgTable("tracking_positions", {
  id: serial("id").primaryKey(),
  vehicle_id: integer("vehicle_id").references(() => vehicles.id, { onDelete: "cascade" }),
  traccar_position_id: integer("traccar_position_id"),
  fix_time: timestamp("fix_time").notNull(),
  latitude: text("latitude").notNull(),
  longitude: text("longitude").notNull(),
  speed: text("speed"),
  course: text("course"),
  accuracy: text("accuracy"),
  valid: boolean("valid").default(true),
  attributes: text("attributes"), // JSON string
  created_at: timestamp("created_at").defaultNow(),
});

export const tracking_events = pgTable("tracking_events", {
  id: serial("id").primaryKey(),
  vehicle_id: integer("vehicle_id").references(() => vehicles.id, { onDelete: "cascade" }),
  traccar_event_id: integer("traccar_event_id"),
  event_type: varchar("event_type", { length: 100 }).notNull(),
  event_time: timestamp("event_time").notNull(),
  latitude: text("latitude"),
  longitude: text("longitude"),
  speed: text("speed"),
  course: text("course"),
  attributes: text("attributes"), // JSON string
  processed: boolean("processed").default(false),
  created_at: timestamp("created_at").defaultNow(),
});

export const geofences = pgTable("geofences", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  geometry_type: varchar("geometry_type", { length: 50 }).notNull(), // 'circle', 'polygon', 'polyline'
  coordinates: text("coordinates").notNull(), // JSON string
  radius: text("radius"), // For circle geofences
  color: varchar("color", { length: 7 }).default("#FF0000"),
  status: varchar("status", { length: 50 }).default("active"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const vehicle_geofences = pgTable("vehicle_geofences", {
  id: serial("id").primaryKey(),
  vehicle_id: integer("vehicle_id").references(() => vehicles.id, { onDelete: "cascade" }),
  geofence_id: integer("geofence_id").references(() => geofences.id, { onDelete: "cascade" }),
  created_at: timestamp("created_at").defaultNow(),
});

export const tracking_reports = pgTable("tracking_reports", {
  id: serial("id").primaryKey(),
  vehicle_id: integer("vehicle_id").references(() => vehicles.id, { onDelete: "cascade" }),
  report_type: varchar("report_type", { length: 50 }).notNull(), // 'trip', 'stop', 'summary', 'route'
  start_time: timestamp("start_time").notNull(),
  end_time: timestamp("end_time").notNull(),
  distance: text("distance"),
  duration: integer("duration"), // in seconds
  max_speed: text("max_speed"),
  avg_speed: text("avg_speed"),
  fuel_consumption: text("fuel_consumption"),
  report_data: text("report_data"), // JSON string
  generated_at: timestamp("generated_at").defaultNow(),
});

export const tracking_alerts = pgTable("tracking_alerts", {
  id: serial("id").primaryKey(),
  vehicle_id: integer("vehicle_id").references(() => vehicles.id, { onDelete: "cascade" }),
  alert_type: varchar("alert_type", { length: 100 }).notNull(),
  alert_message: text("alert_message").notNull(),
  severity: varchar("severity", { length: 20 }).default("medium"), // 'low', 'medium', 'high', 'critical'
  latitude: text("latitude"),
  longitude: text("longitude"),
  speed: text("speed"),
  course: text("course"),
  acknowledged: boolean("acknowledged").default(false),
  acknowledged_by: integer("acknowledged_by").references(() => users.id),
  acknowledged_at: timestamp("acknowledged_at"),
  created_at: timestamp("created_at").defaultNow(),
});

export const tracking_settings = pgTable("tracking_settings", {
  id: serial("id").primaryKey(),
  vehicle_id: integer("vehicle_id").references(() => vehicles.id, { onDelete: "cascade" }),
  overspeed_limit: text("overspeed_limit"),
  idle_timeout: integer("idle_timeout"), // in minutes
  motion_threshold: text("motion_threshold"), // in km/h
  geofence_alerts: boolean("geofence_alerts").default(true),
  overspeed_alerts: boolean("overspeed_alerts").default(true),
  maintenance_alerts: boolean("maintenance_alerts").default(true),
  fuel_alerts: boolean("fuel_alerts").default(false),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const tracking_sessions = pgTable("tracking_sessions", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  session_token: varchar("session_token", { length: 255 }).notNull(),
  connected_vehicles: text("connected_vehicles"), // JSON array
  last_activity: timestamp("last_activity").defaultNow(),
  created_at: timestamp("created_at").defaultNow(),
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
  // Tracking relations
  trackingPositions: many(tracking_positions),
  trackingEvents: many(tracking_events),
  vehicleGeofences: many(vehicle_geofences),
  trackingReports: many(tracking_reports),
  trackingAlerts: many(tracking_alerts),
  trackingSettings: one(tracking_settings, {
    fields: [vehicles.id],
    references: [tracking_settings.vehicle_id],
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

// Tracking relations
export const trackingPositionRelations = relations(tracking_positions, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [tracking_positions.vehicle_id],
    references: [vehicles.id],
  }),
}));

export const trackingEventRelations = relations(tracking_events, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [tracking_events.vehicle_id],
    references: [vehicles.id],
  }),
}));

export const geofenceRelations = relations(geofences, ({ many }) => ({
  vehicleGeofences: many(vehicle_geofences),
}));

export const vehicleGeofenceRelations = relations(vehicle_geofences, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [vehicle_geofences.vehicle_id],
    references: [vehicles.id],
  }),
  geofence: one(geofences, {
    fields: [vehicle_geofences.geofence_id],
    references: [geofences.id],
  }),
}));

export const trackingReportRelations = relations(tracking_reports, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [tracking_reports.vehicle_id],
    references: [vehicles.id],
  }),
}));

export const trackingAlertRelations = relations(tracking_alerts, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [tracking_alerts.vehicle_id],
    references: [vehicles.id],
  }),
  acknowledgedBy: one(users, {
    fields: [tracking_alerts.acknowledged_by],
    references: [users.id],
  }),
}));

export const trackingSettingsRelations = relations(tracking_settings, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [tracking_settings.vehicle_id],
    references: [vehicles.id],
  }),
}));

export const trackingSessionRelations = relations(tracking_sessions, ({ one }) => ({
  user: one(users, {
    fields: [tracking_sessions.user_id],
    references: [users.id],
  }),
}));

// Schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, created_date: true, updated_date: true, session_token: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, created_at: true });

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

// Tracking types
export type TrackingPosition = typeof tracking_positions.$inferSelect;
export type TrackingEvent = typeof tracking_events.$inferSelect;
export type Geofence = typeof geofences.$inferSelect;
export type VehicleGeofence = typeof vehicle_geofences.$inferSelect;
export type TrackingReport = typeof tracking_reports.$inferSelect;
export type TrackingAlert = typeof tracking_alerts.$inferSelect;
export type TrackingSettings = typeof tracking_settings.$inferSelect;
export type TrackingSession = typeof tracking_sessions.$inferSelect;

// Extended vehicle type with tracking data
export type VehicleWithTracking = VehicleWithOwner & {
  trackingPositions?: TrackingPosition[];
  trackingEvents?: TrackingEvent[];
  vehicleGeofences?: VehicleGeofence[];
  trackingReports?: TrackingReport[];
  trackingAlerts?: TrackingAlert[];
  trackingSettings?: TrackingSettings;
};
