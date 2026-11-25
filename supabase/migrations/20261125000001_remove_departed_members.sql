-- Migration: delete members who have left the clan
--
-- Until now a member who left the WOM group was kept for good: the hourly
-- sync set left_date and active = false, and a rejoin cleared them again.
-- About 100 such rows had built up, and several jobs read every row, so
-- former members still counted for weekly XP awards, weekly titles,
-- competition Siege Score and RuneWatch checks.
--
-- From now on a former member is deleted once they have been out of the
-- group for 7 days. The sync (scripts/sync-tasks/sync-wom.cjs) decides who
-- has left, because only the live WOM group can tell a leaver from someone
-- who rejoined but has not been reactivated yet. A delete based on
-- left_date alone, run here, could not tell them apart, so this migration
-- deletes nothing itself; the first sync run after it is applied clears the
-- backlog.
--
--   remove_departed_member(wom_id)  deletes one former member and the rows
--                           that only make sense while they are a member:
--                           player claims, claim codes, claim requests and
--                           goals. It refuses (returns false) unless the
--                           member is marked as left (left_date set, active
--                           not true) and has been for at least 7 days, so a
--                           bug in the caller cannot delete a current member.
--                           Service role only.
--
-- History stays: event_results, weekly_title_awards, weekly_title_standings,
-- xp_awards, race_participants and siege_score_changes keep their rows. They
-- store a name, are never updated, and are part of other members' records.
--
-- Safe to run more than once.

-- Race entries are history, kept when their member goes. Production has no
-- foreign key from race_participants.wom_id to members (checked 2026-11-25),
-- but the local schema file adds one, which would block the delete for
-- anyone who ever raced. Dropping it makes local match production; there it
-- does nothing.
ALTER TABLE race_participants DROP CONSTRAINT IF EXISTS race_participants_wom_id_fkey;

CREATE OR REPLACE FUNCTION remove_departed_member(p_wom_id BIGINT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- Lock the row so a rejoin being processed at the same moment either
  -- finishes first (and this finds nothing to delete) or waits for this.
  PERFORM 1
  FROM members
  WHERE wom_id = p_wom_id
    AND left_date IS NOT NULL
    AND left_date <= NOW() - INTERVAL '7 days'
    AND active IS NOT TRUE
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- These go before the member: player_claims and claim_codes have foreign
  -- keys to members (claim_requests and user_goals too, in the local schema),
  -- and without one they would be left pointing at nobody.
  DELETE FROM player_claims WHERE wom_id = p_wom_id;
  DELETE FROM claim_codes WHERE wom_id = p_wom_id;
  DELETE FROM claim_requests WHERE wom_id = p_wom_id;
  DELETE FROM user_goals WHERE wom_id = p_wom_id;
  DELETE FROM members WHERE wom_id = p_wom_id;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION remove_departed_member(BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION remove_departed_member(BIGINT) TO service_role;

COMMENT ON COLUMN members.left_date IS
  'When the sync found this member missing from the WOM group. The row is '
  'hidden from then on, and deleted by remove_departed_member() after 7 days '
  'unless they rejoin first.';
