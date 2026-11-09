const womIdOf = (claim) => Number(claim?.members?.wom_id ?? claim?.wom_id);

/**
 * The wom_id of a user's main character: the first claimed character not
 * marked alt. members.alt is how the clan already tells mains from alts (the
 * Members page hides alts), and set_main_character() keeps exactly one of a
 * user's characters non-alt, so the main doubles as their default character.
 *
 * Falls back to the first claim when every character is marked alt, or the
 * flag is missing, so there is always a default while the user has any claim.
 *
 * @returns {number|null}
 */
export function mainCharacterId(userClaims) {
  const claims = userClaims ?? [];
  if (!claims.length) return null;
  const main = claims.find((claim) => claim?.members?.alt === false) ?? claims[0];
  return womIdOf(main);
}

/** The user's claims with the main character first, otherwise in order. */
export function mainFirst(userClaims) {
  const claims = userClaims ?? [];
  const mainId = mainCharacterId(claims);
  return [...claims].sort(
    (a, b) => (womIdOf(b) === mainId) - (womIdOf(a) === mainId)
  );
}
