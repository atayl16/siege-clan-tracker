import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AuthProvider } from '../context/AuthContext';
import Navbar from '../components/Navbar';

test('renders Navbar without crashing', () => {
  render(
    <MemoryRouter>
      <AuthProvider>
        <Navbar />
      </AuthProvider>
    </MemoryRouter>
  );
  expect(screen.getByRole('navigation')).toBeInTheDocument();
});

test('has five main pages: the others are tabs on them now', () => {
  render(
    <MemoryRouter>
      <AuthProvider>
        <Navbar />
      </AuthProvider>
    </MemoryRouter>
  );
  for (const name of ['Home', 'Members', 'Events', 'Leaderboard', 'Achievements']) {
    expect(screen.getByRole('link', { name })).toBeInTheDocument();
  }
  for (const name of ['Hall of Fame', 'Stats', 'Races & Goals']) {
    expect(screen.queryByRole('link', { name })).not.toBeInTheDocument();
  }
});
