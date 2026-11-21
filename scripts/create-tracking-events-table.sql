-- Create tracking_events table for real-time vehicle tracking data
-- Optimized for high-frequency inserts and fast queries

-- Drop table if exists (for development)
-- DROP TABLE IF EXISTS public.tracking_events;

CREATE TABLE public.tracking_events (
    id serial4 NOT NULL,
    event_desc varchar(50) NOT NULL, -- Event description like 'OverSpeed'
    name varchar(50) NOT NULL, -- Vehicle name like 'GLTA-2296'
    dt_tracker timestamp NOT NULL, -- Timestamp from tracker device
    dt_server timestamp NOT NULL, -- Timestamp when data reached server
    lat numeric(10,6) NOT NULL, -- Latitude with 6 decimal precision
    lng numeric(10,6) NOT NULL, -- Longitude with 6 decimal precision  
    speed int4 NOT NULL, -- Speed in km/h
    created_at timestamp DEFAULT now() NOT NULL, -- When record was inserted into our DB
    updated_at timestamp DEFAULT now() NOT NULL, -- When record was last updated
    CONSTRAINT tracking_events_pkey PRIMARY KEY (id)
);

-- Indexes that match the events-page filters (dt_tracker, vehicle, company, event type).
CREATE INDEX idx_tracking_events_dt_tracker ON public.tracking_events USING btree (dt_tracker DESC);
CREATE INDEX idx_tracking_events_name_dt ON public.tracking_events USING btree (name, dt_tracker DESC);
CREATE INDEX idx_tracking_events_event_dt ON public.tracking_events USING btree (event_desc, dt_tracker DESC);
CREATE INDEX idx_tracking_events_created_at_desc ON public.tracking_events USING btree (created_at DESC);

-- Alternative 2: If you want to maintain recent data index, you can create a function:
-- CREATE OR REPLACE FUNCTION get_week_ago() RETURNS timestamp AS $$
-- BEGIN
--   RETURN (CURRENT_TIMESTAMP - interval '7 days');
-- END;
-- $$ LANGUAGE plpgsql IMMUTABLE;
-- 
-- Then use: WHERE created_at >= get_week_ago()
-- But this requires manual updates when the function logic changes

-- Add table comments
COMMENT ON TABLE public.tracking_events IS 'Real-time vehicle tracking events from external API';
COMMENT ON COLUMN public.tracking_events.event_desc IS 'Type of event (OverSpeed, etc.)';
COMMENT ON COLUMN public.tracking_events.name IS 'Vehicle identifier/name';
COMMENT ON COLUMN public.tracking_events.dt_tracker IS 'Timestamp from tracking device';
COMMENT ON COLUMN public.tracking_events.dt_server IS 'Timestamp when data reached tracking server';
COMMENT ON COLUMN public.tracking_events.lat IS 'Latitude coordinate (6 decimal precision)';
COMMENT ON COLUMN public.tracking_events.lng IS 'Longitude coordinate (6 decimal precision)';
COMMENT ON COLUMN public.tracking_events.speed IS 'Vehicle speed in km/h';
COMMENT ON COLUMN public.tracking_events.created_at IS 'When record was inserted into our database';
COMMENT ON COLUMN public.tracking_events.updated_at IS 'When record was last updated';

-- Set permissions
ALTER TABLE public.tracking_events OWNER TO root;
GRANT ALL ON TABLE public.tracking_events TO root;

-- Optional: Create a function to automatically clean old data (older than 30 days)
-- This helps maintain performance by keeping table size manageable
CREATE OR REPLACE FUNCTION cleanup_old_tracking_events()
RETURNS void AS $$
BEGIN
    DELETE FROM public.tracking_events 
    WHERE created_at < (now() - interval '30 days');
    
    -- Log the cleanup
    RAISE NOTICE 'Cleaned up tracking events older than 30 days';
END;
$$ LANGUAGE plpgsql;

-- Optional: Create a scheduled job to run cleanup weekly
-- You can set this up with pg_cron extension or run it manually
-- SELECT cron.schedule('cleanup-tracking-events', '0 2 * * 0', 'SELECT cleanup_old_tracking_events();');

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_tracking_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tracking_events_updated_at
    BEFORE UPDATE ON public.tracking_events
    FOR EACH ROW
    EXECUTE FUNCTION update_tracking_events_updated_at();
