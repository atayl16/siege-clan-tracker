// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const {
  lastEndByMetric,
  weeksSinceLastRun,
  drawOptions,
  choosePollOptions,
  withWeeksSince,
  chooseWinner,
} = require('../rotation.cjs');
const { SKILL_OPTIONS, RAID_OPTIONS } = require('../pools.cjs');

const WEEK = 7 * 24 * 60 * 60 * 1000;
const POLL_OPENS = new Date('2026-11-16T19:00:00Z');

/** A competition that ended `weeksAgo` weeks before the poll opened (negative = still running). */
const ended = (metric, weeksAgo) => ({
  metric,
  startsAt: new Date(POLL_OPENS.getTime() - (weeksAgo + 1) * WEEK).toISOString(),
  endsAt: new Date(POLL_OPENS.getTime() - weeksAgo * WEEK).toISOString(),
});

/** Seeded PRNG so draws are repeatable. */
function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const names = (options) => options.map((o) => o.name);

describe('weeksSinceLastRun', () => {
  it('uses the latest competition, across every metric in a bundle', () => {
    const lastEnds = lastEndByMetric([ended('dagannoth_rex', 30), ended('dagannoth_prime', 4), ended('dagannoth_prime', 20)]);
    const dks = { metrics: ['dagannoth_prime', 'dagannoth_rex', 'dagannoth_supreme'] };
    expect(weeksSinceLastRun(dks, lastEnds, POLL_OPENS)).toBeCloseTo(4);
  });

  it('is Infinity for never run and negative for still running', () => {
    const lastEnds = lastEndByMetric([ended('slayer', -1)]);
    expect(weeksSinceLastRun({ metrics: ['obor'] }, lastEnds, POLL_OPENS)).toBe(Infinity);
    expect(weeksSinceLastRun({ metrics: ['slayer'] }, lastEnds, POLL_OPENS)).toBeLessThan(0);
  });

  it('ignores competitions with unparseable dates', () => {
    const lastEnds = lastEndByMetric([{ metric: 'obor', endsAt: 'not a date' }]);
    expect(lastEnds.has('obor')).toBe(false);
  });
});

describe('drawOptions', () => {
  const pool = ['a', 'b', 'c', 'd'].map((m) => ({ name: m, metrics: [m] }));

  it('skips anything that ended within the recent window or is still running', () => {
    const lastEnds = lastEndByMetric([ended('a', 3), ended('b', -1), ended('c', 8)]);
    const picked = drawOptions(pool, { count: 4, recentWeeks: 8 }, lastEnds, POLL_OPENS, rng());
    // c ended exactly 8 weeks ago, so it is back in; d never ran. a and b only
    // come back as fallback, and b never does because it is running.
    expect(names(picked).slice(0, 2).sort()).toEqual(['c', 'd']);
    expect(names(picked)).toEqual(expect.arrayContaining(['a']));
    expect(names(picked)).not.toContain('b');
  });

  it('fills a shortfall with the oldest, never with something running', () => {
    const lastEnds = lastEndByMetric([ended('a', 1), ended('b', 5), ended('c', 3), ended('d', -1)]);
    const picked = drawOptions(pool, { count: 2, recentWeeks: 8 }, lastEnds, POLL_OPENS, rng());
    expect(names(picked)).toEqual(['b', 'c']);
  });

  it('favours options that have not run for a long time', () => {
    const lastEnds = lastEndByMetric([ended('a', 9), ended('b', 9), ended('c', 9)]); // d never ran
    const random = rng(7);
    let dPicked = 0;
    for (let i = 0; i < 2000; i++) {
      const [first] = drawOptions(pool, { count: 1, recentWeeks: 8 }, lastEnds, POLL_OPENS, random);
      if (first.name === 'd') dPicked++;
    }
    // Weights 9, 9, 9 vs 104: d should win about 79% of single draws.
    expect(dPicked / 2000).toBeGreaterThan(0.7);
    expect(dPicked / 2000).toBeLessThan(0.88);
  });
});

describe('choosePollOptions', () => {
  it('SotW: 5 skills, none from the last 8 weeks', () => {
    const recent = ['slayer', 'runecrafting', 'fletching', 'prayer', 'cooking', 'agility'];
    const history = [
      ...recent.map((m, i) => ended(m, i - 1)), // one still running, the rest 0-4 weeks ago
      ...SKILL_OPTIONS.filter((o) => !recent.includes(o.metrics[0])).map((o, i) => ended(o.metrics[0], 9 + i)),
    ];
    for (let seed = 1; seed <= 20; seed++) {
      const options = choosePollOptions('sotw', history, POLL_OPENS, rng(seed));
      expect(options).toHaveLength(5);
      for (const option of options) expect(recent).not.toContain(option.metrics[0]);
    }
  });

  it('BotW: 5 options, exactly 2 entry-level, alphabetical', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const options = choosePollOptions('botw', [], POLL_OPENS, rng(seed));
      expect(options).toHaveLength(5);
      expect(options.filter((o) => o.entryLevel)).toHaveLength(2);
      expect(names(options)).toEqual([...names(options)].sort((a, b) => a.localeCompare(b)));
    }
  });

  it('BotW: still offers 2 entry-level bosses when most ran recently', () => {
    const recentEntry = ['scurrius', 'obor', 'bryophyta', 'giant_mole', 'sarachnis', 'barrows_chests', 'the_royal_titans', 'king_black_dragon'];
    const history = [
      ...recentEntry.map((m, i) => ended(m, i)),
      ended('wintertodt', -1), // running now
      ended('tempoross', 2),
    ];
    const options = choosePollOptions('botw', history, POLL_OPENS, rng());
    const entry = options.filter((o) => o.entryLevel);
    expect(entry).toHaveLength(2);
    expect(names(entry)).not.toContain('Wintertodt');
  });

  it('RotW: every raid except the one running this week', () => {
    const history = [ended('tombs_of_amascut_expert', -1), ended('theatre_of_blood', 0)];
    const options = choosePollOptions('rotw', history, POLL_OPENS, rng());
    expect(names(options)).toEqual(['Chambers of Xeric', 'The Fractured Archive', 'Theatre of Blood']);
  });

  it('RotW: all four raids when none is running', () => {
    expect(choosePollOptions('rotw', [], POLL_OPENS, rng())).toHaveLength(RAID_OPTIONS.length);
  });

  it('rejects an unknown category', () => {
    expect(() => choosePollOptions('cotw', [], POLL_OPENS)).toThrow(/Unknown poll category/);
  });
});

describe('chooseWinner', () => {
  const opts = (...weeks) => weeks.map((w, i) => ({ name: `o${i}`, weeksSince: w }));

  it('picks the most votes', () => {
    expect(chooseWinner(opts(10, 20, 30), [5, 9, 2])).toBe(1);
  });

  it('breaks a tie in favour of the one run least recently', () => {
    expect(chooseWinner(opts(10, 40, 20), [4, 4, 4])).toBe(1);
    expect(chooseWinner(opts(10, 40, Infinity), [4, 4, 1])).toBe(1);
  });

  it('treats never-run as oldest', () => {
    expect(chooseWinner(opts(50, Infinity), [3, 3])).toBe(1);
  });

  it('with no votes, the one run least recently wins', () => {
    expect(chooseWinner(opts(10, 12, 30, 9), [0, 0, 0, 0])).toBe(2);
  });

  it('settles a full tie with rng', () => {
    expect(chooseWinner(opts(10, 10), [1, 1], () => 0)).toBe(0);
    expect(chooseWinner(opts(10, 10), [1, 1], () => 0.99)).toBe(1);
  });

  it('works on options read back from the database, where Infinity became null', () => {
    const stored = JSON.parse(JSON.stringify([
      { name: 'Obor', metrics: ['obor'], weeksSince: Infinity },
      { name: 'Zulrah', metrics: ['zulrah'], weeksSince: 13 },
    ]));
    expect(stored[0].weeksSince).toBeNull();
    const fresh = withWeeksSince(stored, [ended('zulrah', 13)], POLL_OPENS);
    expect(chooseWinner(fresh, [2, 2])).toBe(0);
  });

  it('refuses mismatched counts', () => {
    expect(() => chooseWinner(opts(1, 2), [1])).toThrow(/2 options/);
  });
});
