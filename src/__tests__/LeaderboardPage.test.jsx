import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import LeaderboardPage from '../pages/LeaderboardPage';
import { xpWeekContaining } from '../utils/xpWeek';
import { formatWeekdayTime } from '../utils/dates';

test('renders LeaderboardPage without crashing', () => {
  render(
    <MemoryRouter>
      <LeaderboardPage />
    </MemoryRouter>
  );
  // Use getAllByText since there are multiple elements with 'leaderboard'
  expect(screen.getAllByText(/leaderboard/i).length).toBeGreaterThan(0);
});

test("gives the weekly XP window on the visitor's clock", () => {
  render(
    <MemoryRouter initialEntries={['/leaderboard?tab=how']}>
      <LeaderboardPage />
    </MemoryRouter>
  );
  const week = xpWeekContaining();
  const line = screen.getByText(/^Most Overall XP, /);
  expect(line).toHaveTextContent(
    `Most Overall XP, ${formatWeekdayTime(week.start)} to ${formatWeekdayTime(week.end)}`
  );
  expect(line).not.toHaveTextContent('UK');
});
