/**
 * The Discord message announcing a week's title holders: one embed listing
 * each title's winner on its own line (The Gainer first, then the titles in
 * site order), a line on the points, and a link button to the Leaderboard,
 * where 2nd and 3rd are shown.
 *
 * Kept to one line per title so it reads the same on a phone, where Discord
 * stacks side-by-side fields into one long column.
 *
 * STYLES.podium is the alternative under trial: each title with its 1st, 2nd
 * and 3rd behind gold, silver and bronze medals, no values, three titles to
 * a row. Only the test workflow uses it until one style is chosen.
 *
 * Pure: the same week always gives the same message, so the preview, the
 * test post and the live post are identical. Title names, order and value
 * formats come from src/utils/weeklyTitles.js, as on the site.
 *
 * No @mentions: names are plain text and allowed_mentions turns pings off.
 */

import { WEEKLY_TITLES, GAINER, TITLE_POINTS, formatTitleValue } from '../../src/utils/weeklyTitles.js';

export const LEADERBOARD_URL = 'https://siege-clan.com/leaderboard';
export const EMBED_COLOR = 0xff9800; // the site's orange

// A big tie lists this many names, then "(+N more)".
const NAMES_SHOWN = 3;
const LINK_BUTTON = 5;

export const STYLES = { winners: 'winners', podium: 'podium' };
const MEDALS = ['\u{1F947}', '\u{1F948}', '\u{1F949}']; // gold, silver, bronze

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
 * "**The Warrior** · noon air (8.5 EHB)" from rows ({ name, placement,
 * value }), first place only, joint winners together. Null when nobody won.
 */
function winnerLine(title, rows) {
  const winners = rows.filter((r) => r.placement === 1);
  if (!winners.length) return null;
  const names = winners.map((r) => r.name).sort((x, y) => x.localeCompare(y));
  return `**${title.name}** · ${joinNames(names)} (${formatTitleValue(title, winners[0].value)})`;
}

/**
 * "{gold} noon air\n{silver} TheLastAesir\n{bronze} xijaffa": places 1-3,
 * joint places on one line, no values. Null when nobody placed.
 */
function podiumValue(rows) {
  const lines = [];
  for (let place = 1; place <= MEDALS.length; place++) {
    const names = rows.filter((r) => r.placement === place).map((r) => r.name).sort((x, y) => x.localeCompare(y));
    if (names.length) lines.push(`${MEDALS[place - 1]} ${joinNames(names)}`);
  }
  return lines.length ? lines.join('\n') : null;
}

/**
 * @param {object} week
 * @param {string|Date} week.weekStart
 * @param {string|Date} week.weekEnd
 * @param {Array<{ player_name: string, placement: number, xp_gained: number }>} week.gainer
 *   that week's xp_awards rows
 * @param {Array<{ title: string, player_name: string, placement: number, value: number }>} week.awards
 *   that week's weekly_title_awards rows
 * @param {{ style?: 'winners' | 'podium' }} [options]
 * @returns a Discord message body
 */
export function renderWeeklyTitlesMessage({ weekStart, weekEnd, gainer = [], awards = [] }, { style = STYLES.winners } = {}) {
  if (!Object.hasOwn(STYLES, style)) throw new Error(`Unknown style: ${style}`);

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

  const [first, second, third] = TITLE_POINTS;
  const points = `Winners earned ${first} Siege Score points, with ${second} for 2nd and ${third} for 3rd.`;

  const embed = {
    color: EMBED_COLOR,
    title: `Weekly titles · ${weekLabel(weekStart, weekEnd)}`,
    url: LEADERBOARD_URL,
  };
  if (style === STYLES.podium) {
    embed.description = points;
    embed.fields = races
      // The Gainer full width on top, then the titles three to a row.
      .map(({ title, rows }) => ({ name: title.name, value: podiumValue(rows), inline: title !== GAINER }))
      .filter((f) => f.value);
  } else {
    const lines = races.map(({ title, rows }) => winnerLine(title, rows)).filter(Boolean);
    embed.description = `${lines.join('\n')}\n\n${points}`;
  }

  return {
    embeds: [embed],
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
  const fields = (embed.fields || []).flatMap((f) => [f.name, f.value, '']);
  return [
    embed.title,
    '',
    embed.description,
    '',
    ...fields,
    `[ ${message.components[0].components[0].label} ] ${LEADERBOARD_URL}`,
  ].join('\n');
}
