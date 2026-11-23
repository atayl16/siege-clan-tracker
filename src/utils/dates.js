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
