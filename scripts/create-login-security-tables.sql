-- Create login_attempts table to track failed login attempts
CREATE TABLE IF NOT EXISTS public.login_attempts (
    id serial4 NOT NULL,
    user_id int4 NULL,
    email varchar(255) NOT NULL,
    ip_address varchar(45) NOT NULL, -- IPv6 can be up to 45 characters
    attempt_count int4 DEFAULT 1 NOT NULL,
    last_attempt_at timestamp DEFAULT now() NOT NULL,
    blocked_until timestamp NULL, -- When the account is blocked until (for 60-second timer)
    is_blocked bool DEFAULT false NOT NULL, -- Permanent block (requires admin unblock)
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL,
    CONSTRAINT login_attempts_pkey PRIMARY KEY (id),
    CONSTRAINT login_attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- Index for quick lookups by email
CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON public.login_attempts USING btree (email);
-- Index for quick lookups by IP
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON public.login_attempts USING btree (ip_address);
-- Index for blocked accounts
CREATE INDEX IF NOT EXISTS idx_login_attempts_blocked ON public.login_attempts USING btree (is_blocked, blocked_until) WHERE is_blocked = true OR blocked_until IS NOT NULL;
-- Index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_login_attempts_user_id ON public.login_attempts USING btree (user_id) WHERE user_id IS NOT NULL;

COMMENT ON TABLE public.login_attempts IS 'Tracks failed login attempts and account blocking status';
COMMENT ON COLUMN public.login_attempts.attempt_count IS 'Number of consecutive failed attempts';
COMMENT ON COLUMN public.login_attempts.blocked_until IS 'Timestamp when temporary block expires (60 seconds after 3rd attempt)';
COMMENT ON COLUMN public.login_attempts.is_blocked IS 'Permanent block flag (requires admin to unblock)';

-- Create user_activity_logs table to track all user actions
CREATE TABLE IF NOT EXISTS public.user_activity_logs (
    id serial4 NOT NULL,
    user_id int4 NULL, -- NULL for anonymous actions (like failed logins)
    action_type varchar(100) NOT NULL, -- e.g., 'login', 'logout', 'create_vehicle', 'update_vehicle', etc.
    action_description text NOT NULL, -- Human-readable description
    ip_address varchar(45) NOT NULL,
    user_agent text NULL, -- Browser/client information
    request_method varchar(10) NULL, -- GET, POST, PATCH, DELETE, etc.
    request_path text NULL, -- API endpoint
    request_body jsonb NULL, -- Request body (sanitized, no sensitive data)
    response_status int4 NULL, -- HTTP status code
    success bool DEFAULT true NOT NULL, -- Whether the action was successful
    error_message text NULL, -- Error message if action failed
    metadata jsonb NULL, -- Additional metadata (entity IDs, etc.)
    created_at timestamp DEFAULT now() NOT NULL,
    CONSTRAINT user_activity_logs_pkey PRIMARY KEY (id),
    CONSTRAINT user_activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON public.user_activity_logs USING btree (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_action_type ON public.user_activity_logs USING btree (action_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_ip_address ON public.user_activity_logs USING btree (ip_address);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_created_at ON public.user_activity_logs USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_success ON public.user_activity_logs USING btree (success);
-- Composite index for common queries (user + date range)
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_created ON public.user_activity_logs USING btree (user_id, created_at DESC) WHERE user_id IS NOT NULL;

COMMENT ON TABLE public.user_activity_logs IS 'Comprehensive log of all user actions and system events';
COMMENT ON COLUMN public.user_activity_logs.action_type IS 'Type of action performed (login, logout, create_vehicle, etc.)';
COMMENT ON COLUMN public.user_activity_logs.action_description IS 'Human-readable description of the action';
COMMENT ON COLUMN public.user_activity_logs.ip_address IS 'IP address from which the action was performed';
COMMENT ON COLUMN public.user_activity_logs.request_body IS 'Sanitized request body (sensitive data removed)';
COMMENT ON COLUMN public.user_activity_logs.metadata IS 'Additional context (entity IDs, filters, etc.)';

-- Add blocked status to users table (optional, but useful for quick checks)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_blocked bool DEFAULT false NOT NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS blocked_at timestamp NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS blocked_by int4 NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS blocked_reason text NULL;

-- Index for blocked users
CREATE INDEX IF NOT EXISTS idx_users_is_blocked ON public.users USING btree (is_blocked) WHERE is_blocked = true;

COMMENT ON COLUMN public.users.is_blocked IS 'Whether the user account is permanently blocked';
COMMENT ON COLUMN public.users.blocked_at IS 'When the user was blocked';
COMMENT ON COLUMN public.users.blocked_by IS 'Admin user ID who blocked this user';
COMMENT ON COLUMN public.users.blocked_reason IS 'Reason for blocking the user';

-- Add foreign key for blocked_by (added separately to avoid circular reference)
-- Note: This constraint is added after the table is created
-- ALTER TABLE public.users 
-- ADD CONSTRAINT IF NOT EXISTS users_blocked_by_fkey 
-- FOREIGN KEY (blocked_by) REFERENCES public.users(id);

np
