import { render, screen } from '@testing-library/react';
import App from '../App';

test('renders App without crashing', () => {
  render(<App />);
  // There may be multiple elements with 'siege', so check that at least one exists
  expect(screen.getByText(/siege/i)).toBeInTheDocument();
});
