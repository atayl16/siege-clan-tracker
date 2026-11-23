-- Migration: Siege Score history
--
-- On 2026-11-23 about 6,000 Siege Score points turned up that no award
-- accounted for. They belonged to 26 members who had left the clan: the
-- admin reset of 2026-10-26 only zeroed the members on the Admin page's list,
-- which leaves out former and hidden members, and the x10 change of
-- 2026-11-17 then multiplied what they still had. Nothing recorded a reset, or
-- any score change that was not an award, so it took an afternoon to find.
--
-- This makes every change to a Siege Score traceable:
--
--   siege_score_resets      when each reset happened (public read), so the
--                           profile's breakdown counts only awards since the
--                           last one and the Leaderboard can say when it was
--   siege_score_changes     one row per change to members.siege_score, from
--                           a trigger, whatever made it: an award, a reset,
--                           an admin button, an edit, or SQL run by hand.
--                           Service role only; read it in the SQL editor.
--   admin_reset_siege_scores()          zeroes EVERY member, former and
--                           hidden ones included, and records the reset, in
--                           one transaction (the Admin page sent ~230
--                           separate updates)
--   admin_add_siege_points(id, points)  adds at the database, so an Admin
--                           page opened before an award cannot write an old
--                           score back over it
--
-- Writers can label their changes by setting siege.score_source for the
-- transaction: SELECT set_config('siege.score_source', 'why', true);
-- the two functions here do ('reset', 'staff'). Unlabelled changes log a null
-- source; changed_by still tells the sync and admin functions (service_role)
-- from SQL run by hand (postgres).
--
-- Safe to run more than once.

-- Resets ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS siege_score_resets (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  reset_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE siege_score_resets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS siege_score_resets_public_read ON siege_score_resets;
CREATE POLICY siege_score_resets_public_read ON siege_score_resets
  FOR SELECT USING (true);

-- The 2026-10-26 reset, worked out from the award history: it came after the
-- Raid of the Week that ended at 13:00 UTC that day, whose points were zeroed,
-- and before any later award. Only added to an empty table.
INSERT INTO siege_score_resets (reset_at)
SELECT '2026-10-26 13:00:00+00'
WHERE NOT EXISTS (SELECT 1 FROM siege_score_resets);

-- Change log -----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS siege_score_changes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  wom_id BIGINT NOT NULL,
  old_score INTEGER,
  new_score INTEGER,
  source TEXT,
  changed_by TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS siege_score_changes_wom_id_idx
  ON siege_score_changes (wom_id, changed_at DESC);

-- RLS on with no policies: only the service role (and the SQL editor) reads it.
ALTER TABLE siege_score_changes ENABLE ROW LEVEL SECURITY;

-- SECURITY DEFINER so any role that may change a score can write its log
-- row. The role is read from the request's JWT (PostgREST sets it), because
-- current_user inside a definer function is the function's owner.
CREATE OR REPLACE FUNCTION log_siege_score_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claims TEXT := NULLIF(current_setting('request.jwt.claims', true), '');
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.siege_score IS NOT DISTINCT FROM OLD.siege_score THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' AND COALESCE(NEW.siege_score, 0) = 0 THEN
    RETURN NEW;
  END IF;

  INSERT INTO siege_score_changes (wom_id, old_score, new_score, source, changed_by)
  VALUES (
    NEW.wom_id,
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.siege_score END,
    NEW.siege_score,
    NULLIF(current_setting('siege.score_source', true), ''),
    COALESCE(claims::json->>'role', session_user)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS members_log_siege_score ON members;
CREATE TRIGGER members_log_siege_score
  AFTER INSERT OR UPDATE OF siege_score ON members
  FOR EACH ROW EXECUTE FUNCTION log_siege_score_change();

-- Reset ----------------------------------------------------------------------

CREATE OR REPLACE FUNCTION admin_reset_siege_scores()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reset_count INTEGER;
BEGIN
  PERFORM set_config('siege.score_source', 'reset', true);

  -- Every member: former and hidden ones too, so nobody keeps old points.
  UPDATE members SET siege_score = 0 WHERE COALESCE(siege_score, 0) <> 0;
  GET DIAGNOSTICS reset_count = ROW_COUNT;

  INSERT INTO siege_score_resets DEFAULT VALUES;
  RETURN reset_count;
END;
$$;

REVOKE ALL ON FUNCTION admin_reset_siege_scores() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_reset_siege_scores() TO service_role;

-- Staff points ---------------------------------------------------------------

CREATE OR REPLACE FUNCTION admin_add_siege_points(member_id BIGINT, points INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_score INTEGER;
BEGIN
  IF points IS NULL OR points = 0 OR abs(points) > 1000 THEN
    RAISE EXCEPTION 'points must be between -1000 and 1000, and not 0 (got %)', points;
  END IF;

  PERFORM set_config('siege.score_source', 'staff', true);

  UPDATE members
  SET siege_score = COALESCE(siege_score, 0) + points
  WHERE wom_id = member_id
  RETURNING siege_score INTO updated_score;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No member with WOM ID %', member_id;
  END IF;

  RETURN updated_score;
END;
$$;

REVOKE ALL ON FUNCTION admin_add_siege_points(BIGINT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_add_siege_points(BIGINT, INTEGER) TO service_role;
