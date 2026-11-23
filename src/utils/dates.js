/**
 * A date as the visitor's own browser writes it, with the month as a word,
 * so it cannot be misread: "Nov 9, 2026" in the US, "9 Nov 2026" in the UK.
 * All-number dates (11/9/2026) mean different days on either side of the
 * Atlantic.
 *
 * @param {string|number|Date} value
 * @returns {string} "" for a missing or invalid date
 */
export function formatDate(value) {
  if (value === null || value === undefined || value === "") return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/** "17 minutes ago", "3 hours ago", "2 days ago". */
export function timeAgo(value, now = Date.now()) {
  const minutes = Math.max(0, Math.round((now - new Date(value).getTime()) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} days ago`;
}
