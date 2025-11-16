-- Migration: Add RLS policies for claim_requests table
-- Description: Allows authenticated users to create and read claim requests
-- Created: 2025-01-13

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "allow_public_read_claim_requests" ON claim_requests;
DROP POLICY IF EXISTS "allow_authenticated_insert_claim_requests" ON claim_requests;
DROP POLICY IF EXISTS "allow_authenticated_read_own_requests" ON claim_requests;
DROP POLICY IF EXISTS "allow_service_role_all_claim_requests" ON claim_requests;

-- ============================================
-- CLAIM_REQUESTS TABLE POLICIES
-- ============================================

-- Allow authenticated users to read all claim requests
-- (Needed for admins to see all requests, users to see their own)
CREATE POLICY "allow_authenticated_read_claim_requests"
  ON claim_requests
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Allow authenticated users to insert their own claim requests
CREATE POLICY "allow_authenticated_insert_claim_requests"
  ON claim_requests
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Allow service role to update/delete claim requests (for admin processing)
CREATE POLICY "allow_service_role_all_claim_requests"
  ON claim_requests
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Comments for documentation
COMMENT ON POLICY "allow_authenticated_read_claim_requests" ON claim_requests IS
  'Authenticated and anonymous users can read all claim requests';

COMMENT ON POLICY "allow_authenticated_insert_claim_requests" ON claim_requests IS
  'Authenticated and anonymous users can create claim requests';

COMMENT ON POLICY "allow_service_role_all_claim_requests" ON claim_requests IS
  'Service role has full access for admin operations';
