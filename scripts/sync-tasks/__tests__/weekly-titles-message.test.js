// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  renderWeeklyTitlesMessage,
  messageAsText,
  weekLabel,
  escapeName,
  titleEmojis,
  LEADERBOARD_URL,
} from '../weekly-titles-message.mjs';

const award = (title, placement, player_name, value) => ({ title, placement, player_name, value });

// The real week of 9 to 16 Nov 2026, as stored (some titles and places left out).
const WEEK = {
  weekStart: '2026-11-09T19:00:00+00:00',
  weekEnd: '2026-11-16T19:00:00+00:00',
  gainer: [
    { placement: 1, player_name: 'OakSmasher', xp_gained: 16310000 },
    { placement: 2, player_name: 'iron wisp', xp_gained: 8260000 },
    { placement: 3, player_name: 'pebbleking', xp_gained: 6680000 },
  ],
  awards: [
    // Out of order on purpose: the message orders by the title list.
    award('boss_hunter', 1, 'OakSmasher', 533),
    award('boss_hunter', 2, 'GildedFern', 454),
    award('warrior', 1, 'dusk owl', 8.47),
    award('warrior', 2, 'TheFirstRaven', 7.98),
    award('warrior', 3, 'qelmoss', 7.94),
    award('resurrected', 1, 'MoBeacon', 310000),
    award('raider', 1, '4402 K', 17),
    award('raider', 3, 'Moss Crab', 9),
    award('raider', 3, 'gentle yak', 9),
  ],
};

const POINTS = 'Winners earned 150 Siege Score points, with 100 for 2nd and 50 for 3rd.';

describe('renderWeeklyTitlesMessage', () => {
  const message = renderWeeklyTitlesMessage(WEEK);
  const embed = message.embeds[0];

  it('titles the week in UK dates and links the Leaderboard', () => {
    expect(embed.title).toBe("Last week's champions · 9 to 16 Nov");
    expect(embed.url).toBe(LEADERBOARD_URL);
    expect(embed.color).toBe(0xff9800);
    expect(message.components[0].components[0]).toMatchObject({ style: 5, label: 'View the leaderboard', url: LEADERBOARD_URL });
  });

  it('never pings anyone', () => {
    expect(message.allowed_mentions).toEqual({ parse: [] });
  });

  it('lists each winner with 2nd and 3rd in small text underneath, The Gainer first, nobody-won titles left out', () => {
    expect(embed.description).toBe(
      [
        '**The Gainer** · OakSmasher (16.31M XP)',
        '-# 2nd iron wisp · 3rd pebbleking',
        '**The Warrior** · dusk owl (8.5 EHB)',
        '-# 2nd TheFirstRaven · 3rd qelmoss',
        '**The Resurrected** · MoBeacon (310K XP)',
        '**The Raider** · 4402 K (17 raids)',
        '-# 3rd gentle yak & Moss Crab',
        '**The Boss Hunter** · OakSmasher (533 kills)',
        '-# 2nd GildedFern',
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

  it('starts each line with the title emoji the server has, and goes without otherwise', () => {
    const emojis = titleEmojis([
      { id: '111', name: 'title_warrior' },
      { id: '222', name: 'title_gainer', animated: true },
      { id: '333', name: 'title_raider', available: false },
      { id: '444', name: 'Farming' },
    ]);
    expect(Object.keys(emojis).sort()).toEqual(['gainer', 'warrior']);

    const lines = renderWeeklyTitlesMessage(WEEK, { emojis }).embeds[0].description.split('\n');
    expect(lines[0]).toBe('<a:title_gainer:222> **The Gainer** · OakSmasher (16.31M XP)');
    expect(lines[2]).toBe('<:title_warrior:111> **The Warrior** · dusk owl (8.5 EHB)');
    expect(lines[5]).toBe('**The Raider** · 4402 K (17 raids)');
  });

  it('puts joint winners on one line, and cuts a big tie short', () => {
    const two = renderWeeklyTitlesMessage({
      ...WEEK,
      gainer: [],
      awards: [award('clue_hunter', 1, 'R ember', 50), award('clue_hunter', 1, 'B', 50)],
    });
    expect(two.embeds[0].description.split('\n')[0]).toBe('**The Clue Hunter** · B & R ember (50 clues)');

    const five = renderWeeklyTitlesMessage({
      ...WEEK,
      gainer: [],
      awards: [award('clue_hunter', 1, 'z', 12), ...['e', 'd', 'c', 'b', 'a'].map((n) => award('clue_hunter', 2, n, 10))],
    });
    expect(five.embeds[0].description.split('\n').slice(0, 2)).toEqual([
      '**The Clue Hunter** · z (12 clues)',
      '-# 2nd a & b & c (+2 more)',
    ]);
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
    expect(text.startsWith("Last week's champions · 9 to 16 Nov\n\n**The Gainer**")).toBe(true);
    expect(text).toContain(POINTS);
    expect(text).toContain(LEADERBOARD_URL);
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
