import { vi } from 'vitest';

// A chainable stand-in for the supabase-js query builder, recording writes.
const state = { goals: [], updates: [], selectError: null };

vi.mock('../../supabaseClient', () => {
  const from = vi.fn(() => {
    const filters = [];
    const builder = {
      select: () => builder,
      eq: (col, val) => {
        filters.push([col, val]);
        return builder;
      },
      update: (values) => ({
        eq: (col, id) => {
          state.updates.push({ id, ...values });
          return Promise.resolve({ error: null });
        },
      }),
      then: (resolve) =>
        resolve({
          data: state.selectError
            ? null
            : state.goals.filter((g) => filters.every(([c, v]) => g[c] === v)),
          error: state.selectError,
        }),
    };
    return builder;
  });
  return { supabase: { from } };
});

import { updatePlayerGoals } from '../goalProgressService';

const player = {
  latestSnapshot: {
    data: {
      skills: { attack: { experience: 5_000_000 } },
      bosses: { zulrah: { kills: 120 } },
    },
  },
};

const goal = (over) => ({
  id: 'g1',
  user_id: 'u1',
  wom_id: 42,
  completed: false,
  goal_type: 'skill',
  metric: 'attack',
  target_value: 13_034_431,
  current_value: 4_000_000,
  completed_date: null,
  ...over,
});

beforeEach(() => {
  state.goals = [];
  state.updates = [];
  state.selectError = null;
  global.fetch = vi.fn();
});

describe('updatePlayerGoals', () => {
  it('writes the current skill experience and boss kills', async () => {
    state.goals = [goal(), goal({ id: 'g2', goal_type: 'boss', metric: 'zulrah', target_value: 100 })];
    global.fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(player) });

    const result = await updatePlayerGoals(42, 'u1');

    expect(global.fetch).toHaveBeenCalledTimes(1); // once per character, not per goal
    expect(global.fetch).toHaveBeenCalledWith('/api/wom-player?id=42');
    expect(state.updates).toEqual([
      expect.objectContaining({ id: 'g1', current_value: 5_000_000, completed: false }),
      expect.objectContaining({ id: 'g2', current_value: 120, completed: true }),
    ]);
    expect(result).toEqual({ updated: 2, completed: 1 });
  });

  it('writes nothing when the stats cannot be loaded', async () => {
    // The regression: a failed lookup became zero and was saved over real
    // progress on every profile load.
    state.goals = [goal()];
    global.fetch.mockResolvedValue({ ok: false, status: 502, json: () => Promise.resolve({}) });

    await expect(updatePlayerGoals(42, 'u1')).rejects.toThrow('502');
    expect(state.updates).toEqual([]);
  });

  it('leaves a goal alone when the player has no data for its metric', async () => {
    state.goals = [goal({ metric: 'sailing' })];
    global.fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(player) });

    const result = await updatePlayerGoals(42, 'u1');

    expect(state.updates).toEqual([]);
    expect(result).toEqual({ updated: 0, completed: 0 });
  });

  it('only touches the requested character and skips the fetch when it has no goals', async () => {
    state.goals = [goal({ wom_id: 7 })];

    const result = await updatePlayerGoals(42, 'u1');

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result).toEqual({ updated: 0, completed: 0 });
  });
});
