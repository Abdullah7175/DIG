-- Optimize tracker_payments table with composite indexes for common query patterns

-- Composite index for filtering by vehicle_id and status (very common)
CREATE INDEX IF NOT EXISTS idx_tracker_payments_vehicle_status 
ON public.tracker_payments (vehicle_id, status);

-- Composite index for filtering by tracker_company_id and status
CREATE INDEX IF NOT EXISTS idx_tracker_payments_company_status 
ON public.tracker_payments (tracker_company_id, status);

-- Composite index for filtering by vehicle_id, tracker_company_id, and status
CREATE INDEX IF NOT EXISTS idx_tracker_payments_vehicle_company_status 
ON public.tracker_payments (vehicle_id, tracker_company_id, status);

-- Composite index for expired payments query (status + next_payment_due_date)
CREATE INDEX IF NOT EXISTS idx_tracker_payments_status_due_date 
ON public.tracker_payments (status, next_payment_due_date) 
WHERE status = 'active';

-- Composite index for payment_date ordering with status filter
CREATE INDEX IF NOT EXISTS idx_tracker_payments_status_payment_date 
ON public.tracker_payments (status, payment_date DESC);

-- Index for vehicle_id and payment_date (for sorting by payment date per vehicle)
CREATE INDEX IF NOT EXISTS idx_tracker_payments_vehicle_payment_date 
ON public.tracker_payments (vehicle_id, payment_date DESC);

-- Analyze the table to update statistics
ANALYZE public.tracker_payments;

