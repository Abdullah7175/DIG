-- Fleet Reports / ESSPL sync tables (NEW only — does not alter tracking_events data)
-- Run on DIG database as postgres user.
-- Index commands use CONCURRENTLY — run them outside a transaction.

-- 1) Speed threshold on existing API configs (default 50 → save only speed > 50)
ALTER TABLE public.tracking_api_configs
  ADD COLUMN IF NOT EXISTS speed_threshold integer NOT NULL DEFAULT 50;

COMMENT ON COLUMN public.tracking_api_configs.speed_threshold IS
  'Save overspeed/event rows only when speed > this value (e.g. 50 means 51+)';

-- 2) Fleet objects from USER_GET_OBJECTS (long-lived master data)
CREATE TABLE IF NOT EXISTS public.tracker_objects (
  id serial4 NOT NULL,
  imei text NOT NULL,
  plate_number text NULL,
  name text NULL,
  device text NULL,
  sim_number text NULL,
  model text NULL,
  vin text NULL,
  protocol text NULL,
  active boolean DEFAULT true NOT NULL,
  object_expire boolean DEFAULT false NOT NULL,
  object_expire_dt timestamp NULL,
  lat numeric(10, 6) NULL,
  lng numeric(10, 6) NULL,
  speed integer DEFAULT 0 NOT NULL,
  altitude integer NULL,
  angle integer NULL,
  dt_tracker timestamp NULL,
  dt_server timestamp NULL,
  dt_last_stop timestamp NULL,
  dt_last_idle timestamp NULL,
  dt_last_move timestamp NULL,
  odometer numeric(14, 4) NULL,
  engine_hours numeric(14, 2) NULL,
  params jsonb DEFAULT '{}'::jsonb NULL,
  loc_valid boolean NULL,
  vehicle_id int4 NULL,
  tracker_company_id int4 NULL,
  tracking_api_config_id int4 NULL,
  matched_at timestamp NULL,
  last_synced_at timestamp DEFAULT now() NOT NULL,
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL,
  CONSTRAINT tracker_objects_pkey PRIMARY KEY (id),
  CONSTRAINT tracker_objects_imei_key UNIQUE (imei),
  CONSTRAINT tracker_objects_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE SET NULL,
  CONSTRAINT tracker_objects_tracker_company_id_fkey FOREIGN KEY (tracker_company_id) REFERENCES public.tracker_companies(id) ON DELETE SET NULL,
  CONSTRAINT tracker_objects_tracking_api_config_id_fkey FOREIGN KEY (tracking_api_config_id) REFERENCES public.tracking_api_configs(id) ON DELETE SET NULL
);

-- 3) Short-lived event cache (overspeed / events) — purged after 3 days
CREATE TABLE IF NOT EXISTS public.tracker_event_cache (
  id serial4 NOT NULL,
  event_id text NULL,
  imei text NULL,
  event_type text NULL,
  event_desc text NOT NULL,
  name text NOT NULL,
  plate_number text NULL,
  dt_tracker timestamp NOT NULL,
  dt_server timestamp NULL,
  lat numeric(10, 6) NULL,
  lng numeric(10, 6) NULL,
  speed integer NOT NULL,
  altitude integer NULL,
  angle integer NULL,
  vehicle_id int4 NULL,
  tracker_object_id int4 NULL,
  tracker_company_id int4 NULL,
  tracking_api_config_id int4 NULL,
  source_cmd text NULL,
  created_at timestamp DEFAULT now() NOT NULL,
  CONSTRAINT tracker_event_cache_pkey PRIMARY KEY (id),
  CONSTRAINT tracker_event_cache_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE SET NULL,
  CONSTRAINT tracker_event_cache_tracker_object_id_fkey FOREIGN KEY (tracker_object_id) REFERENCES public.tracker_objects(id) ON DELETE SET NULL,
  CONSTRAINT tracker_event_cache_tracker_company_id_fkey FOREIGN KEY (tracker_company_id) REFERENCES public.tracker_companies(id) ON DELETE SET NULL,
  CONSTRAINT tracker_event_cache_tracking_api_config_id_fkey FOREIGN KEY (tracking_api_config_id) REFERENCES public.tracking_api_configs(id) ON DELETE SET NULL
);

-- 4) Sync cursor / job state (last event ids, last run times)
CREATE TABLE IF NOT EXISTS public.tracker_sync_state (
  id serial4 NOT NULL,
  tracking_api_config_id int4 NOT NULL,
  sync_key text NOT NULL,
  last_event_id text NULL,
  last_success_at timestamp NULL,
  last_attempt_at timestamp NULL,
  last_status text NULL,
  last_error text NULL,
  meta jsonb DEFAULT '{}'::jsonb NULL,
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL,
  CONSTRAINT tracker_sync_state_pkey PRIMARY KEY (id),
  CONSTRAINT tracker_sync_state_config_key_unique UNIQUE (tracking_api_config_id, sync_key),
  CONSTRAINT tracker_sync_state_tracking_api_config_id_fkey FOREIGN KEY (tracking_api_config_id) REFERENCES public.tracking_api_configs(id) ON DELETE CASCADE
);

-- Indexes (run each separately with CONCURRENTLY outside a transaction)
-- sudo -u postgres psql -d DIG -c "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tracker_objects_plate ON public.tracker_objects (plate_number);"
-- sudo -u postgres psql -d DIG -c "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tracker_objects_vehicle_id ON public.tracker_objects (vehicle_id) WHERE vehicle_id IS NOT NULL;"
-- sudo -u postgres psql -d DIG -c "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tracker_objects_imei ON public.tracker_objects (imei);"
-- sudo -u postgres psql -d DIG -c "CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_tracker_event_cache_event_id ON public.tracker_event_cache (event_id) WHERE event_id IS NOT NULL;"
-- sudo -u postgres psql -d DIG -c "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tracker_event_cache_dt ON public.tracker_event_cache (dt_tracker DESC);"
-- sudo -u postgres psql -d DIG -c "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tracker_event_cache_speed_dt ON public.tracker_event_cache (speed, dt_tracker DESC);"
-- sudo -u postgres psql -d DIG -c "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tracker_event_cache_imei_dt ON public.tracker_event_cache (imei, dt_tracker DESC);"
-- sudo -u postgres psql -d DIG -c "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tracker_event_cache_vehicle_dt ON public.tracker_event_cache (vehicle_id, dt_tracker DESC) WHERE vehicle_id IS NOT NULL;"
-- sudo -u postgres psql -d DIG -c "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tracker_sync_state_config ON public.tracker_sync_state (tracking_api_config_id);"
