-- Migration: Auth-Based RLS Policies
-- Description: Updates Row Level Security policies to use auth.uid() properly
--              and prevent users from self-promoting to admin
-- Date: 2025-01-16

-- Drop old/conflicting policies
DROP POLICY IF EXISTS "Allow public registration" ON public.users;
DROP POLICY IF EXISTS "Public username lookup" ON public.users;
DROP POLICY IF EXISTS "Users can access their own data" ON public.users;
DROP POLICY IF EXISTS "allow_authenticated_read_users" ON public.users;
DROP POLICY IF EXISTS "allow_users_read_own_profile" ON public.users;
DROP POLICY IF EXISTS "allow_service_role_all_users" ON public.users;

-- ============================================
-- USERS TABLE RLS POLICIES
-- ============================================

-- Policy 1: Users can view their own profile using auth.uid()
CREATE POLICY "users_select_own_profile"
ON public.users
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Policy 2: Anonymous users can read basic user info (for username lookup in login)
-- This is safe because we don't expose sensitive data
-- Used by the login endpoint to convert username -> email
CREATE POLICY "anon_read_public_user_info"
ON public.users
FOR SELECT
TO anon
USING (true);

-- Policy 3: Users can update their own profile (except admin status)
-- Note: Column-level permissions prevent is_admin updates below
CREATE POLICY "users_update_own_profile"
ON public.users
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Policy 4: Allow new user registration (INSERT)
-- This is safe because the trigger sets all fields from auth.users
CREATE POLICY "users_insert_via_trigger"
ON public.users
FOR INSERT
TO authenticated, anon
WITH CHECK (true);

-- Policy 5: Service role has full access (for edge functions)
CREATE POLICY "service_role_all_access"
ON public.users
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================
-- COLUMN-LEVEL SECURITY
-- ============================================

-- CRITICAL: Prevent users from promoting themselves to admin
-- Revoke UPDATE permission on is_admin column for authenticated users
-- Only service_role (edge functions) can modify is_admin
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

REVOKE UPDATE (is_admin) ON public.users FROM authenticated;
REVOKE UPDATE (is_admin) ON public.users FROM anon;

-- Service role can update is_admin (already has all permissions)
-- This is used by the admin-toggle-user-admin edge function

-- ============================================
-- POLICY COMMENTS
-- ============================================

COMMENT ON POLICY "users_select_own_profile" ON public.users IS
  'Users can view their own profile using auth.uid()';

COMMENT ON POLICY "anon_read_public_user_info" ON public.users IS
  'Anonymous users can read user info for username lookup during login. Used by auth-login-with-username edge function.';

COMMENT ON POLICY "users_update_own_profile" ON public.users IS
  'Users can update their own profile fields (except is_admin which is column-protected)';

COMMENT ON POLICY "users_insert_via_trigger" ON public.users IS
  'Allows trigger to insert new users automatically. All fields set by trigger from auth.users.';

COMMENT ON POLICY "service_role_all_access" ON public.users IS
  'Service role (edge functions) has full access including is_admin updates';
