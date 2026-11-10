/**
 * Search, filters and sorting for the Races & Goals board. Everything on the
 * board is already loaded, so these run in the browser on each change.
 */

// "dan_xo" and "chambers_of_xeric" match "dan xo" and "chambers of".
const normalise = (value) => String(value ?? "").toLowerCase().replace(/_/g, " ");

const matches = (query, ...fields) => {
  const q = normalise(query).trim();
  return !q || fields.some((field) => normalise(field).includes(q));
};

/** How far along a goal is, 0 to 1. A completed goal is 1. */
export function goalProgress(goal) {
  if (goal.completed) return 1;
  const needed = (goal.target_value ?? 0) - (goal.start_value ?? 0);
  if (needed <= 0) return 0;
  const gained = (goal.current_value ?? 0) - (goal.start_value ?? 0);
  return Math.min(1, Math.max(0, gained / needed));
}

/**
 * @param {object[]} goals
 * @param {{ query?: string, type?: "all"|"skill"|"boss", status?: "all"|"active"|"completed" }} filters
 *   query matches the character's name or the skill/boss.
 */
export function filterGoals(goals, { query = "", type = "all", status = "all" } = {}) {
  return (goals ?? []).filter(
    (goal) =>
      (type === "all" || goal.goal_type === type) &&
      (status === "all" || (status === "completed") === Boolean(goal.completed)) &&
      matches(query, goal.player_name, goal.metric)
  );
}

const time = (value) => (value ? new Date(value).getTime() : NaN);

/**
 * Active goals always come before completed ones, so finished goals do not
 * crowd the board. Within them:
 *   progress - closest to done first; completed by most recently done
 *   newest   - most recently set first
 *   deadline - soonest deadline first, goals without one after
 */
export function sortGoals(goals, sortBy = "progress") {
  const byNewest = (a, b) =>
    (time(b.created_at ?? b.start_date) || 0) - (time(a.created_at ?? a.start_date) || 0);

  const within = {
    progress: (a, b) =>
      a.completed
        ? (time(b.completed_date) || 0) - (time(a.completed_date) || 0)
        : goalProgress(b) - goalProgress(a),
    newest: byNewest,
    deadline: (a, b) => {
      const da = time(a.target_date);
      const db = time(b.target_date);
      if (Number.isNaN(da) && Number.isNaN(db)) return byNewest(a, b);
      if (Number.isNaN(da)) return 1;
      if (Number.isNaN(db)) return -1;
      return da - db;
    },
  }[sortBy] ?? (() => 0);

  return [...(goals ?? [])].sort(
    (a, b) => Boolean(a.completed) - Boolean(b.completed) || within(a, b)
  );
}

/** A race is active until the server marks it otherwise (as RaceCard reads it). */
export const isActiveRace = (race) => race.status === undefined || race.status === "active";

/**
 * @param {object[]} races
 * @param {{ query?: string, status?: "all"|"active"|"finished" }} filters
 *   query matches the title, the description, or any racer or skill in it.
 */
export function filterRaces(races, { query = "", status = "all" } = {}) {
  return (races ?? []).filter((race) => {
    if (status === "active" && !isActiveRace(race)) return false;
    if (status === "finished" && isActiveRace(race)) return false;
    const participants = race.participants ?? race.race_participants ?? [];
    return matches(
      query,
      race.title,
      race.description,
      ...participants.flatMap((p) => [p.player_name, p.metric])
    );
  });
}
