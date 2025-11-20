-- Migration: Admin Helper Functions
-- Description: Creates optimized helper functions for admin checks and user lookups
-- Date: 2025-01-16

-- ============================================
-- DROP OLD FUNCTIONS
-- ============================================

DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.is_admin_by_id(integer);
DROP FUNCTION IF EXISTS public.get_user_by_email(TEXT);

-- ============================================
-- ADMIN CHECK FUNCTION
-- ============================================

-- Create optimized is_admin check function
-- Uses SECURITY DEFINER to bypass RLS for the check
-- Returns false if user not found (safer default)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  admin_status BOOLEAN;
BEGIN
  -- Check if current user is admin
  SELECT is_admin INTO admin_status
  FROM public.users
  WHERE id = auth.uid();

  RETURN COALESCE(admin_status, false);
END;
$$;

-- ============================================
-- USER LOOKUP FUNCTION
-- ============================================

-- Create function to get user by email (for login)
-- Used by auth-login-with-username edge function
CREATE OR REPLACE FUNCTION public.get_user_by_email(user_email TEXT)
RETURNS TABLE (
  id UUID,
  username TEXT,
  email TEXT,
  is_admin BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.username,
    u.email,
    u.is_admin,
    u.created_at
  FROM public.users u
  WHERE u.email = user_email;
END;
$$;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Allow authenticated users to check admin status
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Allow anyone to lookup users by email (for login flow)
GRANT EXECUTE ON FUNCTION public.get_user_by_email(TEXT) TO anon, authenticated;

-- Service role has all permissions by default

-- ============================================
-- FUNCTION COMMENTS
-- ============================================

COMMENT ON FUNCTION public.is_admin() IS
  'Returns true if current authenticated user (auth.uid()) is admin. Returns false if user not found or not admin.';

COMMENT ON FUNCTION public.get_user_by_email(TEXT) IS
  'Retrieves user info by email. Used by auth-login-with-username edge function to convert username to email for login.';

-- ============================================
-- OPTIMIZATION NOTES
-- ============================================

-- The is_admin() function is marked STABLE which allows Postgres to cache
-- the result within a single query. This is safe because:
-- 1. auth.uid() doesn't change within a single request
-- 2. The function has no side effects
-- 3. This improves performance when used in RLS policies

-- Using SECURITY DEFINER allows the function to bypass RLS policies
-- when checking admin status. This is necessary because the function
-- might be called before RLS policies have determined access.
