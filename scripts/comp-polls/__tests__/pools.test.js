// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

// Real Node require, so these load exactly as the GitHub Actions job does.
const require = createRequire(import.meta.url);
const {
  METRIC_NAMES,
  SKILL_OPTIONS,
  BOSS_OPTIONS,
  RAID_OPTIONS,
  CATEGORIES,
  competitionPayloads,
  uncoveredBossMetrics,
} = require('../pools.cjs');

const allOptions = [...SKILL_OPTIONS, ...BOSS_OPTIONS, ...RAID_OPTIONS];

describe('poll pools', () => {
  it('names every metric an option can create a competition for', () => {
    for (const option of allOptions) {
      for (const metric of option.metrics) {
        expect(METRIC_NAMES[metric], metric).toBeTruthy();
      }
    }
  });

  it('never offers the same metric in two options', () => {
    const metrics = allOptions.flatMap((o) => o.metrics);
    expect(new Set(metrics).size).toBe(metrics.length);
  });

  it('offers the agreed skills: no combat skills, Sailing and Prayer in', () => {
    const skills = SKILL_OPTIONS.map((o) => o.metrics[0]);
    expect(skills).toHaveLength(18);
    expect(skills).toEqual(expect.arrayContaining(['sailing', 'prayer']));
    for (const combat of ['attack', 'strength', 'defence', 'magic', 'ranged', 'hitpoints']) {
      expect(skills).not.toContain(combat);
    }
  });

  it('marks exactly the approved entry-level bosses', () => {
    const entry = BOSS_OPTIONS.filter((o) => o.entryLevel).flatMap((o) => o.metrics).sort();
    expect(entry).toEqual([
      'barrows_chests', 'bryophyta', 'giant_mole', 'king_black_dragon', 'obor',
      'sarachnis', 'scurrius', 'tempoross', 'the_royal_titans', 'wintertodt',
    ]);
  });

  it('keeps raids out of BotW', () => {
    const raidMetrics = new Set(RAID_OPTIONS.flatMap((o) => o.metrics));
    for (const option of BOSS_OPTIONS) {
      for (const metric of option.metrics) expect(raidMetrics.has(metric), metric).toBe(false);
    }
  });

  it('runs bundles the way the clan always has', () => {
    const dks = BOSS_OPTIONS.find((o) => o.name === 'Dagannoth Kings');
    expect(dks.metrics).toEqual(['dagannoth_prime', 'dagannoth_rex', 'dagannoth_supreme']);
    const cox = RAID_OPTIONS.find((o) => o.name === 'Chambers of Xeric');
    expect(cox.metrics).toContain('chambers_of_xeric_challenge_mode');
  });

  it('fits Discord and WOM length limits', () => {
    for (const option of allOptions) {
      expect(option.name.length, option.name).toBeLessThanOrEqual(80); // button label
    }
    for (const [key, category] of Object.entries(CATEGORIES)) {
      for (const option of category.pool) {
        for (const { title } of competitionPayloads(key, option, new Date(0), new Date(1))) {
          expect(title.length, title).toBeLessThanOrEqual(50); // WOM title
        }
      }
    }
  });

  it('builds one WOM competition per metric, in the current title format', () => {
    const starts = new Date('2026-11-23T19:00:00Z');
    const ends = new Date('2026-11-30T19:00:00Z');
    const dks = BOSS_OPTIONS.find((o) => o.name === 'Dagannoth Kings');
    expect(competitionPayloads('botw', dks, starts, ends)).toEqual([
      { title: 'Siege BotW - Dagannoth Prime', metric: 'dagannoth_prime', startsAt: starts.toISOString(), endsAt: ends.toISOString() },
      { title: 'Siege BotW - Dagannoth Rex', metric: 'dagannoth_rex', startsAt: starts.toISOString(), endsAt: ends.toISOString() },
      { title: 'Siege BotW - Dagannoth Supreme', metric: 'dagannoth_supreme', startsAt: starts.toISOString(), endsAt: ends.toISOString() },
    ]);
  });

  it('flags WOM bosses that no poll offers, but not deliberate exclusions', () => {
    expect(uncoveredBossMetrics(['obor', 'mimic', 'tombs_of_amascut', 'brand_new_boss'])).toEqual(['brand_new_boss']);
  });
});
