-- Performance indexes for vehicles table and related queries
-- Run this script to improve query performance for /api/vehicles endpoint

-- Index on created_at for ordering (most important for pagination)
CREATE INDEX IF NOT EXISTS idx_vehicles_created_at ON vehicles(created_at DESC);

-- Index on status for filtering
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);

-- Indexes on foreign keys for faster joins
CREATE INDEX IF NOT EXISTS idx_vehicles_owner_id ON vehicles(owner_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_driver_id ON vehicles(driver_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_conductor_id ON vehicles(conductor_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_registered_by ON vehicles(registered_by);
CREATE INDEX IF NOT EXISTS idx_vehicles_vehicle_category_id ON vehicles(vehicle_category_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_vehicle_type_id ON vehicles(vehicle_type_id);

-- Indexes on searchable text fields (using lower() for case-insensitive search)
CREATE INDEX IF NOT EXISTS idx_vehicles_register_number_lower ON vehicles(LOWER(vehicle_register_number));
CREATE INDEX IF NOT EXISTS idx_vehicles_engine_number_lower ON vehicles(LOWER(engine_number));
CREATE INDEX IF NOT EXISTS idx_vehicles_chassis_number_lower ON vehicles(LOWER(chassis_number));
CREATE INDEX IF NOT EXISTS idx_vehicles_owner_name_lower ON vehicles(LOWER(vehicle_owner_name_on_book));
CREATE INDEX IF NOT EXISTS idx_vehicles_make_company_lower ON vehicles(LOWER(make_company));
CREATE INDEX IF NOT EXISTS idx_vehicles_model_number_lower ON vehicles(LOWER(model_number));

-- Index on vehicle_categories name for type filtering
CREATE INDEX IF NOT EXISTS idx_vehicle_categories_name ON vehicle_categories(name);

-- Indexes on owners table for search
CREATE INDEX IF NOT EXISTS idx_owners_name_lower ON owners(LOWER(name));
CREATE INDEX IF NOT EXISTS idx_owners_cnic_lower ON owners(LOWER(cnic));
CREATE INDEX IF NOT EXISTS idx_owners_contact_lower ON owners(LOWER(contact));

-- Composite index for common query patterns (status + created_at)
CREATE INDEX IF NOT EXISTS idx_vehicles_status_created_at ON vehicles(status, created_at DESC);

-- Analyze tables to update statistics
ANALYZE vehicles;
ANALYZE owners;
ANALYZE vehicle_categories;

