-- Migration: let a race's creator edit and remove its participants
--
-- 20260907000009 let members create races and add participants to their own
-- race, and update or delete their own race - but race_participants only got
-- INSERT and SELECT policies. With RLS on, an UPDATE or DELETE that no policy
-- allows affects zero rows without an error, so editing a race's participants
-- from the new edit page would have "saved" and changed nothing.
--
-- Same rule as the insert policy: permission follows the race's creator.
--
-- If races later carry wagers or pots and editing becomes admin-only, replace
-- these two policies and races_update_own (20260907000009) with admin checks,
-- and change canEditRace in src/utils/races.js to match.
--
-- Idempotent. MUST BE APPLIED TO PRODUCTION BY HAND. Merging does not run
-- migrations.

DROP POLICY IF EXISTS race_participants_update_for_own_race ON race_participants;
CREATE POLICY race_participants_update_for_own_race ON race_participants
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM races r
            WHERE r.id = race_participants.race_id AND r.creator_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM races r
            WHERE r.id = race_participants.race_id AND r.creator_id = auth.uid())
  );

DROP POLICY IF EXISTS race_participants_delete_for_own_race ON race_participants;
CREATE POLICY race_participants_delete_for_own_race ON race_participants
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM races r
            WHERE r.id = race_participants.race_id AND r.creator_id = auth.uid())
  );
