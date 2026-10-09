-- Migration: stop the anon key calling admin_update_member and
-- admin_toggle_member_visibility
--
-- Both are SECURITY DEFINER, so they run as their owner and bypass RLS on
-- members. Postgres grants EXECUTE on every new function to PUBLIC, and the
-- migrations that created them (20250104000004, 20260410000001) only ever
-- added a GRANT to service_role - they never took PUBLIC's away. So anyone
-- holding the anon key, which ships in the frontend bundle, could call
--
--   POST /rest/v1/rpc/admin_update_member
--   {"member_id": <wom_id>, "updated_data": {"hidden": true, "siege_score": 0}}
--
-- and rewrite or hide any member without going near the Netlify functions,
-- whose validateAuth is the only admin check on this path.
--
-- 20260907000012 closed exactly this for admin_change_member_rank. This does
-- the same for the other two.
--
-- Only the service-role Netlify functions call these (admin-update-member.cjs,
-- admin-toggle-member-visibility.cjs); nothing in the browser does. So
-- revoking from anon and authenticated changes nothing a user can see.
--
-- Every overload is revoked, not just the signature in this repo. Production
-- carried a second bigint overload of admin_change_member_rank that the
-- migrations never described (see 000012), so it may carry them here too, and
-- a REVOKE naming one signature would leave the other callable.
--
-- Idempotent: REVOKE of a privilege that is not held is a no-op, and a
-- function that does not exist is simply not in the loop.
--
-- MUST BE APPLIED TO PRODUCTION BY HAND. Merging does not run migrations.

DO $$
DECLARE
  fn regprocedure;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('admin_update_member', 'admin_toggle_member_visibility')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', fn);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', fn);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
    RAISE NOTICE 'Restricted % to service_role', fn;
  END LOOP;
END;
$$;
