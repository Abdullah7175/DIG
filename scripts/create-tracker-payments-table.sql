-- Create tracker_payments table for managing tracker installation and payment tracking
-- This table tracks when trackers are installed and when payments are due

CREATE TABLE IF NOT EXISTS public.tracker_payments (
    id serial4 NOT NULL,
    vehicle_id int4 NOT NULL,
    tracker_company_id int4 NOT NULL,
    installation_date date NOT NULL,
    payment_date date NOT NULL,
    amount decimal(10, 2) NULL,
    payment_period_months int4 DEFAULT 12 NOT NULL,
    next_payment_due_date date NOT NULL,
    status text DEFAULT 'active'::text NOT NULL, -- active, expired, pending, cancelled
    payment_receipt_number text NULL,
    notes text NULL,
    created_at timestamp DEFAULT now() NULL,
    updated_at timestamp DEFAULT now() NULL,
    created_by int4 NULL,
    
    CONSTRAINT tracker_payments_pkey PRIMARY KEY (id),
    CONSTRAINT tracker_payments_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE CASCADE,
    CONSTRAINT tracker_payments_tracker_company_id_fkey FOREIGN KEY (tracker_company_id) REFERENCES public.tracker_companies(id),
    CONSTRAINT tracker_payments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id),
    CONSTRAINT tracker_payments_status_check CHECK (status IN ('active', 'expired', 'pending', 'cancelled'))
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tracker_payments_vehicle_id ON public.tracker_payments USING btree (vehicle_id);
CREATE INDEX IF NOT EXISTS idx_tracker_payments_tracker_company_id ON public.tracker_payments USING btree (tracker_company_id);
CREATE INDEX IF NOT EXISTS idx_tracker_payments_status ON public.tracker_payments USING btree (status);
CREATE INDEX IF NOT EXISTS idx_tracker_payments_next_payment_due_date ON public.tracker_payments USING btree (next_payment_due_date);
CREATE INDEX IF NOT EXISTS idx_tracker_payments_payment_date ON public.tracker_payments USING btree (payment_date);
CREATE INDEX IF NOT EXISTS idx_tracker_payments_installation_date ON public.tracker_payments USING btree (installation_date);
CREATE INDEX IF NOT EXISTS idx_tracker_payments_vehicle_status ON public.tracker_payments USING btree (vehicle_id, status);

-- Add column comments
COMMENT ON TABLE public.tracker_payments IS 'Tracks tracker installation dates and payment schedules for vehicles';
COMMENT ON COLUMN public.tracker_payments.installation_date IS 'Date when the tracker was installed on the vehicle';
COMMENT ON COLUMN public.tracker_payments.payment_date IS 'Date when the payment was made';
COMMENT ON COLUMN public.tracker_payments.amount IS 'Payment amount in local currency';
COMMENT ON COLUMN public.tracker_payments.payment_period_months IS 'Number of months the payment covers (default 12 months)';
COMMENT ON COLUMN public.tracker_payments.next_payment_due_date IS 'Calculated date when next payment is due (payment_date + payment_period_months)';
COMMENT ON COLUMN public.tracker_payments.status IS 'Payment status: active, expired, pending, cancelled';

-- Grant permissions
ALTER TABLE public.tracker_payments OWNER TO root;
GRANT ALL ON TABLE public.tracker_payments TO root;

-- Create a function to automatically calculate next_payment_due_date
CREATE OR REPLACE FUNCTION calculate_next_payment_due_date()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate next payment due date: payment_date + payment_period_months
    NEW.next_payment_due_date := (NEW.payment_date + (NEW.payment_period_months || ' months')::interval)::date;
    
    -- Auto-update status based on next_payment_due_date
    IF NEW.next_payment_due_date < CURRENT_DATE THEN
        NEW.status := 'expired';
    ELSIF NEW.status = 'active' AND NEW.next_payment_due_date >= CURRENT_DATE THEN
        NEW.status := 'active';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically calculate next_payment_due_date
CREATE TRIGGER trigger_calculate_next_payment_due_date
    BEFORE INSERT OR UPDATE OF payment_date, payment_period_months ON public.tracker_payments
    FOR EACH ROW
    EXECUTE FUNCTION calculate_next_payment_due_date();

-- Create a function to update expired payments status
CREATE OR REPLACE FUNCTION update_expired_payments()
RETURNS void AS $$
BEGIN
    UPDATE public.tracker_payments
    SET status = 'expired', updated_at = now()
    WHERE status = 'active' 
    AND next_payment_due_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

