-- Migration: let members create their own races
--
-- races and race_participants had service_role policies plus a public read on
-- races, and no INSERT for authenticated - so the Create Race form could never
-- have worked from the browser, the same shape of problem as registration and
-- claiming.
--
-- The form in CreateRace.jsx already sends production's columns
-- (creator_id, title, description, public, end_date, and participants with
-- wom_id, player_name, metric, target_value), so only the policies were
-- missing.

-- A member can create a race, and only in their own name. Without the check on
-- creator_id anyone could create a race attributed to someone else.
DROP POLICY IF EXISTS races_insert_own ON races;
CREATE POLICY races_insert_own ON races
  FOR INSERT TO authenticated
  WITH CHECK (creator_id = auth.uid());

-- And edit or remove their own, but nobody else's.
DROP POLICY IF EXISTS races_update_own ON races;
CREATE POLICY races_update_own ON races
  FOR UPDATE TO authenticated
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

DROP POLICY IF EXISTS races_delete_own ON races;
CREATE POLICY races_delete_own ON races
  FOR DELETE TO authenticated
  USING (creator_id = auth.uid());

-- Participants belong to a race, so permission follows the race's creator
-- rather than being granted directly. This is what stops someone adding
-- themselves to a race they did not create.
DROP POLICY IF EXISTS race_participants_insert_for_own_race ON race_participants;
CREATE POLICY race_participants_insert_for_own_race ON race_participants
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM races r
      WHERE r.id = race_participants.race_id
        AND r.creator_id = auth.uid()
    )
  );

-- Participants of a public race are visible to anyone, which is what the
-- public races board shows. Private races stay with their creator.
DROP POLICY IF EXISTS race_participants_read ON race_participants;
CREATE POLICY race_participants_read ON race_participants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM races r
      WHERE r.id = race_participants.race_id
        AND (r.public = true OR r.creator_id = auth.uid())
    )
  );

-- The staging schema granted `USING (true)` reads on both tables, which meant a
-- race marked private was readable by anyone - the flag only ever filtered the
-- UI. Policies are OR'd, so the scoped policies above do nothing while these
-- stand. Dropping them is what makes "private" mean private.
--
-- Signed-out visitors still see every public race and its participants, which
-- is all the public board displays.
DROP POLICY IF EXISTS allow_public_read_race_participants ON race_participants;
DROP POLICY IF EXISTS allow_public_read_races ON races;

DROP POLICY IF EXISTS races_read ON races;
CREATE POLICY races_read ON races
  FOR SELECT
  USING (public = true OR creator_id = auth.uid());
