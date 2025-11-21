import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
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
  owners,
  drivers,
  conductors,
  vehicles,
  qr_verifications,
} from "./schema.js";

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

