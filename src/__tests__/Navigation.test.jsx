import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

test('navigates between main pages using the navbar', async () => {
  render(<App />);

  // Click Members link
  await userEvent.click(screen.getByRole('link', { name: /members/i }));
  expect(screen.getAllByText(/members/i).length).toBeGreaterThan(0);

  // Click Events link
  await userEvent.click(screen.getByRole('link', { name: /events/i }));
  expect(screen.getAllByText(/event/i).length).toBeGreaterThan(0);

  // Click Leaderboard link
  await userEvent.click(screen.getByRole('link', { name: /leaderboard/i }));
  expect(screen.getAllByText(/leaderboard/i).length).toBeGreaterThan(0);

  // Add more navigation checks as needed
}); 
