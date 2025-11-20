-- Remove Traccar-related tables and columns
-- Run this script to clean up all Traccar integration remnants

-- Drop Traccar-related tables (in correct order due to foreign keys)
DROP TABLE IF EXISTS public.vehicle_geofences CASCADE;
DROP TABLE IF EXISTS public.tracking_settings CASCADE;
DROP TABLE IF EXISTS public.tracking_reports CASCADE;
DROP TABLE IF EXISTS public.tracking_alerts CASCADE;
DROP TABLE IF EXISTS public.tracking_events CASCADE;
DROP TABLE IF EXISTS public.tracking_positions CASCADE;
DROP TABLE IF EXISTS public.geofences CASCADE;
DROP TABLE IF EXISTS public.tracking_sessions CASCADE;
DROP TABLE IF EXISTS public.user_traccar_access CASCADE;

-- Drop Traccar-related indexes from vehicles table
DROP INDEX IF EXISTS idx_vehicles_traccar_device_id;
DROP INDEX IF EXISTS idx_vehicles_tracking_enabled;
DROP INDEX IF EXISTS idx_vehicles_current_status;

-- Remove Traccar-related columns from vehicles table
ALTER TABLE public.vehicles 
  DROP COLUMN IF EXISTS traccar_device_id,
  DROP COLUMN IF EXISTS traccar_unique_id,
  DROP COLUMN IF EXISTS last_position_update,
  DROP COLUMN IF EXISTS current_status,
  DROP COLUMN IF EXISTS last_latitude,
  DROP COLUMN IF EXISTS last_longitude,
  DROP COLUMN IF EXISTS last_speed,
  DROP COLUMN IF EXISTS last_course,
  DROP COLUMN IF EXISTS tracking_enabled;

-- Analyze tables to update statistics
ANALYZE vehicles;

