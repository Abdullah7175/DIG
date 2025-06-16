import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("officer"), // officer, admin
  created_at: timestamp("created_at").defaultNow(),
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
  vehicle_category: text("vehicle_category").notNull(),
  vehicle_body_color: text("vehicle_body_color").notNull(),
  wheels: integer("wheels"),
  passenger_doors_emergency_exit: text("passenger_doors_emergency_exit"),
  fuel_type: text("fuel_type").notNull(),
  terminal_name: text("terminal_name"),
  route_number: text("route_number"),
  route_name: text("route_name"),
  route_area_via: text("route_area_via"),
  
  // System fields
  status: text("status").notNull().default("pending"), // pending, active, rejected, suspended
  qr_code: text("qr_code"), // Generated QR code data
  owner_id: integer("owner_id").references(() => owners.id),
  driver_id: integer("driver_id").references(() => drivers.id),
  conductor_id: integer("conductor_id").references(() => conductors.id),
  registered_by: integer("registered_by").references(() => users.id),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const owners = pgTable("owners", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  cnic: text("cnic").notNull().unique(),
  contact: text("contact").notNull(),
  created_at: timestamp("created_at").defaultNow(),
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
});

export const conductors = pgTable("conductors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  cnic: text("cnic").notNull().unique(),
  contact: text("contact").notNull(),
  created_at: timestamp("created_at").defaultNow(),
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
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  created_at: true,
});

export const insertOwnerSchema = createInsertSchema(owners).omit({
  id: true,
  created_at: true,
});

export const insertDriverSchema = createInsertSchema(drivers).omit({
  id: true,
  created_at: true,
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

export const insertVerificationSchema = createInsertSchema(qr_verifications).omit({
  id: true,
  verified_at: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

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

// Extended types for API responses
export type VehicleWithOwner = Vehicle & {
  owner: Owner;
  driver?: Driver;
  conductor?: Conductor;
  registeredBy?: User;
  documents?: VehicleDocument[];
};
