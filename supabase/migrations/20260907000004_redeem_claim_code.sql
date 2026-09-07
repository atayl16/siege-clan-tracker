-- Migration: redeem_claim_code() - server-side claim redemption
--
-- claimPlayer() in AuthContext.jsx did this from the browser in six steps:
-- read claim_codes by code, check expiry, check player_claims, read the member
-- name, insert player_claims, update claim_codes.is_claimed. Three problems:
--
-- 1. It cannot work. claim_codes and player_claims have no INSERT/UPDATE policy
--    for authenticated users, so the writes fail with 42501 and claim_codes has
--    no SELECT policy either, so the very first read returns nothing.
--
-- 2. It cannot be fixed with policies. A SELECT policy permissive enough to let
--    someone look up their own code by value also lets any authenticated user
--    run `select * from claim_codes` and read every unredeemed code, then claim
--    any player. RLS cannot express "only if you already knew the code".
--
-- 3. It races. Two people redeeming codes for the same player can both pass the
--    "already claimed" check before either inserts. The original also ignored
--    the error from marking the code used, which could leave a code reusable
--    after a successful claim.
--
-- Doing it in one SECURITY DEFINER function solves all three: the tables stay
-- unreadable from the browser, only an exact code is accepted so there is
-- nothing to enumerate, and FOR UPDATE serialises concurrent redemptions.
--
-- SECURITY DEFINER granted to `authenticated` is safe here in a way that
-- register_admin_user() was not: this only ever writes a row for auth.uid(),
-- grants no privilege, and requires knowledge of a valid unclaimed code.

CREATE OR REPLACE FUNCTION redeem_claim_code(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid    UUID := auth.uid();
  v_code   claim_codes%ROWTYPE;
  v_name   TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'You must be logged in to claim a player');
  END IF;

  IF p_code IS NULL OR btrim(p_code) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or already used claim code');
  END IF;

  -- FOR UPDATE holds the row until this transaction ends, so a second
  -- redemption of the same code waits here and then finds is_claimed = true.
  SELECT * INTO v_code
    FROM claim_codes
   WHERE code = btrim(p_code)
     AND is_claimed = false
   FOR UPDATE;

  -- Deliberately the same message for "no such code" and "already used", so a
  -- caller cannot probe which codes exist.
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or already used claim code');
  END IF;

  IF v_code.expires_at IS NOT NULL AND v_code.expires_at < NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'This claim code has expired');
  END IF;

  IF EXISTS (SELECT 1 FROM player_claims WHERE wom_id = v_code.wom_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This player has already been claimed');
  END IF;

  SELECT name INTO v_name FROM members WHERE wom_id = v_code.wom_id;

  INSERT INTO player_claims (user_id, wom_id) VALUES (v_uid, v_code.wom_id);
  UPDATE claim_codes SET is_claimed = true WHERE id = v_code.id;

  RETURN jsonb_build_object(
    'success', true,
    'player_name', COALESCE(v_name, 'Unknown Player')
  );
END;
$$;

-- Signed-in callers only. anon has no business redeeming, and PUBLIC would
-- include it.
REVOKE EXECUTE ON FUNCTION redeem_claim_code(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION redeem_claim_code(TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION redeem_claim_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION redeem_claim_code(TEXT) TO service_role;

COMMENT ON FUNCTION redeem_claim_code(TEXT) IS
  'Redeems a claim code for the calling user. Runs SECURITY DEFINER so the '
  'browser never needs read or write access to claim_codes or player_claims, '
  'which would allow enumerating unredeemed codes.';
