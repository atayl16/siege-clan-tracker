import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MembersPage from '../pages/MembersPage';
import { vi } from 'vitest';

vi.mock('../hooks/useMembers', () => ({
  useMembers: () => ({
    members: [{ id: 1, name: 'Test Member' }],
    loading: false,
    error: null,
    refreshMembers: vi.fn(),
  }),
}));

test('renders MembersPage without crashing', () => {
  render(
    <MemoryRouter>
      <MembersPage />
    </MemoryRouter>
  );
  // Use getAllByText since there are multiple elements with 'members'
  expect(screen.getAllByText(/members/i).length).toBeGreaterThan(0);
});

test('renders MembersPage and displays a member', () => {
  render(
    <MemoryRouter>
      <MembersPage />
    </MemoryRouter>
  );
  expect(screen.getByText('Test Member')).toBeInTheDocument();
}); 
