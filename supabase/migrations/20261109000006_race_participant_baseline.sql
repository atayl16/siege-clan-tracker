-- Migration: record when a race participant's baseline was taken
--
-- Race progress is the amount gained after the race starts. The hourly sync
-- (scripts/sync-tasks/race-progress.cjs) records each participant's starting
-- value once, then updates current_value with the gain since.
--
-- New participants are inserted with start_value = 0 and current_value = 0
-- (both NOT NULL), which is also what a real baseline of zero looks like, so
-- the sync cannot tell "never measured" from "measured at 0". This column is
-- that marker: NULL until the sync records the baseline. Editing a
-- participant's character or metric clears it, so they are re-baselined.
--
-- Existing participants get NULL and are baselined on the next sync run.
--
-- Idempotent. MUST BE APPLIED TO PRODUCTION BY HAND, before the app change
-- that writes this column is deployed. Merging does not run migrations.

ALTER TABLE race_participants
  ADD COLUMN IF NOT EXISTS baseline_set_at TIMESTAMP WITH TIME ZONE;
