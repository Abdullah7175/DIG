-- Add 'affiliated_with' field to vehicles table
-- This field stores the affiliation information for vehicles

ALTER TABLE public.vehicles 
ADD COLUMN IF NOT EXISTS affiliated_with text NULL;

-- Add a comment to describe the field
COMMENT ON COLUMN public.vehicles.affiliated_with IS 'Organization or association the vehicle is affiliated with';

