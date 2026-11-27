/**
 * A number with comma thousands, "1,234,567", whatever the browser's language.
 * The game writes numbers this way, and left to the browser a Dutch or German
 * visitor would see "1.234.567" on some pages and "1,234,567" on others.
 * en-GB rather than the visitor's own English, since en-IN groups "12,34,567".
 *
 * @param {number|string} value
 * @returns {string} "" for a missing value or one that is not a number
 */
export function formatNumber(value) {
  if (value === null || value === undefined || value === "") return "";
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString("en-GB") : "";
}
