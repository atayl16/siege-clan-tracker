-- Migration: let a user choose which of their claimed characters is their main
--
-- members.alt hides a character from the Members page unless "Show Alt
-- Accounts" is ticked, and only an admin could change it. The person who
-- claimed the characters knows best which is their main, and the main is also
-- the natural default character (race and goal forms pre-fill with it).
--
-- set_main_character(p_wom_id) marks that character alt = false and every
-- other character the caller has claimed alt = true, so each user has exactly
-- one main. It only ever touches characters the caller has claimed, and only
-- the alt column, which is why this is a function rather than an UPDATE policy
-- on members: a policy would let the caller write any column of those rows.
--
-- The caller is the signed-in Supabase user. Accounts are created with
-- users.id = auth.uid() (register in AuthContext); supabase_auth_id covers
-- accounts linked after the fact. A claim is either a player_claims row or
-- members.claimed_by, the same two sources get_user_claims() reads.
--
-- Idempotent. MUST BE APPLIED TO PRODUCTION BY HAND. Merging does not run
-- migrations.

CREATE OR REPLACE FUNCTION public.set_main_character(p_wom_id integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid;
BEGIN
  SELECT u.id INTO v_user
  FROM users u
  WHERE u.id = auth.uid() OR u.supabase_auth_id = auth.uid()
  LIMIT 1;

  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM members m
    WHERE m.wom_id = p_wom_id
      AND (m.claimed_by = v_user
           OR EXISTS (SELECT 1 FROM player_claims pc
                      WHERE pc.wom_id = m.wom_id AND pc.user_id = v_user))
  ) THEN
    RAISE EXCEPTION 'You have not claimed this character' USING ERRCODE = '42501';
  END IF;

  UPDATE members m
  SET alt = (m.wom_id <> p_wom_id),
      updated_at = NOW()
  WHERE m.claimed_by = v_user
     OR EXISTS (SELECT 1 FROM player_claims pc
                WHERE pc.wom_id = m.wom_id AND pc.user_id = v_user);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_main_character(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_main_character(integer) TO authenticated, service_role;
