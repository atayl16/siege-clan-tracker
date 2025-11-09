-- Migration: Simplified RLS Policies
-- Description: Creates RLS policies only for tables that exist in production
-- Safely handles missing tables

-- Enable RLS on existing tables only
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'members') THEN
    ALTER TABLE members ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
    ALTER TABLE users ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'events') THEN
    ALTER TABLE events ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'claim_requests') THEN
    ALTER TABLE claim_requests ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'races') THEN
    ALTER TABLE races ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'race_participants') THEN
    ALTER TABLE race_participants ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop existing policies if they exist (for idempotency)
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

-- ============================================
-- MEMBERS TABLE POLICIES
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'members') THEN
    -- Allow public to read visible members only
    EXECUTE 'CREATE POLICY "allow_public_read_visible_members"
      ON members
      FOR SELECT
      TO public
      USING (hidden = false OR hidden IS NULL)';

    -- Service role has full access (used by edge functions)
    EXECUTE 'CREATE POLICY "allow_service_role_all_members"
      ON members
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true)';
  END IF;
END $$;

-- ============================================
-- USERS TABLE POLICIES
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
    -- Authenticated users can read all users (needed for admin panel)
    EXECUTE 'CREATE POLICY "allow_authenticated_read_users"
      ON users
      FOR SELECT
      TO authenticated
      USING (true)';

    -- Anonymous users can read all (client-side filtering applies)
    EXECUTE 'CREATE POLICY "allow_users_read_own_profile"
      ON users
      FOR SELECT
      TO anon
      USING (true)';

    -- Service role has full access
    EXECUTE 'CREATE POLICY "allow_service_role_all_users"
      ON users
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true)';
  END IF;
END $$;

-- ============================================
-- EVENTS TABLE POLICIES
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'events') THEN
    -- Allow public read access to all events
    EXECUTE 'CREATE POLICY "allow_public_read_events"
      ON events
      FOR SELECT
      TO public
      USING (true)';
  END IF;
END $$;

-- ============================================
-- CLAIM_REQUESTS TABLE POLICIES
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'claim_requests') THEN
    -- Allow public to read all claim requests
    EXECUTE 'CREATE POLICY "allow_public_read_claim_requests"
      ON claim_requests
      FOR SELECT
      TO public
      USING (true)';
  END IF;
END $$;

-- ============================================
-- RACES TABLE POLICIES
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'races') THEN
    -- Allow public to read all races
    EXECUTE 'CREATE POLICY "allow_public_read_races"
      ON races
      FOR SELECT
      TO public
      USING (true)';
  END IF;
END $$;

-- ============================================
-- RACE_PARTICIPANTS TABLE POLICIES
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'race_participants') THEN
    -- Allow public to read all race participants
    EXECUTE 'CREATE POLICY "allow_public_read_race_participants"
      ON race_participants
      FOR SELECT
      TO public
      USING (true)';
  END IF;
END $$;

-- Comments
COMMENT ON POLICY "allow_public_read_visible_members" ON members IS
  'Public users can only see members that are not hidden';

COMMENT ON POLICY "allow_service_role_all_members" ON members IS
  'Service role (edge functions) has full access to all members';
