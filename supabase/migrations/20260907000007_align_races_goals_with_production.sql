-- Migration: bring races, race_participants and user_goals into line with
-- production
--
-- The app reads columns that production has and these migrations do not, so a
-- database built from migrations is not a usable copy of production for
-- anything involving races or goals. Verified column by column against the live
-- API on 2026-09-07:
--
--   races             prod has creator_id, title, public, status
--                     migrations had name, start_date, metric instead
--   race_participants prod has player_name, metric, target_value,
--                     current_value, is_winner
--                     migrations had start_value, end_value only
--   user_goals        prod has metric, start_value, target_date,
--                     completed_date, public
--                     migrations had none of those
--
-- The original shape is in supabase/production-full-backup-20251104.sql and in
-- commit 7034f77 "Add races and anniversaries" - the features were built
-- against it, then the migrations drifted away and nobody noticed, because
-- nothing exercised these tables locally.
--
-- This is why ProgressPage looked unsalvageable: it reads race.public,
-- creator_id and goal.public, which are absent locally and present in
-- production. The page's real problem is a hook contract mismatch, not a
-- missing schema.
--
-- Additive on purpose. No drops, no type changes: every statement is a no-op
-- against production, which already has these columns, and a local database
-- gains what it was missing. Columns that exist only locally (races.name,
-- races.start_date, races.metric, race_participants.end_value) are left alone
-- rather than dropped - harmless, and dropping columns in a migration that
-- might one day run against production is not worth the risk.
--
-- Perfect fidelity needs a rebaseline from a real dump, which needs the
-- production database password. Until then this closes the gap that blocks
-- testing.

-- ---------------------------------------------------------------- races
ALTER TABLE races ADD COLUMN IF NOT EXISTS creator_id UUID;
ALTER TABLE races ADD COLUMN IF NOT EXISTS public BOOLEAN DEFAULT false;
ALTER TABLE races ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Production calls it title; the migrations called it name. Rename only when
-- the local spelling is present and the production one is not, so this does
-- nothing on production and nothing on a second run.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'races' AND column_name = 'name'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'races' AND column_name = 'title'
  ) THEN
    ALTER TABLE races RENAME COLUMN name TO title;
  END IF;
END $$;

-- ------------------------------------------------- race_participants
ALTER TABLE race_participants ADD COLUMN IF NOT EXISTS player_name TEXT;
ALTER TABLE race_participants ADD COLUMN IF NOT EXISTS metric TEXT;
ALTER TABLE race_participants ADD COLUMN IF NOT EXISTS target_value INTEGER;
ALTER TABLE race_participants ADD COLUMN IF NOT EXISTS current_value INTEGER;
ALTER TABLE race_participants ADD COLUMN IF NOT EXISTS is_winner BOOLEAN DEFAULT false;
ALTER TABLE race_participants ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ----------------------------------------------------------- user_goals
ALTER TABLE user_goals ADD COLUMN IF NOT EXISTS metric TEXT;
ALTER TABLE user_goals ADD COLUMN IF NOT EXISTS start_value BIGINT;
ALTER TABLE user_goals ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE user_goals ADD COLUMN IF NOT EXISTS target_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE user_goals ADD COLUMN IF NOT EXISTS completed_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE user_goals ADD COLUMN IF NOT EXISTS public BOOLEAN DEFAULT false;
