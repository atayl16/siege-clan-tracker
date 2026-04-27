-- ROLLBACK for Migration 20250104000003: RLS Policies
-- Run this if you need to undo the RLS policies migration
-- WARNING: This will remove security policies - only use if you need to rollback!

-- Drop all policies created by the migration
DO $$
BEGIN
  -- Members policies
  DROP POLICY IF EXISTS "allow_public_read_visible_members" ON members;
  DROP POLICY IF EXISTS "allow_service_role_all_members" ON members;

  -- Users policies
  DROP POLICY IF EXISTS "allow_authenticated_read_users" ON users;
  DROP POLICY IF EXISTS "allow_users_read_own_profile" ON users;
  DROP POLICY IF EXISTS "allow_service_role_all_users" ON users;

  -- Events policies
  DROP POLICY IF EXISTS "allow_public_read_events" ON events;

  -- Claim requests policies
  DROP POLICY IF EXISTS "allow_public_read_claim_requests" ON claim_requests;

  -- Races policies
  DROP POLICY IF EXISTS "allow_public_read_races" ON races;
  DROP POLICY IF EXISTS "allow_public_read_race_participants" ON race_participants;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

-- Disable RLS on all tables (CAREFUL - this removes security!)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'members') THEN
    ALTER TABLE members DISABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
    ALTER TABLE users DISABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'events') THEN
    ALTER TABLE events DISABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'claim_requests') THEN
    ALTER TABLE claim_requests DISABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'races') THEN
    ALTER TABLE races DISABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'race_participants') THEN
    ALTER TABLE race_participants DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Mark migration as reverted in Supabase history
-- (You'll need to run: supabase migration repair 20250104000003 --status reverted --linked)
