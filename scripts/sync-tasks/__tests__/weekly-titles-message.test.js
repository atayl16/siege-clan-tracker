// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  renderWeeklyTitlesMessage,
  messageAsText,
  weekLabel,
  escapeName,
  LEADERBOARD_URL,
} from '../weekly-titles-message.mjs';

const award = (title, placement, player_name, value) => ({ title, placement, player_name, value });

// The real week of 9 to 16 Nov 2026, as stored (some titles left out).
const WEEK = {
  weekStart: '2026-11-09T19:00:00+00:00',
  weekEnd: '2026-11-16T19:00:00+00:00',
  gainer: [
    { placement: 1, player_name: 'FinPunisher', xp_gained: 16310000 },
    { placement: 2, player_name: 'acid scum', xp_gained: 8260000 },
    { placement: 3, player_name: 'ottogodblest', xp_gained: 6680000 },
  ],
  awards: [
    // Out of order on purpose: the message orders by the title list.
    award('boss_hunter', 1, 'FinPunisher', 533),
    award('boss_hunter', 2, 'CursedClover', 454),
    award('warrior', 1, 'noon air', 8.47),
    award('warrior', 2, 'TheLastAesir', 7.98),
    award('warrior', 3, 'xijaffa', 7.94),
    award('resurrected', 1, 'IlZion', 310000),
    award('raider', 1, '1819 B', 17),
    award('raider', 3, 'Sloth Bone', 9),
    award('raider', 3, 'elegant hobo', 9),
  ],
};

const POINTS = 'Winners earned 150 Siege Score points, with 100 for 2nd and 50 for 3rd.';

describe('renderWeeklyTitlesMessage', () => {
  const message = renderWeeklyTitlesMessage(WEEK);
  const embed = message.embeds[0];

  it('titles the week in UK dates and links the Leaderboard', () => {
    expect(embed.title).toBe('Weekly titles · 9 to 16 Nov');
    expect(embed.url).toBe(LEADERBOARD_URL);
    expect(embed.color).toBe(0xff9800);
    expect(message.components[0].components[0]).toMatchObject({ style: 5, label: 'View the leaderboard', url: LEADERBOARD_URL });
  });

  it('never pings anyone', () => {
    expect(message.allowed_mentions).toEqual({ parse: [] });
  });

  it('lists one winner per line, The Gainer first, titles in site order, nobody-won titles left out', () => {
    expect(embed.description).toBe(
      [
        '**The Gainer** · FinPunisher (16.31M XP)',
        '**The Warrior** · noon air (8.5 EHB)',
        '**The Resurrected** · IlZion (310K XP)',
        '**The Raider** · 1819 B (17 raids)',
        '**The Boss Hunter** · FinPunisher (533 kills)',
        '',
        POINTS,
      ].join('\n')
    );
  });

  it('has no fields, author or footer', () => {
    expect(embed.fields).toBeUndefined();
    expect(embed.author).toBeUndefined();
    expect(embed.footer).toBeUndefined();
  });

  it('puts joint winners on one line, and cuts a big tie short', () => {
    const two = renderWeeklyTitlesMessage({
      ...WEEK,
      gainer: [],
      awards: [award('clue_hunter', 1, 'K aura', 50), award('clue_hunter', 1, 'B', 50)],
    });
    expect(two.embeds[0].description.split('\n')[0]).toBe('**The Clue Hunter** · B & K aura (50 clues)');

    const five = renderWeeklyTitlesMessage({
      ...WEEK,
      gainer: [],
      awards: ['e', 'd', 'c', 'b', 'a'].map((n) => award('clue_hunter', 1, n, 10)),
    });
    expect(five.embeds[0].description.split('\n')[0]).toBe('**The Clue Hunter** · a & b & c (+2 more) (10 clues)');
  });

  it('escapes Discord markdown in names', () => {
    expect(escapeName('big_dave*')).toBe('big\\_dave\\*');
    const msg = renderWeeklyTitlesMessage({ ...WEEK, gainer: [], awards: [award('warrior', 1, 'big_dave', 6)] });
    expect(msg.embeds[0].description.split('\n')[0]).toBe('**The Warrior** · big\\_dave (6.0 EHB)');
  });

  it('stays inside Discord limits', () => {
    expect(embed.description.length).toBeLessThan(4096);
  });

  it('is the same every time', () => {
    expect(renderWeeklyTitlesMessage(WEEK)).toEqual(message);
  });

  it('reads as text for the preview', () => {
    const text = messageAsText(message);
    expect(text.startsWith('Weekly titles · 9 to 16 Nov\n\n**The Gainer**')).toBe(true);
    expect(text).toContain(POINTS);
    expect(text).toContain(LEADERBOARD_URL);
  });
});

describe('renderWeeklyTitlesMessage, podium style', () => {
  const G = '\u{1F947}';
  const S = '\u{1F948}';
  const B = '\u{1F949}';
  const message = renderWeeklyTitlesMessage(WEEK, { style: 'podium' });
  const embed = message.embeds[0];

  it('has the same title, link, button and points line', () => {
    expect(embed.title).toBe('Weekly titles · 9 to 16 Nov');
    expect(embed.description).toBe(POINTS);
    expect(message.components[0].components[0].url).toBe(LEADERBOARD_URL);
    expect(message.allowed_mentions).toEqual({ parse: [] });
  });

  it('lists 1st to 3rd behind medals, no values, The Gainer full width', () => {
    expect(embed.fields).toEqual([
      { name: 'The Gainer', value: `${G} FinPunisher\n${S} acid scum\n${B} ottogodblest`, inline: false },
      { name: 'The Warrior', value: `${G} noon air\n${S} TheLastAesir\n${B} xijaffa`, inline: true },
      { name: 'The Resurrected', value: `${G} IlZion`, inline: true },
      // Two tied for 2nd would leave no 3rd; here a 3rd with no 2nd keeps its bronze.
      { name: 'The Raider', value: `${G} 1819 B\n${B} elegant hobo & Sloth Bone`, inline: true },
      { name: 'The Boss Hunter', value: `${G} FinPunisher\n${S} CursedClover`, inline: true },
    ]);
  });

  it('reads as text for the preview', () => {
    expect(messageAsText(message)).toContain(`The Warrior\n${G} noon air`);
  });

  it('rejects an unknown style', () => {
    expect(() => renderWeeklyTitlesMessage(WEEK, { style: 'toString' })).toThrow('Unknown style');
  });
});

describe('weekLabel', () => {
  it('names the month once inside a month, twice across one', () => {
    expect(weekLabel('2026-11-09T19:00:00Z', '2026-11-16T19:00:00Z')).toBe('9 to 16 Nov');
    expect(weekLabel('2026-11-30T19:00:00Z', '2026-12-07T19:00:00Z')).toBe('30 Nov to 7 Dec');
  });

  it('uses the UK date in summer time', () => {
    // 18:00 UTC on 29 June is 19:00 BST on 29 June.
    expect(weekLabel('2026-06-29T18:00:00Z', '2026-07-06T18:00:00Z')).toBe('29 Jun to 6 Jul');
  });
});
