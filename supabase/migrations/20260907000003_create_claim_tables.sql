-- Migration: create claim_codes and player_claims
--
-- These are declared in 00000000000000_staging_schema.sql but do not exist in
-- production - confirmed 2026-09-07, PostgREST answers
--   relation "public.claim_codes" does not exist
--   relation "public.player_claims" does not exist
-- while the schema file has described them all along. Production also carries
-- `admins` and `event_results`, which appear in no migration. The migrations
-- directory and the live database drifted apart in both directions.
--
-- So player claiming has no storage at all in production, which is a layer
-- below the permission problems: get_user_claims() reads player_claims and
-- cannot ever have returned anything.
--
-- Definitions copied verbatim from the staging schema so local and production
-- converge rather than diverge further. Every statement is idempotent, so this
-- is a no-op on any database that already has them (including local, where
-- db reset creates them from the schema file).

CREATE TABLE IF NOT EXISTS claim_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  wom_id INTEGER REFERENCES members(wom_id),
  is_claimed BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_claim_codes_code ON claim_codes(code);

CREATE TABLE IF NOT EXISTS player_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  wom_id INTEGER REFERENCES members(wom_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, wom_id)
);

CREATE INDEX IF NOT EXISTS idx_player_claims_user ON player_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_player_claims_wom ON player_claims(wom_id);

ALTER TABLE claim_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_claims ENABLE ROW LEVEL SECURITY;

-- Service role only for claim_codes. Deliberately no policy for anon or
-- authenticated: a SELECT policy permissive enough to let someone look up
-- their own code by value also lets any signed-in user list every unredeemed
-- code. Redemption goes through redeem_claim_code() instead.
DROP POLICY IF EXISTS allow_service_role_all_claim_codes ON claim_codes;
CREATE POLICY allow_service_role_all_claim_codes ON claim_codes
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS allow_service_role_all_player_claims ON player_claims;
CREATE POLICY allow_service_role_all_player_claims ON player_claims
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Public read matches the staging schema. Claims are "who owns which player",
-- which the member list already shows; it exposes user_id, so tighten it if
-- that ever matters.
DROP POLICY IF EXISTS allow_public_read_player_claims ON player_claims;
CREATE POLICY allow_public_read_player_claims ON player_claims
  FOR SELECT USING (true);
