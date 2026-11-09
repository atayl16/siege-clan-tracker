/**
 * The weekly schedule, on the UK wall clock.
 *
 *   Mon 19:00  polls open (and this week's competitions start)
 *   Fri 19:00  polls close
 *   Mon 19:00  the winners' competitions start, for 7 days
 *
 * Times are Europe/London, so 19:00 stays 19:00 across BST. GitHub cron is UTC,
 * which is why the workflow fires at both candidate UTC hours and lets these
 * functions decide whether it is time yet.
 */

const ZONE = 'Europe/London';
const HOUR = 19;
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const partsFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: ZONE,
  hourCycle: 'h23',
  weekday: 'short',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

/** London wall-clock fields for an instant. Month is 1-12; weekday 0 = Monday. */
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

/** How far London is ahead of UTC at an instant: 0 in winter, 1 h in BST. */
function londonOffsetMs(date) {
  const p = londonParts(date);
  const asIfUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asIfUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/**
 * The instant London's clock reads the given time. Day may overflow
 * (day 35 of a month is fine). Not meant for 01:00-02:00 on a clock-change
 * night, which the schedule never uses.
 */
function londonTime(year, month, day, hour, minute = 0) {
  const asIfUtc = Date.UTC(year, month - 1, day, hour, minute);
  const firstGuess = asIfUtc - londonOffsetMs(new Date(asIfUtc));
  return new Date(asIfUtc - londonOffsetMs(new Date(firstGuess)));
}

function isoDate(year, month, day) {
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
}

/**
 * The poll week containing `now`, which runs Monday 00:00 to Sunday 23:59
 * London time.
 *
 * weekStart is the Monday the winning competitions start, which is the key a
 * week's polls are stored under.
 */
function weekSchedule(now = new Date()) {
  const p = londonParts(now);
  const monday = p.day - p.weekday;
  const at = (offsetDays) => londonTime(p.year, p.month, monday + offsetDays, HOUR);

  return {
    pollOpensAt: at(0),
    pollClosesAt: at(4),
    competitionStartsAt: at(7),
    competitionEndsAt: at(14),
    weekStart: isoDate(p.year, p.month, monday + 7),
  };
}

/** The next poll to open at or after `now`: this week's, or next week's once it has opened. */
function nextPollSchedule(now = new Date()) {
  const thisWeek = weekSchedule(now);
  if (now < thisWeek.pollOpensAt) return thisWeek;
  return weekSchedule(new Date(thisWeek.pollOpensAt.getTime() + 7 * DAY_MS));
}

/** "Mon 16 Nov 2026, 19:00 GMT" - for logs and the preview. */
function formatLondon(date) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: ZONE,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZoneName: 'short',
  }).format(date);
}

module.exports = {
  ZONE,
  HOUR,
  londonParts,
  londonTime,
  weekSchedule,
  nextPollSchedule,
  formatLondon,
};
