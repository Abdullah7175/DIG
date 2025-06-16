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
  registration_number: text("registration_number").notNull().unique(),
  vehicle_type: text("vehicle_type").notNull(), // truck, trailer, bus, construction
  make_model: text("make_model").notNull(),
  year: integer("year").notNull(),
  engine_number: text("engine_number").notNull(),
  status: text("status").notNull().default("pending"), // pending, active, rejected, suspended
  qr_code: text("qr_code"), // Generated QR code data
  owner_id: integer("owner_id").references(() => owners.id),
  registered_by: integer("registered_by").references(() => users.id),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const owners = pgTable("owners", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  cnic: text("cnic").notNull().unique(),
  phone: text("phone").notNull(),
  email: text("email"),
  address: text("address").notNull(),
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

export type Vehicle = typeof vehicles.$inferSelect;
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;

export type VehicleDocument = typeof vehicle_documents.$inferSelect;

export type QRVerification = typeof qr_verifications.$inferSelect;
export type InsertVerification = z.infer<typeof insertVerificationSchema>;

// Extended types for API responses
export type VehicleWithOwner = Vehicle & {
  owner: Owner;
  registeredBy?: User;
  documents?: VehicleDocument[];
};
