/**
 * The Discord message announcing a week's title holders: one embed listing
 * each title's winner on its own line (The Gainer first, then the titles in
 * site order), with 2nd and 3rd in small grey text underneath, a line on the
 * points, and a link button to the Leaderboard.
 *
 * One column, so it reads the same on a phone, where Discord stacks
 * side-by-side fields into one long column.
 *
 * Each line starts with the title's icon when the server has a custom emoji
 * named for it (title_warrior, title_gainer, ...: TITLE_EMOJI_PREFIX plus
 * the title id), and goes without when it does not.
 *
 * Pure: the same week and emojis always give the same message, so the
 * preview, the test post and the live post are identical. Title names, order
 * and value formats come from src/utils/weeklyTitles.js, as on the site.
 *
 * No @mentions: names are plain text and allowed_mentions turns pings off.
 */

import { WEEKLY_TITLES, GAINER, TITLE_POINTS, formatTitleValue } from '../../src/utils/weeklyTitles.js';
import { ordinal } from '../../src/utils/xpWeek.js';

export const LEADERBOARD_URL = 'https://siege-clan.com/leaderboard';
export const EMBED_COLOR = 0xff9800; // the site's orange
export const TITLE_EMOJI_PREFIX = 'title_';
export const HEADING = "Last week's champions";

// A big tie lists this many names, then "(+N more)".
const NAMES_SHOWN = 3;
const PLACES_SHOWN = 3;
const LINK_BUTTON = 5;

/** Discord markdown would eat "_" and "*" in a name like "big_dave". */
export function escapeName(name) {
  return String(name).replace(/([\\*_~`|>])/g, '\\$1');
}

function joinNames(names) {
  const sorted = [...names].sort((x, y) => x.localeCompare(y));
  const shown = sorted.slice(0, NAMES_SHOWN).map(escapeName).join(' & ');
  const more = sorted.length - NAMES_SHOWN;
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
 * The server's title emojis, by title id, from its custom emoji list
 * (Discord's { id, name, animated, available }). Others are ignored.
 */
export function titleEmojis(guildEmojis) {
  const byTitle = {};
  for (const emoji of guildEmojis || []) {
    if (emoji?.available === false || !emoji?.id || !emoji?.name?.startsWith(TITLE_EMOJI_PREFIX)) continue;
    byTitle[emoji.name.slice(TITLE_EMOJI_PREFIX.length)] = emoji;
  }
  return byTitle;
}

function emojiText(emoji) {
  if (!emoji) return '';
  return `<${emoji.animated ? 'a' : ''}:${emoji.name}:${emoji.id}> `;
}

/**
 * One title: "{icon} **The Warrior** · dusk owl (8.5 EHB)", then
 * "-# 2nd TheFirstRaven · 3rd qelmoss" (Discord's small grey text) when
 * anyone else placed. Joint places share a line. Null when nobody won.
 */
function titleLines(title, rows, emoji) {
  const byPlace = new Map();
  for (const row of rows) {
    if (!(row.placement >= 1 && row.placement <= PLACES_SHOWN)) continue;
    const entry = byPlace.get(row.placement) || { place: row.placement, names: [], value: row.value };
    entry.names.push(row.name);
    byPlace.set(row.placement, entry);
  }
  const winner = byPlace.get(1);
  if (!winner) return null;

  const lines = [
    `${emojiText(emoji)}**${title.name}** · ${joinNames(winner.names)} (${formatTitleValue(title, winner.value)})`,
  ];
  const others = [...byPlace.values()]
    .filter((p) => p.place > 1)
    .sort((x, y) => x.place - y.place)
    .map((p) => `${ordinal(p.place)} ${joinNames(p.names)}`);
  if (others.length) lines.push(`-# ${others.join(' · ')}`);
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
 * @param {{ emojis?: Record<string, { id: string, name: string, animated?: boolean }> }} [options]
 *   the server's title emojis, from titleEmojis()
 * @returns a Discord message body
 */
export function renderWeeklyTitlesMessage({ weekStart, weekEnd, gainer = [], awards = [] }, { emojis = {} } = {}) {
  const races = [
    {
      title: GAINER,
      rows: gainer.map((r) => ({ name: r.player_name, placement: r.placement, value: Number(r.xp_gained) })),
    },
    ...WEEKLY_TITLES.map((title) => ({
      title,
      rows: awards
        .filter((a) => a.title === title.id)
        .map((a) => ({ name: a.player_name, placement: a.placement, value: Number(a.value) })),
    })),
  ];
  const blocks = races
    .map(({ title, rows }) => titleLines(title, rows, Object.hasOwn(emojis, title.id) ? emojis[title.id] : null))
    .filter(Boolean);

  const [first, second, third] = TITLE_POINTS;
  const points = `Winners earned ${first} Siege Score points, with ${second} for 2nd and ${third} for 3rd.`;

  return {
    embeds: [
      {
        color: EMBED_COLOR,
        title: `${HEADING} · ${weekLabel(weekStart, weekEnd)}`,
        url: LEADERBOARD_URL,
        description: `${blocks.join('\n')}\n\n${points}`,
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
  return [
    embed.title,
    '',
    embed.description,
    '',
    `[ ${message.components[0].components[0].label} ] ${LEADERBOARD_URL}`,
  ].join('\n');
}
