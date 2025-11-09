-- Migration: Admin RPC Functions
-- Description: Creates admin RPC functions for edge functions to use with service role key
-- These functions use SECURITY DEFINER to bypass RLS policies

-- ============================================
-- admin_update_member
-- ============================================
-- Updates member data with service role privileges
-- Used by: netlify/functions/admin-update-member.js

CREATE OR REPLACE FUNCTION admin_update_member(
  member_id INTEGER,
  updated_data JSONB
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE members
  SET
    siege_score = COALESCE((updated_data->>'siege_score')::INTEGER, siege_score),
    hidden = COALESCE((updated_data->>'hidden')::BOOLEAN, hidden),
    runewatch_whitelisted = COALESCE((updated_data->>'runewatch_whitelisted')::BOOLEAN, runewatch_whitelisted),
    runewatch_whitelist_reason = COALESCE(updated_data->>'runewatch_whitelist_reason', runewatch_whitelist_reason),
    updated_at = NOW()
  WHERE wom_id = member_id;

  -- Raise exception if member not found
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member with wom_id % not found', member_id;
  END IF;
END;
$$;

COMMENT ON FUNCTION admin_update_member(INTEGER, JSONB) IS
  'Admin function to update member data. Uses SECURITY DEFINER to bypass RLS. Called by admin edge functions.';

-- ============================================
-- admin_toggle_member_visibility
-- ============================================
-- Toggles member hidden status with service role privileges
-- Used by: netlify/functions/admin-toggle-member-visibility.js

CREATE OR REPLACE FUNCTION admin_toggle_member_visibility(
  member_id INTEGER,
  is_hidden BOOLEAN
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE members
  SET
    hidden = is_hidden,
    updated_at = NOW()
  WHERE wom_id = member_id;

  -- Raise exception if member not found
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member with wom_id % not found', member_id;
  END IF;
END;
$$;

COMMENT ON FUNCTION admin_toggle_member_visibility(INTEGER, BOOLEAN) IS
  'Admin function to toggle member visibility. Uses SECURITY DEFINER to bypass RLS. Called by admin edge functions.';

-- ============================================
-- admin_change_member_rank
-- ============================================
-- Changes member rank/role with service role privileges
-- Used by: src/hooks/useMembers.js

CREATE OR REPLACE FUNCTION admin_change_member_rank(
  member_id INTEGER,
  new_role TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE members
  SET
    role = new_role,
    updated_at = NOW()
  WHERE wom_id = member_id;

  -- Raise exception if member not found
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member with wom_id % not found', member_id;
  END IF;
END;
$$;

COMMENT ON FUNCTION admin_change_member_rank(INTEGER, TEXT) IS
  'Admin function to change member rank/role. Uses SECURITY DEFINER to bypass RLS.';

-- ============================================
-- admin_delete_member
-- ============================================
-- Deletes a member with service role privileges
-- Used by: netlify/edge-functions/admin-delete-member.js

CREATE OR REPLACE FUNCTION admin_delete_member(
  member_id INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM members
  WHERE wom_id = member_id;

  -- Raise exception if member not found
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member with wom_id % not found', member_id;
  END IF;
END;
$$;

COMMENT ON FUNCTION admin_delete_member(INTEGER) IS
  'Admin function to delete member. Uses SECURITY DEFINER to bypass RLS. Called by admin edge functions.';

-- ============================================
-- admin_toggle_user_admin
-- ============================================
-- Toggles a user's admin status with service role privileges
-- Used by: netlify/edge-functions/admin-toggle-user-admin.js

CREATE OR REPLACE FUNCTION admin_toggle_user_admin(
  user_id UUID,
  is_admin BOOLEAN
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE users
  SET
    is_admin = admin_toggle_user_admin.is_admin,
    updated_at = NOW()
  WHERE supabase_auth_id = user_id;

  -- Raise exception if user not found
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User with supabase_auth_id % not found', user_id;
  END IF;
END;
$$;

COMMENT ON FUNCTION admin_toggle_user_admin(UUID, BOOLEAN) IS
  'Admin function to toggle user admin status. Uses SECURITY DEFINER to bypass RLS. Called by admin edge functions.';

-- ============================================
-- Grant execute permissions to service_role
-- ============================================

GRANT EXECUTE ON FUNCTION admin_update_member(INTEGER, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION admin_toggle_member_visibility(INTEGER, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION admin_change_member_rank(INTEGER, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION admin_delete_member(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION admin_toggle_user_admin(UUID, BOOLEAN) TO service_role;
