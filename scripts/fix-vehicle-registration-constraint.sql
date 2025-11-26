-- Fix vehicle registration constraint to allow same number plates from different regions
-- This allows TTA-185 from Karachi and TTA-185 from Lasbela to coexist

-- Step 1: Drop the existing unique constraint on vehicle_register_number
ALTER TABLE public.vehicles DROP CONSTRAINT IF EXISTS vehicles_vehicle_register_number_key;

-- Step 2: Create a composite unique constraint on (vehicle_register_number, registration_region)
-- This ensures uniqueness per region, not globally
ALTER TABLE public.vehicles ADD CONSTRAINT vehicles_registration_region_unique 
UNIQUE (vehicle_register_number, registration_region);

-- Step 3: Update indexes to reflect the new constraint
-- Drop old single-column indexes that are no longer needed
DROP INDEX IF EXISTS idx_vehicles_register_number_lower;
DROP INDEX IF EXISTS idx_vehicles_registration_lower;

-- Create new composite indexes for better performance
CREATE INDEX idx_vehicles_registration_region ON public.vehicles 
USING btree (vehicle_register_number, registration_region);

CREATE INDEX idx_vehicles_registration_region_lower ON public.vehicles 
USING btree (lower(vehicle_register_number), lower(registration_region));

-- Step 4: Create index for searching by registration number across all regions
CREATE INDEX idx_vehicles_register_number_search ON public.vehicles 
USING btree (lower(vehicle_register_number));

-- Step 5: Add comments to document the change
COMMENT ON CONSTRAINT vehicles_registration_region_unique ON public.vehicles 
IS 'Ensures vehicle registration number is unique within each region, allowing same numbers across different regions';

-- Verify the changes
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.vehicles'::regclass 
AND conname LIKE '%registration%';

-- Show example of what's now possible:
-- INSERT INTO vehicles (vehicle_register_number, registration_region, ...) VALUES ('TTA-185', 'Karachi', ...);
-- INSERT INTO vehicles (vehicle_register_number, registration_region, ...) VALUES ('TTA-185', 'Lasbela', ...);
-- Both will work fine now!

COMMIT;
