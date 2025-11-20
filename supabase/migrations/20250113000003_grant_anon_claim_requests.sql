-- Migration: Grant anon role permissions on claim_requests table
-- Description: Add table-level permissions for anonymous users to read and insert claim requests
-- This is required in addition to RLS policies for the operations to work

-- Grant SELECT permission to anon role
GRANT SELECT ON claim_requests TO anon;

-- Grant INSERT permission to anon role
GRANT INSERT ON claim_requests TO anon;

-- Grant USAGE on the sequence (for auto-incrementing id column)
GRANT USAGE ON SEQUENCE claim_requests_id_seq TO anon;

-- Comments
COMMENT ON TABLE claim_requests IS
  'Claim requests table with anon role having SELECT and INSERT permissions.
   Row-level access is controlled by RLS policies defined in migration 20250113000002.';
