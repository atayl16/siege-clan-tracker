-- Migration: Fix RLS policies for claim_requests to allow unauthenticated inserts
-- Description: Allow anyone to create claim requests (they provide user_id in the request)
-- This matches the security model where users register via custom auth but may not have Supabase Auth sessions

-- First, ensure RLS is enabled
ALTER TABLE claim_requests ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "allow_public_read_claim_requests" ON claim_requests;
DROP POLICY IF EXISTS "allow_authenticated_read_claim_requests" ON claim_requests;
DROP POLICY IF EXISTS "allow_authenticated_insert_claim_requests" ON claim_requests;
DROP POLICY IF EXISTS "allow_service_role_all_claim_requests" ON claim_requests;

-- Allow ANYONE (authenticated or not) to read claim requests
CREATE POLICY "allow_all_read_claim_requests"
  ON claim_requests
  FOR SELECT
  USING (true);

-- Allow ANYONE (authenticated or not) to insert claim requests
-- Security: user_id is provided in the request and validated by foreign key
CREATE POLICY "allow_all_insert_claim_requests"
  ON claim_requests
  FOR INSERT
  WITH CHECK (true);

-- Allow service role full access for admin operations
CREATE POLICY "allow_service_role_all_claim_requests"
  ON claim_requests
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Comments
COMMENT ON POLICY "allow_all_read_claim_requests" ON claim_requests IS
  'Anyone can read claim requests (public data)';

COMMENT ON POLICY "allow_all_insert_claim_requests" ON claim_requests IS
  'Anyone can create claim requests - user_id is validated by foreign key constraint';

COMMENT ON POLICY "allow_service_role_all_claim_requests" ON claim_requests IS
  'Service role has full access for admin operations';
