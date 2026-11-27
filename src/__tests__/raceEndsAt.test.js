import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { raceEndsAt } from '../utils/races';

const require = createRequire(import.meta.url);
const sync = require('../../netlify/functions/utils/raceProgress.cjs');

describe('raceEndsAt', () => {
  it('runs a race to the end of its end date', () => {
    // The race form's "2026-12-01", as the database stores it.
    expect(raceEndsAt('2026-12-01T00:00:00+00:00')).toEqual(new Date('2026-12-02T00:00:00Z'));
    expect(raceEndsAt('2026-12-01')).toEqual(new Date('2026-12-02T00:00:00Z'));
  });

  it('keeps a stored time that is not midnight UTC', () => {
    expect(raceEndsAt('2026-12-01T18:30:00Z')).toEqual(new Date('2026-12-01T18:30:00Z'));
  });

  it('is null for no end date', () => {
    expect(raceEndsAt(null)).toBeNull();
    expect(raceEndsAt('')).toBeNull();
    expect(raceEndsAt('not a date')).toBeNull();
  });

  it('matches the rule the sync uses to complete races', () => {
    for (const value of ['2026-12-01T00:00:00+00:00', '2026-06-30', '2026-12-01T18:30:00Z', null, 'not a date']) {
      expect(raceEndsAt(value)).toEqual(sync.raceEndsAt(value));
    }
  });
});
