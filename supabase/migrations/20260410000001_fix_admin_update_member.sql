-- Migration: Fix admin_update_member RPC
-- Description: Updates the admin_update_member function to handle all member fields
-- This fixes the bug where join_date, first_xp, and other fields were silently ignored

-- Drop the old function first
DROP FUNCTION IF EXISTS admin_update_member(INTEGER, JSONB);

-- Create the improved function that handles all editable member fields
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
    -- Basic info
    name = COALESCE(updated_data->>'name', name),
    wom_name = COALESCE(updated_data->>'wom_name', wom_name),
    womrole = COALESCE(updated_data->>'womrole', womrole),

    -- XP and level tracking
    first_xp = COALESCE((updated_data->>'first_xp')::BIGINT, first_xp),
    first_lvl = COALESCE((updated_data->>'first_lvl')::INTEGER, first_lvl),
    current_xp = COALESCE((updated_data->>'current_xp')::BIGINT, current_xp),
    current_lvl = COALESCE((updated_data->>'current_lvl')::INTEGER, current_lvl),

    -- Stats
    ehb = COALESCE((updated_data->>'ehb')::NUMERIC, ehb),
    siege_score = COALESCE((updated_data->>'siege_score')::INTEGER, siege_score),

    -- Dates
    join_date = COALESCE((updated_data->>'join_date')::TIMESTAMP WITH TIME ZONE, join_date),

    -- Flags
    hidden = COALESCE((updated_data->>'hidden')::BOOLEAN, hidden),
    runewatch_whitelisted = COALESCE((updated_data->>'runewatch_whitelisted')::BOOLEAN, runewatch_whitelisted),
    runewatch_whitelist_reason = COALESCE(updated_data->>'runewatch_whitelist_reason', runewatch_whitelist_reason),

    -- Metadata
    updated_at = NOW()
  WHERE wom_id = member_id;

  -- Raise exception if member not found
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member with wom_id % not found', member_id;
  END IF;
END;
$$;

COMMENT ON FUNCTION admin_update_member(INTEGER, JSONB) IS
  'Admin function to update member data. Handles all editable fields including join_date, first_xp, current_xp, etc. Uses SECURITY DEFINER to bypass RLS. Called by admin edge functions.';

-- Re-grant execute permissions to service_role
GRANT EXECUTE ON FUNCTION admin_update_member(INTEGER, JSONB) TO service_role;
