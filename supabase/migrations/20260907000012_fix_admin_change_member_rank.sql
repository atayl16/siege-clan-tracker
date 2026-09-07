-- Migration: repair admin_change_member_rank
--
-- Changing a member's rank is broken in production, and has two separate
-- faults.
--
-- 1. Duplicate overloads. Production carries both
--
--      admin_change_member_rank(member_id bigint,  new_role text)
--      admin_change_member_rank(member_id integer, new_role text)
--
--    so PostgREST refuses to choose and every call fails before reaching the
--    database. Confirmed against production on 2026-09-07 with a wom_id that
--    cannot match anything:
--
--      PGRST203 Could not choose the best candidate function between:
--        public.admin_change_member_rank(member_id => bigint, new_role => text),
--        public.admin_change_member_rank(member_id => integer, new_role => text)
--      HTTP 300
--
-- 2. The wrong column. The version in this repo writes
--
--      UPDATE members SET role = new_role
--
--    but production has no `role` column - it has `womrole`, and `womrole` is
--    what the app reads: rankUtils.js keys every rank decision off
--    member.womrole. So even where `role` exists (locally, where both columns
--    are present) a rank change wrote a column nothing displays, and the UI
--    would show the old rank afterwards.
--
-- Dropping both overloads and creating one definitive version that writes
-- womrole. INTEGER matches wom_id's type in members and is what the Netlify
-- function sends.
--
-- The `role` column is left alone. It exists only locally, nothing reads it,
-- and dropping columns in a migration that may run against production is not
-- worth the risk - see the note in 20260907000007.

DROP FUNCTION IF EXISTS admin_change_member_rank(BIGINT, TEXT);
DROP FUNCTION IF EXISTS admin_change_member_rank(INTEGER, TEXT);

CREATE FUNCTION admin_change_member_rank(
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
    womrole = new_role,
    updated_at = NOW()
  WHERE wom_id = member_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member with wom_id % not found', member_id;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION admin_change_member_rank(INTEGER, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION admin_change_member_rank(INTEGER, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION admin_change_member_rank(INTEGER, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION admin_change_member_rank(INTEGER, TEXT) TO service_role;

COMMENT ON FUNCTION admin_change_member_rank(INTEGER, TEXT) IS
  'Sets members.womrole, which is the column the UI reads. Exactly one '
  'overload: a second signature makes PostgREST refuse the call with PGRST203.';
