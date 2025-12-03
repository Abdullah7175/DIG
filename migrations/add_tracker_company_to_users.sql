-- Migration: Add tracker_company_id to users table for consultant role
-- This allows consultants (role 4) to be associated with a tracker company

-- Add tracker_company_id column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS tracker_company_id integer NULL;

-- Add foreign key constraint
ALTER TABLE public.users 
ADD CONSTRAINT users_tracker_company_id_fkey 
FOREIGN KEY (tracker_company_id) 
REFERENCES public.tracker_companies(id) 
ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_users_tracker_company_id 
ON public.users(tracker_company_id) 
WHERE tracker_company_id IS NOT NULL;

-- Add comment to document the column
COMMENT ON COLUMN public.users.tracker_company_id IS 'Tracker company ID for consultant users (role 4). Consultants can only see/add vehicles for their assigned tracker company.';

