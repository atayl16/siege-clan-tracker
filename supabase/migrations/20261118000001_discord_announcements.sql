-- Migration: discord_announcements
--
-- A record of what the bot has announced in Discord, so each announcement is
-- posted once. The first user is the weekly titles post
-- (scripts/sync-tasks/announce-weekly-titles.cjs, kind 'weekly_titles'); other
-- weekly announcements can use the same table with their own kind.
--
-- The job inserts the row BEFORE posting, as a claim: the unique constraint
-- means two runs that overlap cannot both post. If the post then fails the
-- job deletes its claim, so a later run tries again. message_id is filled in
-- once Discord has accepted the post.
--
-- Service role only: nothing on the site reads it.
--
-- Idempotent: safe to run again against a database that already has it.
--
-- MUST BE APPLIED TO PRODUCTION BY HAND. Merging does not run migrations.

CREATE TABLE IF NOT EXISTS discord_announcements (
  id BIGSERIAL PRIMARY KEY,
  kind TEXT NOT NULL,
  week_start TIMESTAMPTZ NOT NULL,
  channel_id TEXT NOT NULL,
  message_id TEXT,
  posted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT discord_announcements_once UNIQUE (kind, week_start)
);

ALTER TABLE discord_announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS discord_announcements_service_role_all ON discord_announcements;
CREATE POLICY discord_announcements_service_role_all ON discord_announcements
  FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE discord_announcements FROM anon, authenticated;
REVOKE ALL ON SEQUENCE discord_announcements_id_seq FROM anon, authenticated;
