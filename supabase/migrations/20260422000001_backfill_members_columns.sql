-- Backfill members columns that were added to production outside the migrations folder.
-- Idempotent (IF NOT EXISTS) — safe to re-apply against prod.
-- Running `supabase db reset` on a fresh local stack requires these to match the app's expectations.

ALTER TABLE members ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS alt BOOLEAN DEFAULT false;
ALTER TABLE members ADD COLUMN IF NOT EXISTS claim_code TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS claimed_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE members ADD COLUMN IF NOT EXISTS last_seen_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE members ADD COLUMN IF NOT EXISTS not_in_wom BOOLEAN DEFAULT false;
ALTER TABLE members ADD COLUMN IF NOT EXISTS not_in_wom_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE members ADD COLUMN IF NOT EXISTS runewatch_reported BOOLEAN DEFAULT false;
ALTER TABLE members ADD COLUMN IF NOT EXISTS runewatch_whitelisted_at TIMESTAMP WITH TIME ZONE;
