-- Migration: stop the anon key calling get_user_goals
--
-- get_user_goals(uuid) exists only in production; no migration creates it.
-- It returns the goals of whatever user id it is given, and anon could
-- EXECUTE it, so anyone with the anon key from the frontend bundle could
-- read any member's goals, private ones included, bypassing
-- user_goals_own_rows.
--
-- The app stopped calling it in #106 (goalProgressService reads user_goals
-- directly, under RLS), so nothing a user does needs it any more.
--
-- Same pattern as 20261009000002: revoke from PUBLIC, anon and
-- authenticated, grant to service_role, and skip the function with a
-- NOTICE if an RLS policy depends on it. That check uses pg_depend, which
-- records exactly the functions a policy expression references.
--
-- Idempotent. On a database built from these migrations the function does
-- not exist and the loop does nothing.
--
-- Applied to production by hand on 2026-11-09. Merging does not run
-- migrations.

DO $$
DECLARE
  fn regprocedure;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'get_user_goals'
  LOOP
    IF EXISTS (SELECT 1 FROM pg_depend d
               WHERE d.classid = 'pg_policy'::regclass
                 AND d.refclassid = 'pg_proc'::regclass
                 AND d.refobjid = fn::oid) THEN
      RAISE NOTICE 'SKIPPED % - an RLS policy uses it', fn;
      CONTINUE;
    END IF;
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
    RAISE NOTICE 'Restricted % to service_role', fn;
  END LOOP;
END;
$$;
