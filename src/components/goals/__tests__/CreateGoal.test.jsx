import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import CreateGoal, { currentValueOf } from '../CreateGoal';

const stats = {
  latestSnapshot: {
    data: {
      skills: { runecrafting: { experience: 13034431 }, sailing: { experience: -1 } },
      bosses: { zulrah: { kills: 250 }, vorkath: { kills: -1 } },
    },
  },
};

vi.mock('../../../hooks/usePlayer', () => ({
  usePlayer: () => ({ player: stats, loading: false }),
}));
vi.mock('../../../hooks/useUserGoals', () => ({
  useUserGoals: () => ({ createGoal: vi.fn(), loading: false }),
}));
// A plain select stands in for the WOM-backed picker.
vi.mock('../../MetricSelector', () => ({
  default: ({ selectedMetric, onMetricChange }) => (
    <select aria-label="metric" value={selectedMetric} onChange={(e) => onMetricChange(e.target.value)}>
      <option value="">pick</option>
      <option value="runecrafting">runecrafting</option>
    </select>
  ),
}));

describe('currentValueOf', () => {
  it('reads XP for a skill and kills for a boss', () => {
    expect(currentValueOf(stats, 'skill', 'runecrafting')).toBe(13034431);
    expect(currentValueOf(stats, 'boss', 'zulrah')).toBe(250);
  });

  it("treats WOM's -1 (unranked) as 0", () => {
    expect(currentValueOf(stats, 'skill', 'sailing')).toBe(0);
    expect(currentValueOf(stats, 'boss', 'vorkath')).toBe(0);
  });

  it('is undefined when WOM has no entry', () => {
    expect(currentValueOf(stats, 'boss', 'nex')).toBeUndefined();
    expect(currentValueOf(undefined, 'skill', 'runecrafting')).toBeUndefined();
  });
});

test("shows the selected skill's real XP, not 0", async () => {
  // Regression: the box read stats.experience, which does not exist, so it
  // showed 0 for every skill.
  render(<CreateGoal player={{ wom_id: 1, name: 'roinrin' }} userId="u1" onGoalCreated={vi.fn()} onCancel={vi.fn()} />);

  await userEvent.selectOptions(screen.getByLabelText('metric'), 'runecrafting');

  expect(screen.getByText((13034431).toLocaleString())).toBeInTheDocument();
});
