/**
 * The Discord message announcing a week's title holders: one embed (The
 * Gainer full width, then one side-by-side field per title, which Discord
 * lays out three to a row) and a link button to the Leaderboard.
 *
 * Pure: the same week always gives the same message, so the preview, the
 * test post and the live post are identical. Title names, order and value
 * formats come from src/utils/weeklyTitles.js, as on the site.
 *
 * No @mentions: names are plain text and allowed_mentions turns pings off.
 */

import { WEEKLY_TITLES, GAINER, formatTitleValue } from '../../src/utils/weeklyTitles.js';
import { ordinal } from '../../src/utils/xpWeek.js';

export const LEADERBOARD_URL = 'https://siege-clan.com/leaderboard';
export const EMBED_COLOR = 0xff9800; // the site's orange

const PLACES_SHOWN = 3;
// A big tie at one place lists this many names, then "(+N more)".
const NAMES_SHOWN = 3;
const LINK_BUTTON = 5;

/** Discord markdown would eat "_" and "*" in a name like "big_dave". */
export function escapeName(name) {
  return String(name).replace(/([\\*_~`|>])/g, '\\$1');
}

function joinNames(names) {
  const shown = names.slice(0, NAMES_SHOWN).map(escapeName).join(' & ');
  const more = names.length - NAMES_SHOWN;
  return more > 0 ? `${shown} (+${more} more)` : shown;
}

/** "9 to 16 Nov", or "30 Nov to 7 Dec" across a month end. UK dates. */
export function weekLabel(weekStart, weekEnd) {
  const parts = (date) => {
    const fmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'Europe/London' });
    const p = Object.fromEntries(fmt.formatToParts(new Date(date)).map((x) => [x.type, x.value]));
    return { day: p.day, month: p.month };
  };
  const a = parts(weekStart);
  const b = parts(weekEnd);
  return a.month === b.month ? `${a.day} to ${b.day} ${b.month}` : `${a.day} ${a.month} to ${b.day} ${b.month}`;
}

/**
 * Rows ({ name, placement, value }) grouped into places 1-3, ties together:
 * [{ place, names, value }], best first.
 */
function places(rows) {
  const byPlace = new Map();
  for (const row of rows) {
    if (!(row.placement >= 1 && row.placement <= PLACES_SHOWN)) continue;
    const entry = byPlace.get(row.placement) || { place: row.placement, names: [], value: row.value };
    entry.names.push(row.name);
    byPlace.set(row.placement, entry);
  }
  for (const entry of byPlace.values()) entry.names.sort((x, y) => x.localeCompare(y));
  return [...byPlace.values()].sort((x, y) => x.place - y.place);
}

/** "8.0" from "8.0 EHB", "8.26M" from "8.26M XP", "9" from "9 raids". */
const bareValue = (title, value) => formatTitleValue(title, value).split(' ')[0];

/**
 * The winner in bold with their value, then the runners-up. Null when nobody
 * placed. `oneLine` puts the runners-up on one line (The Gainer, full width).
 */
function fieldValue(title, rows, { oneLine = false } = {}) {
  const ranked = places(rows);
  if (!ranked.length) return null;
  const [first, ...rest] = ranked;
  const winner = first.place === 1
    ? `**${joinNames(first.names)}** · ${formatTitleValue(title, first.value)}`
    : null;
  const runnersUp = (winner ? rest : ranked).map(
    (p) => `${ordinal(p.place)} ${joinNames(p.names)} ${bareValue(title, p.value)}`
  );
  const lines = winner ? [winner] : [];
  if (runnersUp.length) lines.push(...(oneLine ? [runnersUp.join(' · ')] : runnersUp));
  return lines.join('\n');
}

/**
 * @param {object} week
 * @param {string|Date} week.weekStart
 * @param {string|Date} week.weekEnd
 * @param {Array<{ player_name: string, placement: number, xp_gained: number }>} week.gainer
 *   that week's xp_awards rows
 * @param {Array<{ title: string, player_name: string, placement: number, value: number }>} week.awards
 *   that week's weekly_title_awards rows
 * @returns a Discord message body
 */
export function renderWeeklyTitlesMessage({ weekStart, weekEnd, gainer = [], awards = [] }) {
  const fields = [];

  const gainerValue = fieldValue(
    GAINER,
    gainer.map((r) => ({ name: r.player_name, placement: r.placement, value: Number(r.xp_gained) })),
    { oneLine: true }
  );
  if (gainerValue) {
    const ranked = GAINER.ranked.charAt(0).toLowerCase() + GAINER.ranked.slice(1); // "most Overall XP"
    fields.push({ name: `${GAINER.name} · ${ranked}`, value: gainerValue, inline: false });
  }

  for (const title of WEEKLY_TITLES) {
    const rows = awards
      .filter((a) => a.title === title.id)
      .map((a) => ({ name: a.player_name, placement: a.placement, value: Number(a.value) }));
    const value = fieldValue(title, rows);
    if (value) fields.push({ name: title.name, value, inline: true });
  }

  return {
    embeds: [
      {
        color: EMBED_COLOR,
        author: { name: 'Siege Clan · siege-clan.com', url: LEADERBOARD_URL },
        title: `Weekly titles · ${weekLabel(weekStart, weekEnd)}`,
        url: LEADERBOARD_URL,
        description: "Last week's winners. The top 3 in each race earned **150 / 100 / 50** Siege Score.",
        fields,
        footer: { text: "Titles are held until next week's winners are announced" },
      },
    ],
    components: [
      {
        type: 1,
        components: [{ type: 2, style: LINK_BUTTON, label: 'View the leaderboard', url: LEADERBOARD_URL }],
      },
    ],
    allowed_mentions: { parse: [] },
  };
}

/** The message as plain text, for the preview log. */
export function messageAsText(message) {
  const embed = message.embeds[0];
  const lines = [embed.title, embed.description, ''];
  for (const field of embed.fields) {
    lines.push(field.name, field.value, '');
  }
  lines.push(embed.footer.text, `[ ${message.components[0].components[0].label} ] ${LEADERBOARD_URL}`);
  return lines.join('\n');
}
