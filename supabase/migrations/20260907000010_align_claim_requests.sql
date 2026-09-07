-- Migration: bring claim_requests into line with production, and let members
-- create their own
--
-- Same drift as races and user_goals (20260907000007). Production has columns
-- the migrations never described, verified against the live API on 2026-09-07:
--
--   rsn           text NOT NULL - the RuneScape name being claimed
--   message       text          - optional note to the admin
--   admin_user_id                - who actioned it
--
-- ClaimPlayer.jsx already sends rsn and message, so its submit could not have
-- worked even with a policy in place.
--
-- Additive: no drops, no type changes. A no-op against production, and a local
-- database gains what it lacked. rsn is left nullable here rather than NOT NULL
-- as in production, because existing local rows would have nothing to put in
-- it; the app always supplies one.

ALTER TABLE claim_requests ADD COLUMN IF NOT EXISTS rsn TEXT;
ALTER TABLE claim_requests ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE claim_requests ADD COLUMN IF NOT EXISTS admin_user_id UUID;

-- A member can raise a request in their own name only. Without the check on
-- user_id anyone could file a request as someone else.
DROP POLICY IF EXISTS claim_requests_insert_own ON claim_requests;
CREATE POLICY claim_requests_insert_own ON claim_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Reads were `USING (true)` from the staging schema, which exposed every
-- member's requests - including admin_notes - to anyone with the anon key.
-- Scope it: your own requests, and nothing else. Admin views go through a
-- Netlify function with the service role, which bypasses RLS.
DROP POLICY IF EXISTS allow_public_read_claim_requests ON claim_requests;

DROP POLICY IF EXISTS claim_requests_read_own ON claim_requests;
CREATE POLICY claim_requests_read_own ON claim_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
