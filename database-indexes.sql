-- Database Indexes for Performance Optimization
-- Run this script on your PostgreSQL database to improve query performance

-- Indexes for vehicles table (most queried table)
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_created_at ON vehicles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vehicles_vehicle_category_id ON vehicles(vehicle_category_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_owner_id ON vehicles(owner_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_driver_id ON vehicles(driver_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_registered_by ON vehicles(registered_by);

-- Composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_vehicles_status_category ON vehicles(status, vehicle_category_id);

-- Indexes for search optimization (text search)
CREATE INDEX IF NOT EXISTS idx_vehicles_register_number ON vehicles(vehicle_register_number);
CREATE INDEX IF NOT EXISTS idx_vehicles_traccar_unique_id ON vehicles(traccar_unique_id);

-- Indexes for owners table (for search joins)
CREATE INDEX IF NOT EXISTS idx_owners_name ON owners(name);
CREATE INDEX IF NOT EXISTS idx_owners_cnic ON owners(cnic);
CREATE INDEX IF NOT EXISTS idx_owners_contact ON owners(contact);

-- Indexes for vehicle_categories (for type filtering)
CREATE INDEX IF NOT EXISTS idx_vehicle_categories_name ON vehicle_categories(name);

-- Indexes for foreign key lookups
CREATE INDEX IF NOT EXISTS idx_vehicles_conductor_id ON vehicles(conductor_id);

-- Indexes for users table (login performance)
-- Note: email already has unique index from schema, but ensure it exists
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Analyze tables to update statistics
ANALYZE vehicles;
ANALYZE owners;
ANALYZE vehicle_categories;
ANALYZE users;

