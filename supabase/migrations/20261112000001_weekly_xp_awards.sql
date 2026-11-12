-- Migration: weekly Overall XP awards
--
-- Each week (Monday 19:00 to Monday 19:00 UK, the same window as SotW and
-- BotW) the clan's top five Overall XP gainers earn Siege Score: 15, 10, 5,
-- 2 and 2 points. The hourly sync job scripts/sync-tasks/weekly-xp-awards.cjs
-- works out the winners from WOM and pays them through award_weekly_xp below.
--
-- xp_awards is the record of who was paid for which week. It is public to
-- read (the Leaderboard and Profile pages show last week's winners) and only
-- the service role writes it, the same as event_results.
--
-- award_weekly_xp pays a week at most once. The hourly job retries every hour
-- because GitHub's cron is unreliable here, so a week can be offered many
-- times; the advisory lock plus the "already paid" check make every call after
-- the first a no-op, and the UNIQUE constraint backs that up.
--
-- Idempotent: safe to run again against a database that already has it.
--
-- MUST BE APPLIED TO PRODUCTION BY HAND. Merging does not run migrations.

CREATE TABLE IF NOT EXISTS xp_awards (
  id BIGSERIAL PRIMARY KEY,
  week_start TIMESTAMPTZ NOT NULL,
  week_end TIMESTAMPTZ NOT NULL,
  wom_id INTEGER NOT NULL,
  player_name TEXT NOT NULL,
  placement INTEGER NOT NULL CHECK (placement >= 1),
  xp_gained BIGINT NOT NULL,
  points_awarded INTEGER NOT NULL CHECK (points_awarded >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT xp_awards_one_per_member_per_week UNIQUE (week_start, wom_id)
);

CREATE INDEX IF NOT EXISTS xp_awards_week_start_idx ON xp_awards (week_start DESC);

ALTER TABLE xp_awards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS xp_awards_public_read ON xp_awards;
CREATE POLICY xp_awards_public_read ON xp_awards
  FOR SELECT USING (true);

DROP POLICY IF EXISTS xp_awards_service_role_all ON xp_awards;
CREATE POLICY xp_awards_service_role_all ON xp_awards
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- p_awards: [{ wom_id, player_name, placement, xp_gained, points_awarded }]
-- Returns how many members' scores went up: 0 when the week was already paid.
CREATE OR REPLACE FUNCTION award_weekly_xp(
  p_week_start TIMESTAMPTZ,
  p_week_end TIMESTAMPTZ,
  p_awards JSONB
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  paid INTEGER;
BEGIN
  -- Two runs offering the same week at once queue here instead of both
  -- passing the check below.
  PERFORM pg_advisory_xact_lock(hashtext('award_weekly_xp'));

  IF EXISTS (SELECT 1 FROM xp_awards WHERE week_start = p_week_start) THEN
    RETURN 0;
  END IF;

  INSERT INTO xp_awards (week_start, week_end, wom_id, player_name, placement, xp_gained, points_awarded)
  SELECT
    p_week_start,
    p_week_end,
    (a->>'wom_id')::INTEGER,
    a->>'player_name',
    (a->>'placement')::INTEGER,
    (a->>'xp_gained')::BIGINT,
    (a->>'points_awarded')::INTEGER
  FROM jsonb_array_elements(p_awards) AS a
  -- Only members can hold a score; anyone else in the list is skipped.
  WHERE EXISTS (SELECT 1 FROM members m WHERE m.wom_id = (a->>'wom_id')::INTEGER);

  UPDATE members m
  SET siege_score = COALESCE(m.siege_score, 0) + x.points_awarded,
      updated_at = NOW()
  FROM xp_awards x
  WHERE x.week_start = p_week_start
    AND x.wom_id = m.wom_id;

  GET DIAGNOSTICS paid = ROW_COUNT;
  RETURN paid;
END;
$$;

-- Postgres grants EXECUTE on a new function to PUBLIC; this one moves Siege
-- Score, so only the service-role sync job may call it.
REVOKE ALL ON FUNCTION award_weekly_xp(TIMESTAMPTZ, TIMESTAMPTZ, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION award_weekly_xp(TIMESTAMPTZ, TIMESTAMPTZ, JSONB) TO service_role;
