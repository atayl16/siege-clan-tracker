/**
 * Dates and times as the visitor expects to read them.
 *
 * Times are on the visitor's own clock (their browser's time zone). The style
 * is English in the visitor's regional format: the first regional English in
 * the browser's language list (en-US, en-GB, en-AU, ...), or, for a browser set
 * to another language, US style in a US time zone and UK style anywhere else.
 * The site is written in English, so a Dutch or German browser should not put
 * "ma 30 nov" in the middle of an English sentence.
 *
 * The browser's time zone stands in for the visitor's country, rather than
 * their IP address: it costs no server call, and a VPN does not fool it.
 */

const DAY = 24 * 60 * 60 * 1000;

// The US time zones, with the older names some browsers still report.
const US_ZONES = new Set(
  [
    "America/New_York America/Detroit America/Kentucky/Louisville America/Kentucky/Monticello",
    "America/Indiana/Indianapolis America/Indiana/Vincennes America/Indiana/Winamac",
    "America/Indiana/Marengo America/Indiana/Petersburg America/Indiana/Vevay",
    "America/Chicago America/Indiana/Tell_City America/Indiana/Knox America/Menominee",
    "America/North_Dakota/Center America/North_Dakota/New_Salem America/North_Dakota/Beulah",
    "America/Denver America/Boise America/Phoenix America/Los_Angeles",
    "America/Anchorage America/Juneau America/Sitka America/Metlakatla America/Yakutat",
    "America/Nome America/Adak Pacific/Honolulu",
    "America/Indianapolis America/Fort_Wayne America/Louisville America/Knox_IN America/Atka Navajo",
    "US/Eastern US/Central US/Mountain US/Pacific US/Alaska US/Hawaii US/Arizona",
    "US/Michigan US/East-Indiana US/Indiana-Starke US/Aleutian",
  ]
    .join(" ")
    .split(" ")
);

/**
 * The locale for a browser's language list and time zone: the first regional
 * English ("en-AU"), else "en-US" in a US time zone, else "en-GB".
 *
 * @param {string[]} languages e.g. navigator.languages
 * @param {string} timeZone e.g. "America/Chicago"
 * @returns {string}
 */
export function pickLocale(languages = [], timeZone = "") {
  for (const tag of languages) {
    try {
      const { language, region } = new Intl.Locale(tag);
      if (language === "en" && region) return `en-${region}`;
    } catch {
      // Not a language tag; try the next one.
    }
  }
  return US_ZONES.has(timeZone) ? "en-US" : "en-GB";
}

let cachedLocale;

/** This visitor's locale (see pickLocale), worked out once per page load. */
export function siteLocale() {
  if (!cachedLocale) {
    const nav = typeof navigator === "undefined" ? {} : navigator;
    const languages = nav.languages?.length ? nav.languages : [nav.language].filter(Boolean);
    let timeZone = "";
    try {
      timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    } catch {
      // No Intl time zone support; fall back on the language list alone.
    }
    cachedLocale = pickLocale(languages, timeZone);
  }
  return cachedLocale;
}

function toDate(value) {
  if (value === null || value === undefined || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * A date with the month as a word, so it cannot be misread: "Nov 9, 2026" in
 * the US, "9 Nov 2026" in the UK. All-number dates (11/9/2026) mean different
 * days on either side of the Atlantic.
 *
 * @param {string|number|Date} value
 * @param {Intl.DateTimeFormatOptions} [options] added to the defaults, e.g. { month: "long" }
 * @returns {string} "" for a missing or invalid date
 */
export function formatDate(value, options) {
  const date = toDate(value);
  if (!date) return "";
  return date.toLocaleDateString(siteLocale(), { day: "numeric", month: "short", year: "numeric", ...options });
}

/** "Nov 9" / "9 Nov": a date without the year, for charts and tight spaces. */
export function formatDay(value, options) {
  const date = toDate(value);
  if (!date) return "";
  return date.toLocaleDateString(siteLocale(), { day: "numeric", month: "short", ...options });
}

/** "Nov 30, 2026, 2:00 PM" / "30 Nov 2026, 19:00". "" for a missing or invalid date. */
export function formatDateTime(value) {
  const date = toDate(value);
  if (!date) return "";
  return date.toLocaleString(siteLocale(), {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * "Monday 2:00 PM" / "Monday 19:00", for a weekly moment such as the clan
 * week's turnover. Pass { timeZone } to read it off another clock.
 */
export function formatWeekdayTime(value, options) {
  const date = toDate(value);
  if (!date) return "";
  return date.toLocaleString(siteLocale(), { weekday: "long", hour: "numeric", minute: "2-digit", ...options });
}

/**
 * When something happens, on the visitor's own clock:
 * "today, 7:00 PM", "tomorrow, 19:00", "yesterday, 2:00 PM", "Mon 30 Nov, 19:00".
 */
export function localWhen(value, now = Date.now()) {
  const date = toDate(value);
  if (!date) return "";
  const locale = siteLocale();
  const timeText = date.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(date) - startOfDay(new Date(now))) / DAY);
  if (days === 0) return `today, ${timeText}`;
  if (days === 1) return `tomorrow, ${timeText}`;
  if (days === -1) return `yesterday, ${timeText}`;
  const dayText = date.toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" });
  return `${dayText}, ${timeText}`;
}

/**
 * A calendar day saved as midnight UTC, as local midnight of that same day.
 *
 * A date field's "2026-12-01" is stored that way in a timestamptz column, and
 * a DATE column's "2026-12-01" parses that way. Read on the visitor's clock,
 * midnight UTC is still the day before anywhere west of the UK, so a goal due
 * on 1 Dec would show as due on 30 Nov in the Americas.
 *
 * @returns {Date|null} null for a missing or invalid date
 */
export function calendarDay(value) {
  const date = toDate(value);
  if (!date) return null;
  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/**
 * The local midnight that ends a calendar day saved as midnight UTC (see
 * calendarDay): the moment a goal due that day becomes overdue.
 *
 * @returns {Date|null} null for a missing or invalid date
 */
export function endOfCalendarDay(value) {
  const day = calendarDay(value);
  if (!day) return null;
  return new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
}

/**
 * "2026-11-27" on the visitor's clock, the shape a date field uses. Today by
 * default. toISOString() gives the UK date instead, which in a US evening is
 * already tomorrow.
 */
export function localIsoDate(value = new Date()) {
  const date = toDate(value);
  if (!date) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** "17 minutes ago", "3 hours ago", "2 days ago". */
export function timeAgo(value, now = Date.now()) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return "";
  const minutes = Math.max(0, Math.round((now - time) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} days ago`;
}
