-- Migration: claim_requests.notified_at
--
-- When the bot told the staff channel about this claim request
-- (netlify/functions/user-claim-request-notify.cjs). The function sets it
-- with a conditional update BEFORE posting, so each request is announced at
-- most once however often the function is called. NULL means not announced.
--
-- Members cannot update claim_requests (no UPDATE policy for them), so only
-- the service role sets this.
--
-- Idempotent: safe to run again.
--
-- MUST BE APPLIED TO PRODUCTION BY HAND. Merging does not run migrations.

ALTER TABLE claim_requests ADD COLUMN IF NOT EXISTS notified_at TIMESTAMPTZ;
