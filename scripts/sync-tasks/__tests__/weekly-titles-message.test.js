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

// The real week of 9 to 16 Nov 2026, as stored.
const WEEK = {
  weekStart: '2026-11-09T19:00:00+00:00',
  weekEnd: '2026-11-16T19:00:00+00:00',
  gainer: [
    { placement: 1, player_name: 'FinPunisher', xp_gained: 16310000 },
    { placement: 2, player_name: 'acid scum', xp_gained: 8260000 },
    { placement: 3, player_name: 'ottogodblest', xp_gained: 6680000 },
    { placement: 4, player_name: 'Fourth', xp_gained: 5000000 },
    { placement: 5, player_name: 'Fifth', xp_gained: 4000000 },
  ],
  awards: [
    // Out of order on purpose: the message orders by the title list.
    award('boss_hunter', 1, 'FinPunisher', 533),
    award('boss_hunter', 2, 'CursedClover', 454),
    award('boss_hunter', 3, 'TheLastAesir', 436),
    award('warrior', 1, 'noon air', 8.47),
    award('warrior', 2, 'TheLastAesir', 7.98),
    award('warrior', 3, 'xijaffa', 7.94),
    award('resurrected', 1, 'IlZion', 310000),
    award('resurrected', 2, 'resnesv2', 206000),
    award('raider', 1, '1819 B', 17),
    award('raider', 2, 'Hezz', 13),
    award('raider', 3, 'Sloth Bone', 9),
    award('raider', 3, 'elegant hobo', 9),
  ],
};

const fieldsOf = (message) => message.embeds[0].fields;
const field = (message, name) => fieldsOf(message).find((f) => f.name === name);

describe('renderWeeklyTitlesMessage', () => {
  const message = renderWeeklyTitlesMessage(WEEK);

  it('titles the week in UK dates and links the Leaderboard', () => {
    const embed = message.embeds[0];
    expect(embed.title).toBe('Weekly titles · 9 to 16 Nov');
    expect(embed.url).toBe(LEADERBOARD_URL);
    expect(embed.color).toBe(0xff9800);
    expect(message.components[0].components[0]).toMatchObject({ style: 5, label: 'View the leaderboard', url: LEADERBOARD_URL });
  });

  it('never pings anyone', () => {
    expect(message.allowed_mentions).toEqual({ parse: [] });
  });

  it('puts The Gainer first, full width, with the top 3 only', () => {
    const [gainer] = fieldsOf(message);
    expect(gainer).toEqual({
      name: 'The Gainer · most Overall XP',
      value: '**FinPunisher** · 16.31M XP\n2nd acid scum 8.26M · 3rd ottogodblest 6.68M',
      inline: false,
    });
  });

  it('lists titles in the site order, side by side, leaving out titles nobody won', () => {
    expect(fieldsOf(message).map((f) => [f.name, f.inline])).toEqual([
      ['The Gainer · most Overall XP', false],
      ['The Warrior', true],
      ['The Resurrected', true],
      ['The Raider', true],
      ['The Boss Hunter', true],
    ]);
  });

  it('shows the winner with the unit and the runners-up without it', () => {
    expect(field(message, 'The Warrior').value).toBe('**noon air** · 8.5 EHB\n2nd TheLastAesir 8.0\n3rd xijaffa 7.9');
    expect(field(message, 'The Boss Hunter').value).toBe('**FinPunisher** · 533 kills\n2nd CursedClover 454\n3rd TheLastAesir 436');
  });

  it('shows a title with only two placings', () => {
    expect(field(message, 'The Resurrected').value).toBe('**IlZion** · 310K XP\n2nd resnesv2 206K');
  });

  it('puts a tie on one line', () => {
    expect(field(message, 'The Raider').value).toBe('**1819 B** · 17 raids\n2nd Hezz 13\n3rd elegant hobo & Sloth Bone 9');
  });

  it('handles a tie for first and a big tie', () => {
    const msg = renderWeeklyTitlesMessage({
      ...WEEK,
      gainer: [],
      awards: [
        award('clue_hunter', 1, 'K aura', 50),
        award('clue_hunter', 1, 'B', 50),
        ...['a', 'b', 'c', 'd', 'e'].map((n) => award('clue_hunter', 3, n, 10)),
      ],
    });
    expect(fieldsOf(msg)).toEqual([
      { name: 'The Clue Hunter', value: '**B & K aura** · 50 clues\n3rd a & b & c (+2 more) 10', inline: true },
    ]);
  });

  it('escapes Discord markdown in names', () => {
    expect(escapeName('big_dave*')).toBe('big\\_dave\\*');
    const msg = renderWeeklyTitlesMessage({ ...WEEK, gainer: [], awards: [award('warrior', 1, 'big_dave', 6)] });
    expect(fieldsOf(msg)[0].value).toBe('**big\\_dave** · 6.0 EHB');
  });

  it('stays inside Discord limits', () => {
    const embed = message.embeds[0];
    expect(embed.fields.length).toBeLessThanOrEqual(25);
    const chars = [embed.title, embed.description, embed.footer.text, embed.author.name]
      .concat(embed.fields.flatMap((f) => [f.name, f.value]))
      .join('').length;
    expect(chars).toBeLessThan(6000);
    for (const f of embed.fields) expect(f.value.length).toBeLessThanOrEqual(1024);
  });

  it('is the same every time', () => {
    expect(renderWeeklyTitlesMessage(WEEK)).toEqual(message);
  });

  it('reads as text for the preview', () => {
    const text = messageAsText(message);
    expect(text.startsWith('Weekly titles · 9 to 16 Nov\n')).toBe(true);
    expect(text).toContain('The Raider\n**1819 B** · 17 raids');
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
