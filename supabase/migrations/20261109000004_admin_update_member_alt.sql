-- Migration: let admin_update_member set members.alt
--
-- MembersPage hides alt accounts unless "Show Alt Accounts" is ticked, but
-- nothing in the app could change the flag: admin_update_member (last defined
-- in 20260410000001) lists every column it writes, and alt is not one of them,
-- so the only way to fix a main marked as an alt was the table editor.
--
-- Same body as 20260410000001 plus the alt line. CREATE OR REPLACE with the
-- same signature keeps the function's existing grants; the REVOKE/GRANT below
-- restate them anyway so this file cannot reopen it to anon, which
-- 20261009000001 closed. Idempotent.

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
    alt = COALESCE((updated_data->>'alt')::BOOLEAN, alt),
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

REVOKE EXECUTE ON FUNCTION admin_update_member(INTEGER, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_update_member(INTEGER, JSONB) TO service_role;
