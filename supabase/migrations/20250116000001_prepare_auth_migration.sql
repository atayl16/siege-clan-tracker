-- Migration: Prepare Users Table for Auth Migration
-- Description: Updates users table structure to support clean Supabase Auth integration
-- Date: 2025-01-16

-- Add email column to users table (will be the source of truth)
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;

-- Make password_hash nullable (we'll phase it out)
ALTER TABLE public.users
ALTER COLUMN password_hash DROP NOT NULL;

-- Ensure supabase_auth_id is indexed for performance
CREATE INDEX IF NOT EXISTS idx_users_supabase_auth_id
ON public.users(supabase_auth_id);

-- Ensure email is indexed
CREATE INDEX IF NOT EXISTS idx_users_email
ON public.users(email);

-- Add comment explaining the structure
COMMENT ON COLUMN public.users.email IS
  'Email stored in auth.users. Format: username@siege-clan.app';

COMMENT ON COLUMN public.users.supabase_auth_id IS
  'Foreign key to auth.users.id. Always set via trigger.';

COMMENT ON COLUMN public.users.password_hash IS
  'DEPRECATED: Legacy password hash. Will be removed in future migration. Use Supabase Auth instead.';
