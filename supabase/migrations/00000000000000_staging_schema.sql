-- ============================================
-- Siege Clan Tracker - Complete Staging Schema
-- ============================================
-- Run this on a fresh Supabase project to set up all tables

-- ============================================
-- MEMBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS members (
  wom_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  wom_name TEXT,
  womrole TEXT DEFAULT 'opal',
  role TEXT,
  build TEXT DEFAULT 'regular',
  join_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  left_date TIMESTAMP WITH TIME ZONE,
  first_xp BIGINT DEFAULT 0,
  first_lvl INTEGER DEFAULT 1,
  current_xp BIGINT DEFAULT 0,
  current_lvl INTEGER DEFAULT 1,
  ehb NUMERIC DEFAULT 0,
  siege_score INTEGER DEFAULT 0,
  hidden BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  runewatch_whitelisted BOOLEAN DEFAULT false,
  runewatch_whitelist_reason TEXT,
  name_history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_members_name ON members(name);
CREATE INDEX IF NOT EXISTS idx_members_hidden ON members(hidden);
CREATE INDEX IF NOT EXISTS idx_members_left_date ON members(left_date);

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT false,
  supabase_auth_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- ============================================
-- CLAIM_CODES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS claim_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  wom_id INTEGER REFERENCES members(wom_id),
  is_claimed BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_claim_codes_code ON claim_codes(code);

-- ============================================
-- PLAYER_CLAIMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS player_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  wom_id INTEGER REFERENCES members(wom_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, wom_id)
);

CREATE INDEX IF NOT EXISTS idx_player_claims_user ON player_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_player_claims_wom ON player_claims(wom_id);

-- ============================================
-- CLAIM_REQUESTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS claim_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  wom_id INTEGER REFERENCES members(wom_id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_claim_requests_user ON claim_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_claim_requests_status ON claim_requests(status);

-- ============================================
-- USER_GOALS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  wom_id INTEGER REFERENCES members(wom_id),
  goal_type TEXT NOT NULL,
  target_value INTEGER,
  current_value INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_goals_user ON user_goals(user_id);

-- ============================================
-- EVENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  event_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- RACES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS races (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  metric TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- RACE_PARTICIPANTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS race_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  race_id UUID REFERENCES races(id) ON DELETE CASCADE,
  wom_id INTEGER REFERENCES members(wom_id),
  start_value BIGINT DEFAULT 0,
  end_value BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- SYNC_LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  last_sync TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT,
  details JSONB
);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE claim_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE claim_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE races ENABLE ROW LEVEL SECURITY;
ALTER TABLE race_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES - MEMBERS
-- ============================================
CREATE POLICY "allow_public_read_visible_members" ON members
  FOR SELECT TO public
  USING (hidden = false OR hidden IS NULL);

CREATE POLICY "allow_service_role_all_members" ON members
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================
-- RLS POLICIES - USERS
-- ============================================
CREATE POLICY "allow_authenticated_read_users" ON users
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "allow_anon_read_users" ON users
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "allow_service_role_all_users" ON users
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================
-- RLS POLICIES - OTHER TABLES
-- ============================================
CREATE POLICY "allow_public_read_events" ON events
  FOR SELECT TO public USING (true);

CREATE POLICY "allow_service_role_all_events" ON events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "allow_public_read_claim_requests" ON claim_requests
  FOR SELECT TO public USING (true);

CREATE POLICY "allow_service_role_all_claim_requests" ON claim_requests
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "allow_service_role_all_claim_codes" ON claim_codes
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "allow_service_role_all_player_claims" ON player_claims
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "allow_public_read_player_claims" ON player_claims
  FOR SELECT TO public USING (true);

CREATE POLICY "allow_service_role_all_user_goals" ON user_goals
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "allow_public_read_races" ON races
  FOR SELECT TO public USING (true);

CREATE POLICY "allow_service_role_all_races" ON races
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "allow_public_read_race_participants" ON race_participants
  FOR SELECT TO public USING (true);

CREATE POLICY "allow_service_role_all_race_participants" ON race_participants
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "allow_service_role_all_sync_logs" ON sync_logs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================
-- RPC FUNCTIONS
-- ============================================

-- admin_update_member (FIXED version - handles all fields)
CREATE OR REPLACE FUNCTION admin_update_member(
  member_id INTEGER,
  updated_data JSONB
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE members
  SET
    name = COALESCE(updated_data->>'name', name),
    wom_name = COALESCE(updated_data->>'wom_name', wom_name),
    womrole = COALESCE(updated_data->>'womrole', womrole),
    first_xp = COALESCE((updated_data->>'first_xp')::BIGINT, first_xp),
    first_lvl = COALESCE((updated_data->>'first_lvl')::INTEGER, first_lvl),
    current_xp = COALESCE((updated_data->>'current_xp')::BIGINT, current_xp),
    current_lvl = COALESCE((updated_data->>'current_lvl')::INTEGER, current_lvl),
    ehb = COALESCE((updated_data->>'ehb')::NUMERIC, ehb),
    siege_score = COALESCE((updated_data->>'siege_score')::INTEGER, siege_score),
    join_date = COALESCE((updated_data->>'join_date')::TIMESTAMP WITH TIME ZONE, join_date),
    hidden = COALESCE((updated_data->>'hidden')::BOOLEAN, hidden),
    runewatch_whitelisted = COALESCE((updated_data->>'runewatch_whitelisted')::BOOLEAN, runewatch_whitelisted),
    runewatch_whitelist_reason = COALESCE(updated_data->>'runewatch_whitelist_reason', runewatch_whitelist_reason),
    updated_at = NOW()
  WHERE wom_id = member_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member with wom_id % not found', member_id;
  END IF;
END;
$$;

-- admin_toggle_member_visibility
CREATE OR REPLACE FUNCTION admin_toggle_member_visibility(
  member_id INTEGER,
  is_hidden BOOLEAN
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE members
  SET hidden = is_hidden, updated_at = NOW()
  WHERE wom_id = member_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member with wom_id % not found', member_id;
  END IF;
END;
$$;

-- admin_change_member_rank
CREATE OR REPLACE FUNCTION admin_change_member_rank(
  member_id INTEGER,
  new_role TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE members
  SET womrole = new_role, updated_at = NOW()
  WHERE wom_id = member_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member with wom_id % not found', member_id;
  END IF;
END;
$$;

-- get_user_claims
CREATE OR REPLACE FUNCTION get_user_claims(user_id_param UUID)
RETURNS TABLE (
  wom_id INTEGER,
  claimed_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT pc.wom_id, pc.created_at as claimed_at
  FROM player_claims pc
  WHERE pc.user_id = user_id_param;
END;
$$;

-- register_admin_user (for hardcoded admin setup)
CREATE OR REPLACE FUNCTION register_admin_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  auth_user_id UUID;
BEGIN
  -- Get the current auth user ID
  auth_user_id := auth.uid();

  IF auth_user_id IS NULL THEN
    RETURN;
  END IF;

  -- Insert or update admin user
  INSERT INTO users (id, username, password_hash, is_admin)
  VALUES (auth_user_id, 'admin', '', true)
  ON CONFLICT (id) DO UPDATE SET is_admin = true;
END;
$$;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
GRANT EXECUTE ON FUNCTION admin_update_member(INTEGER, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION admin_toggle_member_visibility(INTEGER, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION admin_change_member_rank(INTEGER, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION get_user_claims(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_user_claims(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION register_admin_user() TO authenticated;

-- ============================================
-- SAMPLE DATA (optional - comment out if not needed)
-- ============================================
-- Insert a test member
INSERT INTO members (wom_id, name, wom_name, womrole, current_lvl, current_xp, siege_score)
VALUES (1, 'Test Member', 'test_member', 'opal', 100, 1000000, 50)
ON CONFLICT (wom_id) DO NOTHING;
