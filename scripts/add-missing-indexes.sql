-- Add missing performance indexes based on query patterns
-- Run this after removing Traccar tables

-- Vehicles table indexes for search and filtering
-- Status is frequently filtered
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status) WHERE status IS NOT NULL;

-- Owner ID is frequently joined
CREATE INDEX IF NOT EXISTS idx_vehicles_owner_id ON vehicles(owner_id) WHERE owner_id IS NOT NULL;

-- Driver ID is frequently joined
CREATE INDEX IF NOT EXISTS idx_vehicles_driver_id ON vehicles(driver_id) WHERE driver_id IS NOT NULL;

-- Conductor ID is frequently joined
CREATE INDEX IF NOT EXISTS idx_vehicles_conductor_id ON vehicles(conductor_id) WHERE conductor_id IS NOT NULL;

-- Registration number is frequently searched (already has UNIQUE constraint, but add index for case-insensitive searches)
-- Note: UNIQUE constraint already creates an index, but we can add a functional index for case-insensitive searches
CREATE INDEX IF NOT EXISTS idx_vehicles_registration_lower ON vehicles(LOWER(vehicle_register_number));

-- Engine and chassis numbers are frequently searched
CREATE INDEX IF NOT EXISTS idx_vehicles_engine_number ON vehicles(engine_number) WHERE engine_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_chassis_number ON vehicles(chassis_number) WHERE chassis_number IS NOT NULL;

-- Owner name on book is frequently searched
CREATE INDEX IF NOT EXISTS idx_vehicles_owner_name_lower ON vehicles(LOWER(vehicle_owner_name_on_book));

-- Created at for sorting recent vehicles
CREATE INDEX IF NOT EXISTS idx_vehicles_created_at ON vehicles(created_at DESC);

-- Composite index for common filter combinations (status + category)
CREATE INDEX IF NOT EXISTS idx_vehicles_status_category ON vehicles(status, vehicle_category_id) WHERE status IS NOT NULL AND vehicle_category_id IS NOT NULL;

-- Owners table indexes
-- Name is frequently searched
CREATE INDEX IF NOT EXISTS idx_owners_name_lower ON owners(LOWER(name));
-- CNIC already has UNIQUE constraint (creates index automatically)
-- Contact is frequently searched
CREATE INDEX IF NOT EXISTS idx_owners_contact ON owners(contact) WHERE contact IS NOT NULL;
-- Status is frequently filtered
CREATE INDEX IF NOT EXISTS idx_owners_status ON owners(status) WHERE status IS NOT NULL;

-- Drivers table indexes
-- Name is frequently searched
CREATE INDEX IF NOT EXISTS idx_drivers_name_lower ON drivers(LOWER(name));
-- CNIC already has UNIQUE constraint (creates index automatically)
-- Contact is frequently searched
CREATE INDEX IF NOT EXISTS idx_drivers_contact ON drivers(contact) WHERE contact IS NOT NULL;
-- Status is frequently filtered
CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers(status) WHERE status IS NOT NULL;
-- License number is frequently searched
CREATE INDEX IF NOT EXISTS idx_drivers_license_number ON drivers(driving_license_number) WHERE driving_license_number IS NOT NULL;

-- Conductors table indexes
-- Name is frequently searched
CREATE INDEX IF NOT EXISTS idx_conductors_name_lower ON conductors(LOWER(name));
-- CNIC already has UNIQUE constraint (creates index automatically)
-- Contact is frequently searched
CREATE INDEX IF NOT EXISTS idx_conductors_contact ON conductors(contact) WHERE contact IS NOT NULL;
-- Status is frequently filtered
CREATE INDEX IF NOT EXISTS idx_conductors_status ON conductors(status) WHERE status IS NOT NULL;

-- QR Verifications table indexes
-- Vehicle ID is frequently joined
CREATE INDEX IF NOT EXISTS idx_qr_verifications_vehicle_id ON qr_verifications(vehicle_id) WHERE vehicle_id IS NOT NULL;
-- Verified at for sorting recent verifications
CREATE INDEX IF NOT EXISTS idx_qr_verifications_verified_at ON qr_verifications(verified_at DESC);

-- Vehicle Documents table indexes
-- Vehicle ID is frequently joined
CREATE INDEX IF NOT EXISTS idx_vehicle_documents_vehicle_id ON vehicle_documents(vehicle_id) WHERE vehicle_id IS NOT NULL;
-- Document type is frequently filtered
CREATE INDEX IF NOT EXISTS idx_vehicle_documents_type ON vehicle_documents(document_type) WHERE document_type IS NOT NULL;
-- Composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_vehicle_documents_vehicle_type ON vehicle_documents(vehicle_id, document_type);

-- Notifications table indexes (already has some, but verify)
-- User ID + read status is frequently queried together (already exists: idx_notifications_read)
-- Created at for sorting
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Analyze tables to update statistics
ANALYZE vehicles;
ANALYZE owners;
ANALYZE drivers;
ANALYZE conductors;
ANALYZE qr_verifications;
ANALYZE vehicle_documents;
ANALYZE notifications;

