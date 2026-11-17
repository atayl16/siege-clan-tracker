-- Migration: weekly titles
--
-- Nine weekly title races (The Warrior, The Grinder, The Clogger, ...; the
-- list, minimums and points live in src/utils/weeklyTitles.js). Each week,
-- Monday 19:00 to Monday 19:00 UK, the top 3 at or over a title's minimum earn
-- 150 / 100 / 50 Siege Score and 1st holds the title. The hourly job
-- scripts/sync-tasks/weekly-titles.cjs writes everything here.
--
--   weekly_title_standings  live standings for the week in progress, replaced
--                           every hourly run (The Boss Hunter alone adds up
--                           72 WOM metrics, too many for a page view to fetch)
--   weekly_title_weeks      one row per week that has been awarded, even when
--                           no title had a qualifier: what makes a week
--                           "done", so it is never awarded twice
--   weekly_title_awards     who placed in which title, and the points paid
--
-- All three are public to read (the Leaderboard shows them) and only the
-- service role writes, through the two functions below.
--
-- Idempotent: safe to run again against a database that already has it.
--
-- MUST BE APPLIED TO PRODUCTION BY HAND. Merging does not run migrations.

CREATE TABLE IF NOT EXISTS weekly_title_standings (
  week_start TIMESTAMPTZ NOT NULL,
  title TEXT NOT NULL,
  wom_id INTEGER NOT NULL,
  player_name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (week_start, title, wom_id)
);

CREATE TABLE IF NOT EXISTS weekly_title_weeks (
  week_start TIMESTAMPTZ PRIMARY KEY,
  week_end TIMESTAMPTZ NOT NULL,
  awards INTEGER NOT NULL,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS weekly_title_awards (
  id BIGSERIAL PRIMARY KEY,
  week_start TIMESTAMPTZ NOT NULL REFERENCES weekly_title_weeks (week_start),
  week_end TIMESTAMPTZ NOT NULL,
  title TEXT NOT NULL,
  wom_id INTEGER NOT NULL,
  player_name TEXT NOT NULL,
  placement INTEGER NOT NULL CHECK (placement >= 1),
  value NUMERIC NOT NULL,
  points_awarded INTEGER NOT NULL CHECK (points_awarded >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT weekly_title_awards_one_per_member UNIQUE (week_start, title, wom_id)
);

CREATE INDEX IF NOT EXISTS weekly_title_awards_week_idx ON weekly_title_awards (week_start DESC);

ALTER TABLE weekly_title_standings ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_title_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_title_awards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS weekly_title_standings_public_read ON weekly_title_standings;
CREATE POLICY weekly_title_standings_public_read ON weekly_title_standings FOR SELECT USING (true);
DROP POLICY IF EXISTS weekly_title_standings_service_role_all ON weekly_title_standings;
CREATE POLICY weekly_title_standings_service_role_all ON weekly_title_standings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS weekly_title_weeks_public_read ON weekly_title_weeks;
CREATE POLICY weekly_title_weeks_public_read ON weekly_title_weeks FOR SELECT USING (true);
DROP POLICY IF EXISTS weekly_title_weeks_service_role_all ON weekly_title_weeks;
CREATE POLICY weekly_title_weeks_service_role_all ON weekly_title_weeks
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS weekly_title_awards_public_read ON weekly_title_awards;
CREATE POLICY weekly_title_awards_public_read ON weekly_title_awards FOR SELECT USING (true);
DROP POLICY IF EXISTS weekly_title_awards_service_role_all ON weekly_title_awards;
CREATE POLICY weekly_title_awards_service_role_all ON weekly_title_awards
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Replace the live standings with this run's: p_rows is
-- [{ title, wom_id, player_name, value }]. Earlier weeks' rows go too; the
-- table only ever holds the week in progress. One transaction, so the site
-- never sees a half-written table.
CREATE OR REPLACE FUNCTION set_weekly_title_standings(p_week_start TIMESTAMPTZ, p_rows JSONB)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  written INTEGER;
BEGIN
  -- "WHERE true", not a bare DELETE: Supabase's safeupdate refuses a DELETE
  -- with no WHERE clause on API requests, functions they call included.
  DELETE FROM weekly_title_standings WHERE true;

  INSERT INTO weekly_title_standings (week_start, title, wom_id, player_name, value)
  SELECT p_week_start, r->>'title', (r->>'wom_id')::INTEGER, r->>'player_name', (r->>'value')::NUMERIC
  FROM jsonb_array_elements(p_rows) AS r;

  GET DIAGNOSTICS written = ROW_COUNT;
  RETURN written;
END;
$$;

-- Award a finished week: p_awards is
-- [{ title, wom_id, player_name, placement, value, points_awarded }], possibly
-- empty (a week where nobody qualified for anything is still recorded as
-- done). Adds each member's points, summed across titles, to their score.
-- Returns how many members' scores went up: 0 when the week was already done.
CREATE OR REPLACE FUNCTION award_weekly_titles(p_week_start TIMESTAMPTZ, p_week_end TIMESTAMPTZ, p_awards JSONB)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  paid INTEGER;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('award_weekly_titles'));

  IF EXISTS (SELECT 1 FROM weekly_title_weeks WHERE week_start = p_week_start) THEN
    RETURN 0;
  END IF;

  INSERT INTO weekly_title_weeks (week_start, week_end, awards)
  VALUES (p_week_start, p_week_end, jsonb_array_length(p_awards));

  INSERT INTO weekly_title_awards (week_start, week_end, title, wom_id, player_name, placement, value, points_awarded)
  SELECT
    p_week_start,
    p_week_end,
    a->>'title',
    (a->>'wom_id')::INTEGER,
    a->>'player_name',
    (a->>'placement')::INTEGER,
    (a->>'value')::NUMERIC,
    (a->>'points_awarded')::INTEGER
  FROM jsonb_array_elements(p_awards) AS a
  -- Only members can hold a score; anyone else in the list is skipped.
  WHERE EXISTS (SELECT 1 FROM members m WHERE m.wom_id = (a->>'wom_id')::INTEGER);

  UPDATE members m
  SET siege_score = COALESCE(m.siege_score, 0) + t.points,
      updated_at = NOW()
  FROM (
    SELECT wom_id, SUM(points_awarded)::INTEGER AS points
    FROM weekly_title_awards
    WHERE week_start = p_week_start
    GROUP BY wom_id
  ) t
  WHERE m.wom_id = t.wom_id;

  GET DIAGNOSTICS paid = ROW_COUNT;
  RETURN paid;
END;
$$;

-- Both functions write; only the service-role sync job may call them.
REVOKE ALL ON FUNCTION set_weekly_title_standings(TIMESTAMPTZ, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION set_weekly_title_standings(TIMESTAMPTZ, JSONB) TO service_role;
REVOKE ALL ON FUNCTION award_weekly_titles(TIMESTAMPTZ, TIMESTAMPTZ, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION award_weekly_titles(TIMESTAMPTZ, TIMESTAMPTZ, JSONB) TO service_role;
