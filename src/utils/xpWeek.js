/**
 * The weekly Overall XP award.
 *
 * Each week the clan's top five Overall XP gainers earn Siege Score. A week
 * runs Monday 19:00 to Monday 19:00 UK time, the same window as the SotW and
 * BotW competitions the comp polls create (scripts/comp-polls/ukTime.cjs), so
 * everything on the site turns over at the same moment.
 *
 * Shared by the page (this week's standings) and the hourly award job
 * (scripts/sync-tasks/weekly-xp-awards.cjs, which imports this file), so the
 * window members see is the window that gets paid out.
 */

const ZONE = "Europe/London";
const HOUR = 19;
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Points by finishing place: 1st 15, 2nd 10, 3rd 5, 4th and 5th 2. */
export const XP_AWARD_POINTS = [15, 10, 5, 2, 2];
export const XP_AWARD_PLACES = XP_AWARD_POINTS.length;

const partsFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: ZONE,
  hourCycle: "h23",
  weekday: "short",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function londonParts(date) {
  const parts = {};
  for (const { type, value } of partsFormatter.formatToParts(date)) parts[type] = value;
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
    weekday: WEEKDAYS.indexOf(parts.weekday),
  };
}

function londonOffsetMs(date) {
  const p = londonParts(date);
  const asIfUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asIfUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** The instant London's clock reads year-month-day hour:00. Day may overflow. */
function londonTime(year, month, day, hour) {
  const asIfUtc = Date.UTC(year, month - 1, day, hour);
  const firstGuess = asIfUtc - londonOffsetMs(new Date(asIfUtc));
  return new Date(asIfUtc - londonOffsetMs(new Date(firstGuess)));
}

/** The XP week `now` falls in: { start, end }, start inclusive, end exclusive. */
export function xpWeekContaining(now = new Date()) {
  const p = londonParts(now);
  let monday = p.day - p.weekday;
  // Monday before 19:00 still belongs to the week that started last Monday.
  if (now < londonTime(p.year, p.month, monday, HOUR)) monday -= 7;
  return {
    start: londonTime(p.year, p.month, monday, HOUR),
    end: londonTime(p.year, p.month, monday + 7, HOUR),
  };
}

/** The most recent week that has finished by `now`. */
export function lastCompletedXpWeek(now = new Date()) {
  const current = xpWeekContaining(now);
  // An instant inside the previous week: an hour before this one started.
  return xpWeekContaining(new Date(current.start.getTime() - 60 * 60 * 1000));
}

export function pointsForPlace(place) {
  return XP_AWARD_POINTS[place - 1] ?? 0;
}

/**
 * Rank WOM group-gained rows ({ player: { id, displayName, username }, data:
 * { gained } }) into the week's standings.
 *
 * Only positive gains count. Equal gains share a place (and its points), and
 * the next player skips ahead, as in a race: 1, 2, 2, 4.
 *
 * `isEligible(row)` drops players who cannot be paid (no row in members); the
 * next player moves up into their place rather than the place going unpaid.
 */
export function rankXpGains(rows, { limit = XP_AWARD_PLACES, isEligible = () => true } = {}) {
  const sorted = (rows || [])
    .filter((row) => (row?.data?.gained ?? 0) > 0 && row?.player?.id != null)
    .filter(isEligible)
    .sort((a, b) => b.data.gained - a.data.gained);

  const ranked = [];
  for (let i = 0; i < sorted.length; i++) {
    const row = sorted[i];
    const place =
      i > 0 && row.data.gained === sorted[i - 1].data.gained ? ranked[i - 1].place : i + 1;
    if (place > limit) break;
    ranked.push({
      womId: row.player.id,
      name: row.player.displayName || row.player.username,
      gained: row.data.gained,
      place,
      points: pointsForPlace(place),
    });
  }
  return ranked;
}

/**
 * What a character needs this week, from the full ranking (rankXpGains with
 * no limit) and their WOM id:
 *
 *   mine     their row, or null if they have gained nothing yet
 *   next     the closest player ahead and the XP gap to catch them
 *   topFive  for someone outside the paid places: the place to aim for, its
 *            points and the XP gap; `open` when the paid places are not all
 *            taken yet, so any gain at all gets in
 *   lead     for the leader: how far ahead of second they are
 *
 * Gaps are to draw level; equal gains share a place, as in rankXpGains.
 */
export function weeklyTargets(ranking, womId) {
  const rows = ranking || [];
  const mine = rows.find((r) => Number(r.womId) === Number(womId)) || null;
  const myGain = mine?.gained ?? 0;

  const ahead = rows.filter((r) => r.gained > myGain);
  const closestAhead = ahead[ahead.length - 1];
  const next = closestAhead
    ? {
        name: closestAhead.name,
        place: closestAhead.place,
        points: closestAhead.points,
        gap: closestAhead.gained - myGain,
      }
    : null;

  let topFive = null;
  if (!mine || mine.points === 0) {
    const paid = rows.filter((r) => r.points > 0);
    if (paid.length < XP_AWARD_PLACES) {
      const place = rows.length + 1;
      topFive = { place, points: pointsForPlace(place), gap: 1, open: true };
    } else {
      const lastPaid = paid[paid.length - 1];
      topFive = {
        place: lastPaid.place,
        points: lastPaid.points,
        gap: lastPaid.gained - myGain,
        open: false,
      };
    }
  }

  const second = mine?.place === 1 ? rows.find((r) => r.gained < myGain) : null;
  const lead = second ? myGain - second.gained : null;

  return { mine, next, topFive, lead };
}

/** 1 -> "1st", 2 -> "2nd", 11 -> "11th", 22 -> "22nd". */
export function ordinal(n) {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${{ 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th"}`;
}

/** 9381451 -> "9.38M", 512000 -> "512K", 900 -> "900". */
export function formatXp(xp) {
  const n = Number(xp) || 0;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2).replace(/\.?0+$/, "")}M`;
  if (n >= 1e3) return `${Math.round(n / 1e3)}K`;
  return String(n);
}

/** "Mon 16 Nov, 19:00" on the UK clock, for "ends ..." labels. */
export function formatUkTime(date) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: ZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}
