import { TITLE_POINTS } from "./weeklyTitles";

const TOP = TITLE_POINTS.length;

/**
 * Where one character stands in one title race this week.
 *
 * @param {{ minimum: number }} title
 * @param {Array<{ womId: number, value: number }>} rows - everyone with progress
 * @param {number} womId
 * @returns {null | {
 *   kind: "placing", place: number, of: number, points: number, value: number
 * } | {
 *   kind: "chasing", place: number, of: number, behind: number, value: number
 * } | {
 *   kind: "entering", short: number, value: number
 * }}
 *   null when the character has no progress in the race
 */
export function titleStanding(title, rows, womId) {
  const mine = rows.find((r) => Number(r.womId) === Number(womId));
  if (!mine || !(mine.value > 0)) return null;

  if (mine.value < title.minimum) {
    return { kind: "entering", short: title.minimum - mine.value, value: mine.value };
  }

  const qualified = rows.filter((r) => r.value > 0 && r.value >= title.minimum).sort((a, b) => b.value - a.value);
  // Ties share a place, as in rankTitle.
  const place = 1 + qualified.filter((r) => r.value > mine.value).length;
  if (place <= TOP) {
    return { kind: "placing", place, of: qualified.length, points: TITLE_POINTS[place - 1], value: mine.value };
  }
  const third = qualified[TOP - 1].value;
  return { kind: "chasing", place, of: qualified.length, behind: third - mine.value, value: mine.value };
}

/**
 * How near a standing is to earning points, for sorting: placing first (by
 * place), then the rest by the share of the target already reached.
 */
export function standingOrder(s) {
  if (s.kind === "placing") return s.place;
  const target = s.kind === "chasing" ? s.value + s.behind : s.value + s.short;
  return 10 - (target > 0 ? s.value / target : 0);
}
