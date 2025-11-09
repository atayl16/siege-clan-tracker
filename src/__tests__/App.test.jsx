import { render, screen } from '@testing-library/react';
import App from '../App';

test('renders App without crashing', () => {
  render(<App />);
  // Use getAllByText since there are multiple elements with 'siege'
  expect(screen.getAllByText(/siege/i).length).toBeGreaterThan(0);
});
