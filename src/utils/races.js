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

/**
 * Whether this user may edit this race. The one place that decides it: the
 * edit page and the race card's Edit link both ask here.
 *
 * Today the race's creator may edit it. If races ever carry wagers or pots,
 * this becomes admin-only - change this function (e.g. to
 * `Boolean(user?.is_admin)`) and the race_participants/races UPDATE policies
 * in the database to match, since the policies are what actually enforce it.
 */
export function canEditRace(race, user) {
  return Boolean(race && user?.id && race.creator_id === user.id);
}
