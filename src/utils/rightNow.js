/**
 * The home page's "Right Now" strip, worked out from the clan's WOM
 * competitions (/api/wom-competitions, which the site already serves cached).
 */

const KINDS = { SotW: "Skill of the Week", BotW: "Boss of the Week", RotW: "Raid of the Week" };
const DAY = 24 * 60 * 60 * 1000;

/**
 * "Siege SotW - Hunter" -> { kind: "Skill of the Week", name: "Hunter" }.
 * Titles not in that shape keep their full title as the name.
 */
export function competitionLabel(title) {
  const m = /^Siege\s+(SotW|BotW|RotW)\s*-\s*(.+)$/.exec(String(title || "").trim());
  return m ? { kind: KINDS[m[1]], name: m[2] } : { kind: null, name: String(title || "") };
}

const time = (v) => new Date(v).getTime();

/** Competitions running at `now`, soonest to end first. */
export function runningCompetitions(competitions, now = Date.now()) {
  return (competitions || [])
    .filter((c) => time(c.startsAt) <= now && now < time(c.endsAt))
    .sort((a, b) => time(a.endsAt) - time(b.endsAt));
}

/** Competitions starting within the next week, soonest first. */
export function upcomingCompetitions(competitions, now = Date.now()) {
  return (competitions || [])
    .filter((c) => time(c.startsAt) > now && time(c.startsAt) - now <= 7 * DAY)
    .sort((a, b) => time(a.startsAt) - time(b.startsAt));
}

/**
 * The competitions that start next (within a week), all sharing that start
 * time, so one "Next up" time is right for every name shown.
 */
export function nextCompetitions(competitions, now = Date.now()) {
  const upcoming = upcomingCompetitions(competitions, now);
  if (!upcoming.length) return [];
  const first = time(upcoming[0].startsAt);
  return upcoming.filter((c) => time(c.startsAt) === first);
}

/** How many competitions finished in the last 30 days. */
export function recentCompetitionCount(competitions, now = Date.now()) {
  return (competitions || []).filter((c) => time(c.endsAt) <= now && now - time(c.endsAt) <= 30 * DAY).length;
}

/** "day 4 of 7" for a running competition. */
export function dayOf(competition, now = Date.now()) {
  const start = time(competition.startsAt);
  const total = Math.max(1, Math.round((time(competition.endsAt) - start) / DAY));
  const day = Math.min(total, Math.floor((now - start) / DAY) + 1);
  return `day ${day} of ${total}`;
}
