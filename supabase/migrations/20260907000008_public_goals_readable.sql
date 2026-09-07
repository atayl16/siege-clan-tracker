-- Migration: let anyone read goals that are marked public
--
-- user_goals_own_rows (20260907000005) scopes reads to user_id = auth.uid(),
-- which is right for a member's own goals but makes the public goals board
-- impossible: it is meant to show goals other members chose to share, and under
-- that policy alone a viewer only ever sees their own.
--
-- The `public` column exists for exactly this - it is in production and was
-- added back when races and goals were built (commit 7034f77). It defaults to
-- false, so nothing becomes visible unless a member opts in.
--
-- Two policies on the same table are OR'd together, so a signed-in member still
-- sees all of their own goals whether public or not, and additionally sees
-- other people's public ones.

DROP POLICY IF EXISTS user_goals_public_read ON user_goals;
CREATE POLICY user_goals_public_read ON user_goals
  FOR SELECT
  USING (public = true);
