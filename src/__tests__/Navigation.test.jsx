import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

test('navigates between main pages using the navbar', async () => {
  render(<App />);

  // Click Members link
  await userEvent.click(screen.getByRole('link', { name: /members/i }));
  expect(screen.getByText(/members/i)).toBeInTheDocument();

  // Click Events link
  await userEvent.click(screen.getByRole('link', { name: /events/i }));
  expect(screen.getByText(/event/i)).toBeInTheDocument();

  // Click Leaderboard link
  await userEvent.click(screen.getByRole('link', { name: /leaderboard/i }));
  expect(screen.getByText(/leaderboard/i)).toBeInTheDocument();

  // Add more navigation checks as needed
}); 
