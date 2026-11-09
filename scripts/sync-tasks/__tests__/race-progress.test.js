import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { metricValue, planRaceUpdates } = require('../race-progress.cjs');

const snapshot = {
  skills: { sailing: { experience: 50000 }, fishing: { experience: -1 } },
  bosses: { zulrah: { kills: 120 } },
  activities: { clue_scrolls_all: { score: 33 } },
  computed: { ehb: { value: 12.5 } },
};

describe('metricValue', () => {
  it.each([
    ['sailing', 50000],
    ['zulrah', 120],
    ['clue_scrolls_all', 33],
    ['ehb', 12.5],
    ['fishing', 0], // WOM's -1 (unranked) counts as 0
    ['vorkath', null], // not in the snapshot
  ])('%s -> %s', (metric, expected) => {
    expect(metricValue(snapshot, metric)).toBe(expected);
  });

  it('handles a missing snapshot', () => {
    expect(metricValue(undefined, 'sailing')).toBeNull();
  });
});

const NOW = new Date('2026-11-09T12:00:00Z');
const participant = (overrides) => ({
  id: 'p1',
  wom_id: 1,
  metric: 'sailing',
  target_value: 20000,
  start_value: 0,
  current_value: 0,
  baseline_set_at: '2026-11-08T12:00:00Z',
  is_winner: false,
  ...overrides,
});
const snaps = (entries) => new Map(entries.map(([id, xp]) => [id, { skills: { sailing: { experience: xp } } }]));

describe('planRaceUpdates', () => {
  it('records a baseline the first time it sees a participant, with no gain yet', () => {
    const race = { id: 'r1', participants: [participant({ baseline_set_at: null })] };
    const { participantUpdates } = planRaceUpdates(race, snaps([[1, 50000]]), NOW);
    expect(participantUpdates).toEqual([
      { id: 'p1', changes: { start_value: 50000, current_value: 0, baseline_set_at: NOW.toISOString() } },
    ]);
  });

  it('updates the gain since the baseline', () => {
    const race = { id: 'r1', participants: [participant({ start_value: 50000, current_value: 100 })] };
    const { participantUpdates } = planRaceUpdates(race, snaps([[1, 55000]]), NOW);
    expect(participantUpdates).toEqual([{ id: 'p1', changes: { current_value: 5000 } }]);
  });

  it('writes nothing when the gain has not changed', () => {
    const race = { id: 'r1', participants: [participant({ start_value: 50000, current_value: 5000 })] };
    expect(planRaceUpdates(race, snaps([[1, 55000]]), NOW).participantUpdates).toEqual([]);
  });

  it('skips players WOM had no data for', () => {
    const race = { id: 'r1', participants: [participant({ baseline_set_at: null })] };
    expect(planRaceUpdates(race, new Map(), NOW).participantUpdates).toEqual([]);
  });

  it('marks the first participant to reach their target as the winner', () => {
    const race = {
      id: 'r1',
      participants: [
        participant({ id: 'a', wom_id: 1, start_value: 0 }),
        participant({ id: 'b', wom_id: 2, start_value: 0 }),
      ],
    };
    const { participantUpdates } = planRaceUpdates(race, snaps([[1, 25000], [2, 10000]]), NOW);
    expect(participantUpdates).toContainEqual({ id: 'a', changes: { current_value: 25000, is_winner: true } });
    expect(participantUpdates).toContainEqual({ id: 'b', changes: { current_value: 10000 } });
  });

  it('gives the win to whoever is furthest past their target when several finish at once', () => {
    const race = {
      id: 'r1',
      participants: [
        participant({ id: 'a', wom_id: 1, target_value: 20000 }),
        participant({ id: 'b', wom_id: 2, target_value: 10000 }),
      ],
    };
    const { participantUpdates } = planRaceUpdates(race, snaps([[1, 22000], [2, 15000]]), NOW);
    const winners = participantUpdates.filter((u) => u.changes.is_winner);
    expect(winners.map((u) => u.id)).toEqual(['b']);
  });

  it('never names a second winner', () => {
    const race = {
      id: 'r1',
      participants: [
        participant({ id: 'a', wom_id: 1, is_winner: true, current_value: 20000 }),
        participant({ id: 'b', wom_id: 2 }),
      ],
    };
    const { participantUpdates } = planRaceUpdates(race, snaps([[1, 20000], [2, 30000]]), NOW);
    expect(participantUpdates.some((u) => u.changes.is_winner)).toBe(false);
  });

  it('completes a race whose end date has passed', () => {
    const race = { id: 'r1', end_date: '2026-11-01T00:00:00Z', participants: [] };
    expect(planRaceUpdates(race, new Map(), NOW).completeRace).toBe(true);
    expect(planRaceUpdates({ ...race, end_date: null }, new Map(), NOW).completeRace).toBe(false);
  });
});
