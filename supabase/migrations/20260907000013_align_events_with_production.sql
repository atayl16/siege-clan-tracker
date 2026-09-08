-- Migration: bring events into line with production, and add the two tables
-- the migrations never described
--
-- The last known drift. Production's events table carries nine columns that
-- appear in no migration, and the hourly sync reads and writes them:
-- wom-events.cjs filters on `type`, sets points_processed, skipped_reason and
-- processing_started_at, and the UI reads event.type and event.metric
-- (EventsTable.jsx, EventsPage.jsx). The migrations describe an `event_type`
-- column instead, which production does not have and nothing reads.
--
-- Two whole tables are missing here as well:
--
--   event_results  placements and points awarded per member
--   admins         backs the events RLS policy
--                  auth.uid() IN (SELECT admins.id FROM admins)
--
-- So the events and points pipeline works in production and would break
-- entirely on a database built from these migrations. Same shape as the races
-- and goals drift fixed in 20260907000007: the app is right, the migrations are
-- stale.
--
-- Verified column by column against the live schema on 2026-09-07.
--
-- Additive, as before. No drops and no type changes: every statement is a no-op
-- against production. `event_type` is left in place locally - nothing reads it,
-- and dropping columns in a migration that may one day run against production
-- is not worth the risk.
--
-- Types match production exactly, including event_results.wom_id being text
-- rather than integer. That looks like a mistake, but matching it is the point:
-- this migration exists so local behaves the way production does.

ALTER TABLE events ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_wom BOOLEAN DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS wom_id INTEGER;
ALTER TABLE events ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS metric TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS winner_username TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS points_processed BOOLEAN DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS skipped_reason TEXT;

-- Backs the events RLS policy in production. Rows are auth user ids; there is
-- no separate primary key.
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id),
  wom_id TEXT,
  player_name TEXT,
  placement INTEGER,
  points_awarded INTEGER DEFAULT 0,
  progress NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_results ENABLE ROW LEVEL SECURITY;

-- Mirrors production: results are public to read, and only the service role
-- writes them - the sync job that awards points runs with it.
DROP POLICY IF EXISTS event_results_public_read ON event_results;
CREATE POLICY event_results_public_read ON event_results
  FOR SELECT USING (true);

DROP POLICY IF EXISTS event_results_service_role_all ON event_results;
CREATE POLICY event_results_service_role_all ON event_results
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- No policy for anon or authenticated on admins: membership of that table is
-- what grants event management, so it must not be readable or writable from a
-- browser.
DROP POLICY IF EXISTS admins_service_role_all ON admins;
CREATE POLICY admins_service_role_all ON admins
  FOR ALL TO service_role USING (true) WITH CHECK (true);
