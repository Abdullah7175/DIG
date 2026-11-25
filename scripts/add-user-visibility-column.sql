-- User-role visibility only. Does not change vehicles.status or QR blacklist.
-- Existing rows stay visible (false) until an admin/manager hides them.
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS hidden_from_user boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.vehicles.hidden_from_user IS
  'When true, the vehicle is hidden from the user role dashboard and vehicle list. Status and QR blacklist are unchanged.';

