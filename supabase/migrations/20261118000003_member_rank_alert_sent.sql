-- Migration: members.rank_alert_sent
--
-- The rank the staff Discord channel was last told this member has earned
-- (scripts/sync-tasks/rank-up-alerts.cjs), lowercase as in womrole. The
-- hourly job announces a rank-up only when the earned rank differs from
-- this, so each rank is announced once: promoting the member clears the
-- alert, and earning the next rank announces that one.
--
-- Set by the job with a conditional update BEFORE posting, so overlapping
-- runs cannot both post. NULL means nothing announced yet.
--
-- Idempotent: safe to run again.
--
-- MUST BE APPLIED TO PRODUCTION BY HAND. Merging does not run migrations.

ALTER TABLE members ADD COLUMN IF NOT EXISTS rank_alert_sent TEXT;
