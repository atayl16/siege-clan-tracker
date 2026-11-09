-- Migration: stop the anon key calling SECURITY DEFINER functions that
-- nothing in the app calls with it
--
-- 20261009000001 closed admin_update_member and admin_toggle_member_visibility.
-- Auditing production afterwards (2026-10-09) found more SECURITY DEFINER
-- functions in public that anon could EXECUTE. None of them is in this
-- repo's migrations - production carries them from before the migrations
-- folder was kept up - and nothing in src/, netlify/ or scripts/ calls them:
--
--   execute_sql(text)                          runs arbitrary SQL as owner
--   set_admin_status(uuid, boolean)            }
--   admin_set_user_admin_status(uuid, boolean) } make anyone an admin
--   admin_toggle_user_admin(uuid, boolean)     }
--   admin_delete_member(integer)
--   admin_upsert_member(jsonb), (uuid, jsonb)
--   admin_generate_claim_code(uuid, text, integer)
--   admin_get_all_claim_requests(integer)
--   create_user(uuid, text, text, boolean)
--   get_user_by_email(text)
--
-- Each runs as its owner and bypasses RLS, so with the anon key from the
-- frontend bundle anyone could, at the least, make themselves an admin.
--
-- Revoked from PUBLIC, anon and authenticated; granted to service_role, so
-- anything server-side keeps working. A function that an RLS policy calls is
-- skipped with a NOTICE rather than revoked: policy expressions run as the
-- querying role, and revoking would break ordinary reads.
--
-- Deliberately not touched here, pending a look at their definitions and the
-- policies that use them: get_user_goals (the live goals code calls it until
-- the goals fix deploys), is_admin, is_admin_by_id, compare_uuids,
-- claim_player_with_code. handle_new_user is a trigger function and cannot
-- be called directly.
--
-- Idempotent. Functions that do not exist (any fresh database built from
-- these migrations) are simply not in the loop.
--
-- Applied to production by hand on 2026-10-09. Merging does not run
-- migrations.

DO $$
DECLARE
  fn regprocedure;
  fname text;
  used_by_policy boolean;
BEGIN
  FOR fn, fname IN
    SELECT p.oid::regprocedure, p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'execute_sql',
        'set_admin_status',
        'admin_set_user_admin_status',
        'admin_toggle_user_admin',
        'admin_delete_member',
        'admin_upsert_member',
        'admin_generate_claim_code',
        'admin_get_all_claim_requests',
        'create_user',
        'get_user_by_email'
      )
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM pg_policy pol
      WHERE coalesce(pg_get_expr(pol.polqual, pol.polrelid), '') ~ ('\m' || fname || '\M')
         OR coalesce(pg_get_expr(pol.polwithcheck, pol.polrelid), '') ~ ('\m' || fname || '\M')
    ) INTO used_by_policy;

    IF used_by_policy THEN
      RAISE NOTICE 'SKIPPED % - an RLS policy uses it', fn;
      CONTINUE;
    END IF;

    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', fn);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', fn);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
    RAISE NOTICE 'Restricted % to service_role', fn;
  END LOOP;
END;
$$;
