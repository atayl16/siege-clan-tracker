-- Migration: RLS policies for registration and goals
--
-- Both of these were applied by hand on 2026-09-07 - to production through the
-- SQL editor, and locally with psql - and never written down. A fresh database
-- (CI, or `supabase db reset`) therefore did not have them, registration failed
-- silently, and the claim tests fell over later with a confusing foreign key
-- error rather than the real cause:
--
--   23503 Key (user_id)=(...) is not present in table "users"
--
-- which is what a missing INSERT policy on users looks like two steps
-- downstream. Writing them down here is what stops production, local and CI
-- from drifting apart again.
--
-- Idempotent, so re-running against a database that already has them is a
-- no-op.

-- Registration. AuthContext.register() calls supabase.auth.signUp() and then
-- inserts the matching public.users row. `users` had SELECT policies only, so
-- that insert failed with 42501 and left an orphaned auth account behind -
-- registration could never complete.
--
-- WITH CHECK pins the row to the caller: id = auth.uid() means nobody can
-- create a row for someone else, and `is_admin = false` stops a new account
-- registering itself as an admin. Without the second clause a signed-in user
-- could insert their own row with is_admin = true and pass the check in
-- validateAuth() (netlify/functions/utils/adminHelpers.cjs), which is the same
-- escalation register_admin_user() allowed before it was revoked.
DROP POLICY IF EXISTS users_insert_own_row ON users;
CREATE POLICY users_insert_own_row ON users
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() AND is_admin = false);

-- Goals. user_goals had a service_role policy only, so client reads returned
-- an empty array with HTTP 200 - the data was there, the request succeeded, and
-- the user saw nothing, with no error to chase. Writes failed with 42501.
DROP POLICY IF EXISTS user_goals_own_rows ON user_goals;
CREATE POLICY user_goals_own_rows ON user_goals
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
