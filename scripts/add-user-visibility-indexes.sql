-- Speeds up registration-number to tracker-plate matching.
-- Run each statement on its own. CONCURRENTLY cannot run inside a transaction.

CREATE INDEX CONCURRENTLY IF NOT EXISTS vehicles_reg_plate_key_idx
  ON public.vehicles (regexp_replace(upper(vehicle_register_number), '[^A-Z0-9]', '', 'g'));

CREATE INDEX CONCURRENTLY IF NOT EXISTS tracker_objects_plate_key_idx
  ON public.tracker_objects (regexp_replace(upper(plate_number), '[^A-Z0-9]', '', 'g'))
  WHERE plate_number IS NOT NULL AND btrim(plate_number) <> '';
