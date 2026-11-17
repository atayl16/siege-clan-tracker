-- Migration: Siege Score x10
--
-- The owner moved every Siege Score award to 10x its old amount (2026-11-17):
-- competitions 15/10/5/2 -> 150/100/50/20, weekly XP 15/10/5/2/2 ->
-- 150/100/50/20/20, and the admin add-points buttons the same. This scales
-- what has already been awarded to match, so nobody's position changes:
--
--   members.siege_score            the score itself
--   event_results.points_awarded   competition history
--   xp_awards.points_awarded       weekly XP history
--
-- RUN EXACTLY ONCE, and it makes sure of that: running it twice would make
-- scores 100x. The first run records 'siege_score_x10' in data_migrations
-- and scales; every later run finds the record and changes nothing. All of
-- it is one DO block, so it scales everything or nothing.
--
-- It locks the three tables while it runs, so an award arriving at the same
-- moment waits for it rather than racing it. Awards add to the current score
-- (award_competition_points since 20261111000001, award_weekly_xp from the
-- start), so one that runs after this adds its new-scale points on top.
--
-- Ordering with the code change: the sync and the site must be on the new
-- amounts from the first award after this runs. Apply this and deploy the
-- code before the next award (competitions and the XP week close Monday
-- 19:00 UK); between the two, nothing awards points except an admin pressing
-- an add-points button.
--
-- MUST BE APPLIED TO PRODUCTION BY HAND. Merging does not run migrations.

-- One row per one-off data change that must never run twice.
CREATE TABLE IF NOT EXISTS data_migrations (
  name TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- No policies: only the service role and the database owner can see it.
ALTER TABLE data_migrations ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  scaled_members INTEGER;
  scaled_results INTEGER;
  scaled_xp INTEGER;
BEGIN
  INSERT INTO data_migrations (name) VALUES ('siege_score_x10')
  ON CONFLICT (name) DO NOTHING;

  IF NOT FOUND THEN
    RAISE NOTICE 'siege_score_x10 was already applied; nothing changed.';
    RETURN;
  END IF;

  -- Writers wait; readers (the site) carry on.
  LOCK TABLE members, event_results, xp_awards IN SHARE ROW EXCLUSIVE MODE;

  UPDATE members SET siege_score = siege_score * 10
  WHERE siege_score IS NOT NULL AND siege_score <> 0;
  GET DIAGNOSTICS scaled_members = ROW_COUNT;

  UPDATE event_results SET points_awarded = points_awarded * 10
  WHERE points_awarded IS NOT NULL AND points_awarded <> 0;
  GET DIAGNOSTICS scaled_results = ROW_COUNT;

  UPDATE xp_awards SET points_awarded = points_awarded * 10
  WHERE points_awarded <> 0;
  GET DIAGNOSTICS scaled_xp = ROW_COUNT;

  RAISE NOTICE 'siege_score_x10 applied: % member scores, % competition results, % weekly XP awards scaled.',
    scaled_members, scaled_results, scaled_xp;
END;
$$;
