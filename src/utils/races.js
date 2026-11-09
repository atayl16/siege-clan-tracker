/**
 * Races to show on a member's profile: ones they created, plus ones any of
 * their claimed characters is racing in.
 *
 * race_participants stores the character as wom_id. This used to compare
 * participant.player_id, a column that does not exist, so a race another
 * member created with your character in it never showed on your profile.
 */
export function racesForUser(races, user, userClaims) {
  if (!races) return [];
  const myCharacterIds = (userClaims ?? []).map((claim) =>
    Number(claim.members?.wom_id ?? claim.wom_id)
  );
  return races.filter(
    (race) =>
      race.creator_id === user?.id ||
      race.participants?.some((p) => myCharacterIds.includes(Number(p.wom_id)))
  );
}
