// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { weekSchedule, nextPollSchedule, londonTime, formatLondon } = require('../ukTime.cjs');

const iso = (s) => Object.fromEntries(
  Object.entries(s).map(([k, v]) => [k, v instanceof Date ? v.toISOString() : v])
);

describe('weekSchedule (Europe/London)', () => {
  it('winter: 19:00 UK is 19:00 UTC', () => {
    expect(iso(weekSchedule(new Date('2026-11-18T12:00:00Z')))).toEqual({
      pollOpensAt: '2026-11-16T19:00:00.000Z',
      pollClosesAt: '2026-11-20T19:00:00.000Z',
      competitionStartsAt: '2026-11-23T19:00:00.000Z',
      competitionEndsAt: '2026-11-30T19:00:00.000Z',
      weekStart: '2026-11-23',
    });
  });

  it('summer: 19:00 UK is 18:00 UTC', () => {
    const s = weekSchedule(new Date('2026-07-01T12:00:00Z'));
    expect(s.pollOpensAt.toISOString()).toBe('2026-06-29T18:00:00.000Z');
    expect(s.competitionStartsAt.toISOString()).toBe('2026-07-06T18:00:00.000Z');
  });

  it('clocks go back (Sun 25 Oct 2026) between poll and competition', () => {
    const s = weekSchedule(new Date('2026-10-20T12:00:00Z'));
    expect(s.pollOpensAt.toISOString()).toBe('2026-10-19T18:00:00.000Z'); // BST
    expect(s.pollClosesAt.toISOString()).toBe('2026-10-23T18:00:00.000Z'); // BST
    expect(s.competitionStartsAt.toISOString()).toBe('2026-10-26T19:00:00.000Z'); // GMT
  });

  it('clocks go forward (Sun 28 Mar 2027) between poll and competition', () => {
    const s = weekSchedule(new Date('2027-03-24T12:00:00Z'));
    expect(s.pollOpensAt.toISOString()).toBe('2027-03-22T19:00:00.000Z'); // GMT
    expect(s.competitionStartsAt.toISOString()).toBe('2027-03-29T18:00:00.000Z'); // BST
  });

  it('uses the London date, not the UTC date', () => {
    // Sunday 23:30 UTC in June is already Monday 00:30 in London.
    expect(weekSchedule(new Date('2026-06-14T23:30:00Z')).weekStart).toBe('2026-06-22');
  });

  it('puts Sunday in the week that started the Monday before', () => {
    expect(weekSchedule(new Date('2026-11-22T22:00:00Z')).weekStart).toBe('2026-11-23');
  });

  it('crosses month and year boundaries', () => {
    const s = weekSchedule(new Date('2026-12-30T12:00:00Z'));
    expect(s.pollOpensAt.toISOString()).toBe('2026-12-28T19:00:00.000Z');
    expect(s.weekStart).toBe('2027-01-04');
  });
});

describe('nextPollSchedule', () => {
  it('is this week before Monday 19:00, next week after', () => {
    expect(nextPollSchedule(new Date('2026-11-16T18:59:00Z')).weekStart).toBe('2026-11-23');
    expect(nextPollSchedule(new Date('2026-11-16T19:00:00Z')).weekStart).toBe('2026-11-30');
  });
});

describe('londonTime and formatLondon', () => {
  it('round-trips', () => {
    expect(londonTime(2026, 6, 15, 19).toISOString()).toBe('2026-06-15T18:00:00.000Z');
    expect(formatLondon(new Date('2026-06-15T18:00:00Z'))).toMatch(/19:00 BST/);
    expect(formatLondon(new Date('2026-11-16T19:00:00Z'))).toMatch(/19:00 GMT/);
  });
});
