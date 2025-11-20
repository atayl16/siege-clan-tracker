-- Migration: Disable Email Confirmation for Username-Based Auth
-- Description: Since we use fake emails (username@siege-clan.com), users cannot
--              confirm their emails. This migration disables email confirmation.
-- Date: 2025-01-20
--
-- Security Note:
-- This is safe because:
-- 1. We don't use real email addresses (username@siege-clan.com format)
-- 2. Users cannot receive confirmation emails anyway
-- 3. Username uniqueness is validated before account creation
-- 4. This is an internal clan tracker, not a public service

-- Note: This SQL updates auth.config which may not be directly accessible
-- You need to disable email confirmation in Supabase Dashboard:
--
-- 1. Go to: Authentication > Providers > Email
-- 2. Disable "Confirm email"
-- 3. Save changes
--
-- Alternatively, you can run this in the Supabase SQL editor:

UPDATE auth.config
SET config = jsonb_set(
  COALESCE(config, '{}'::jsonb),
  '{MAILER_AUTOCONFIRM}',
  'true'::jsonb
)
WHERE TRUE;

-- If the above doesn't work, you MUST manually disable email confirmation
-- in the Supabase Dashboard under Authentication > Providers > Email
