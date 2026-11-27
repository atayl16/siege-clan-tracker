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

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * When a race ends. The race form saves a date ("2026-12-01"), which the
 * database stores as midnight UTC at the start of that day; the race runs to
 * the end of it, so it ends at the next midnight UTC (midnight UK time in
 * winter, 1am in summer). A stored time other than midnight UTC is kept as it
 * is.
 *
 * The same rule as raceEndsAt in netlify/functions/utils/raceProgress.cjs,
 * which decides when the sync marks a race completed. Keep the two in step.
 *
 * @param {string|null} endDate - races.end_date
 * @returns {Date|null} null for no end date
 */
export function raceEndsAt(endDate) {
  if (!endDate) return null;
  const end = new Date(endDate);
  if (Number.isNaN(end.getTime())) return null;
  const bareDate = end.getTime() % DAY_MS === 0;
  return bareDate ? new Date(end.getTime() + DAY_MS) : end;
}
