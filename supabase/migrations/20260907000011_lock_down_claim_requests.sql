-- Migration: close the anon read and forge holes on claim_requests
--
-- 20260907000010 scoped claim_requests to its owner, but only dropped
-- allow_public_read_claim_requests - the name used in the staging schema.
-- Production does not have that policy. It has these instead, from
-- 20250113000002_fix_claim_requests_rls.sql on the abandoned auth branch:
--
--   allow_all_read_claim_requests    FOR SELECT USING (true)
--   allow_all_insert_claim_requests  FOR INSERT WITH CHECK (true)
--
-- plus table-level grants to anon from 20250113000003_grant_anon_claim_requests
-- (SELECT, INSERT, and USAGE on the id sequence).
--
-- Policies are OR'd, so the scoped policy did nothing while these stood.
-- Confirmed against production on 2026-09-07 after 000010 had been applied:
-- anon still read all six rows.
--
-- The read is a leak - admin_notes and every member's requests are visible to
-- anyone with the anon key, which ships in the frontend bundle. The insert is
-- worse: anyone could file a claim request in another member's name. The
-- original comment on that policy read "user_id is validated by foreign key
-- constraint", but a foreign key only proves the user exists, not that it is
-- the caller.
--
-- Reproduced locally by installing production's policies on the local stack:
-- anon read every row and forged a request as another user with HTTP 201. After
-- this migration both attempts fail.
--
-- The scoped policies from 000010 remain and are what the app runs on: a member
-- reads and creates only their own. Admin views already go through
-- admin-claim-requests with the service role, which bypasses RLS.

DROP POLICY IF EXISTS allow_all_read_claim_requests ON claim_requests;
DROP POLICY IF EXISTS allow_all_insert_claim_requests ON claim_requests;

-- Older names from the same branch, in case a database has those instead.
DROP POLICY IF EXISTS allow_authenticated_read_claim_requests ON claim_requests;
DROP POLICY IF EXISTS allow_authenticated_insert_claim_requests ON claim_requests;

-- Policies alone are not enough: the table-level grant is what lets anon reach
-- the table at all. Nothing signed-out needs claim_requests - the flows that
-- use it all require a session.
REVOKE SELECT, INSERT ON claim_requests FROM anon;

-- The sequence only exists where claim_requests.id is an integer (production).
-- Locally it is a uuid, so guard the revoke rather than fail the migration.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class WHERE relkind = 'S' AND relname = 'claim_requests_id_seq'
  ) THEN
    REVOKE USAGE ON SEQUENCE claim_requests_id_seq FROM anon;
  END IF;
END $$;
