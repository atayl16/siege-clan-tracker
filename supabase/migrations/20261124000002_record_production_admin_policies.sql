-- Migration: record production's admin RLS policies
--
-- Production has seven RLS policies that let an admin read or write
-- everything in five tables, and two helper functions they call. No migration
-- created any of them, so a local database built from this folder behaved
-- differently from production. That gap let a real bug through on 2026-11-23:
-- Profile > Your Requests relied on RLS to show a member only their own claim
-- requests, and on production admin_full_access showed an admin everyone's.
--
-- This records them exactly as production has them (read from
-- schema_snapshot() and pg_get_functiondef on 2026-11-24), so local tests see
-- what production does. It is a record, not a change:
--   - the functions are CREATE OR REPLACE with production's own bodies
--   - each policy is created only if a policy of that name is missing
-- so running it on production changes nothing.
--
-- Not an endorsement. Note the mismatch: app_auth.is_admin() and
-- is_admin_by_id() match users.id to auth.uid(), while the admin Netlify
-- functions match users.supabase_auth_id. Both columns hold the auth id for
-- accounts created by the current sign-up code.

-- Helper functions -----------------------------------------------------------

CREATE SCHEMA IF NOT EXISTS app_auth;

-- The policies below call app_auth.is_admin() for every reader, signed in or
-- not, so every role needs USAGE on the schema. Without it a fresh database
-- refuses even a public read of members or events ("permission denied for
-- schema app_auth"). Production's public pages read both, so it has this.
GRANT USAGE ON SCHEMA app_auth TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION app_auth.is_admin()
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id::text = auth.uid()::text AND is_admin = true
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_admin_by_id(user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = user_id AND is_admin = true
  );
END;
$function$;

-- Policies -------------------------------------------------------------------

DO $$
DECLARE
  p RECORD;
BEGIN
  FOR p IN
    SELECT * FROM (VALUES
      ('claim_requests', 'admin_full_access',
       'CREATE POLICY admin_full_access ON public.claim_requests FOR ALL TO public
          USING (EXISTS (SELECT 1 FROM public.users
                         WHERE users.id = auth.uid() AND users.is_admin = true))'),
      ('event_results', 'Admins can manage event results',
       'CREATE POLICY "Admins can manage event results" ON public.event_results FOR ALL TO public
          USING (app_auth.is_admin())'),
      ('events', 'Admins can manage events',
       'CREATE POLICY "Admins can manage events" ON public.events FOR ALL TO public
          USING (app_auth.is_admin())'),
      ('members', 'Admins can manage members',
       'CREATE POLICY "Admins can manage members" ON public.members FOR ALL TO public
          USING (public.is_admin_by_id(auth.uid()))
          WITH CHECK (public.is_admin_by_id(auth.uid()))'),
      ('members', 'Admins can view all members',
       'CREATE POLICY "Admins can view all members" ON public.members FOR SELECT TO public
          USING (app_auth.is_admin())'),
      ('user_goals', 'Admins can manage all goals',
       'CREATE POLICY "Admins can manage all goals" ON public.user_goals FOR ALL TO public
          USING (public.is_admin_by_id(auth.uid()))'),
      ('user_goals', 'Admins can view all goals',
       'CREATE POLICY "Admins can view all goals" ON public.user_goals FOR SELECT TO public
          USING (public.is_admin_by_id(auth.uid()))')
    ) AS t(tbl, name, ddl)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = p.tbl AND policyname = p.name
    ) THEN
      EXECUTE p.ddl;
    END IF;
  END LOOP;
END $$;
