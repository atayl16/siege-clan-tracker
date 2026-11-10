import { describe, it, expect } from 'vitest';
import { filterGoals, filterRaces, goalProgress, sortGoals } from '../boardFilters';

const g = (id, overrides = {}) => ({
  id, goal_type: 'skill', metric: 'sailing', player_name: 'Roinrin',
  start_value: 0, current_value: 0, target_value: 100, completed: false, ...overrides,
});

describe('filterGoals', () => {
  const goals = [
    g('a', { player_name: 'Dan_xo', metric: 'sailing' }),
    g('b', { goal_type: 'boss', metric: 'chambers_of_xeric' }),
    g('c', { completed: true, metric: 'runecrafting' }),
  ];
  const ids = (list) => list.map((goal) => goal.id);

  it('searches the character and the skill or boss, underscores as spaces', () => {
    expect(ids(filterGoals(goals, { query: 'dan xo' }))).toEqual(['a']);
    expect(ids(filterGoals(goals, { query: 'Chambers of' }))).toEqual(['b']);
    expect(ids(filterGoals(goals, { query: 'roinrin' }))).toEqual(['b', 'c']);
    expect(ids(filterGoals(goals, { query: '  ' }))).toEqual(['a', 'b', 'c']);
  });

  it('filters by type and by status', () => {
    expect(ids(filterGoals(goals, { type: 'boss' }))).toEqual(['b']);
    expect(ids(filterGoals(goals, { status: 'completed' }))).toEqual(['c']);
    expect(ids(filterGoals(goals, { status: 'active', type: 'skill' }))).toEqual(['a']);
  });
});

describe('sortGoals', () => {
  const goals = [
    g('done-old', { completed: true, completed_date: '2026-11-01' }),
    g('ten', { current_value: 10, created_at: '2026-11-05', target_date: '2026-12-01' }),
    g('done-new', { completed: true, completed_date: '2026-11-09' }),
    g('ninety', { current_value: 90, created_at: '2026-11-01' }),
    g('fifty', { current_value: 50, created_at: '2026-11-08', target_date: '2026-11-20' }),
  ];
  const ids = (list) => list.map((goal) => goal.id);

  it('puts active goals first, closest to done, then the most recently completed', () => {
    expect(ids(sortGoals(goals, 'progress'))).toEqual(['ninety', 'fifty', 'ten', 'done-new', 'done-old']);
  });

  it('sorts active goals by newest, keeping completed ones last', () => {
    expect(ids(sortGoals(goals, 'newest')).slice(0, 3)).toEqual(['fifty', 'ten', 'ninety']);
  });

  it('sorts by soonest deadline, goals without one after', () => {
    expect(ids(sortGoals(goals, 'deadline')).slice(0, 3)).toEqual(['fifty', 'ten', 'ninety']);
  });

  it('does not change the list it was given', () => {
    const before = ids(goals);
    sortGoals(goals, 'progress');
    expect(ids(goals)).toEqual(before);
  });
});

describe('goalProgress', () => {
  it('is gained over needed, capped at 1, and 1 once completed', () => {
    expect(goalProgress(g('x', { start_value: 100, current_value: 150, target_value: 200 }))).toBe(0.5);
    expect(goalProgress(g('x', { current_value: 500 }))).toBe(1);
    expect(goalProgress(g('x', { completed: true }))).toBe(1);
    expect(goalProgress(g('x', { target_value: 0 }))).toBe(0);
  });
});

describe('filterRaces', () => {
  const races = [
    { id: 'r1', title: 'Sailing sprint', status: 'active', participants: [{ player_name: 'Dan_xo', metric: 'sailing' }] },
    { id: 'r2', title: 'Zulrah week', status: 'completed', description: 'Most kills', participants: [{ player_name: 'Roinrin', metric: 'zulrah' }] },
    { id: 'r3', title: 'Old race', participants: [] },
  ];
  const ids = (list) => list.map((race) => race.id);

  it('searches the title, description, racers and skills', () => {
    expect(ids(filterRaces(races, { query: 'sprint' }))).toEqual(['r1']);
    expect(ids(filterRaces(races, { query: 'most kills' }))).toEqual(['r2']);
    expect(ids(filterRaces(races, { query: 'dan xo' }))).toEqual(['r1']);
    expect(ids(filterRaces(races, { query: 'zulrah' }))).toEqual(['r2']);
  });

  it('treats a race with no status as active, as the race card does', () => {
    expect(ids(filterRaces(races, { status: 'active' }))).toEqual(['r1', 'r3']);
    expect(ids(filterRaces(races, { status: 'finished' }))).toEqual(['r2']);
  });
});
