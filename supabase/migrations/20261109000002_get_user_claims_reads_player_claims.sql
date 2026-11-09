-- Migration: make get_user_claims see claims made through player_claims
--
-- Production's get_user_claims (which no migration created) reads only
-- members.claimed_by:
--
--   SELECT m.claimed_by, m.wom_id, ... FROM members m
--   WHERE m.claimed_by = user_id_param;
--
-- But both ways of claiming a character now write player_claims, not
-- claimed_by: approving a claim request (admin-process-claim-request.cjs)
-- and redeeming a claim code (redeem_claim_code, 20260907000004). So every
-- new claim was saved somewhere the profile never looked, and "Your
-- Characters" stayed empty after an approval. Found on 2026-11-09 when an
-- approved claim did not show up.
--
-- This version returns a member if either says the user owns it:
--   - a player_claims row for the user (every claim from now on), or
--   - members.claimed_by = the user (claims made the old way, kept so no
--     existing member loses a character).
--
-- The return columns match production's version exactly, so the frontend
-- (AuthContext.fetchUserClaims, which reads wom_id) is unaffected. The
-- function stays SECURITY INVOKER, as in production: player_claims and
-- members are both readable under RLS, so it needs no elevated rights.
--
-- DROP first because the repo's older definition (staging schema) returns
-- different columns, and CREATE OR REPLACE cannot change a return type.
-- Nothing depends on the function, so the drop is safe. Idempotent.
--
-- MUST BE APPLIED TO PRODUCTION BY HAND. Merging does not run migrations.

DROP FUNCTION IF EXISTS public.get_user_claims(uuid);

CREATE FUNCTION public.get_user_claims(user_id_param uuid)
RETURNS TABLE (
  user_id uuid,
  wom_id bigint,
  claimed_at timestamp with time zone,
  name text,
  current_lvl integer,
  ehb numeric,
  siege_score integer
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    user_id_param,
    m.wom_id::bigint,
    COALESCE(pc.created_at, m.updated_at),
    m.name,
    m.current_lvl,
    m.ehb,
    m.siege_score
  FROM members m
  LEFT JOIN player_claims pc
    ON pc.wom_id = m.wom_id AND pc.user_id = user_id_param
  WHERE pc.user_id IS NOT NULL
     OR m.claimed_by = user_id_param;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_claims(uuid) TO anon, authenticated, service_role;
