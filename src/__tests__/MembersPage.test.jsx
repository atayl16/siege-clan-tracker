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
  // Adjust the text below to something you expect on the page
  expect(screen.getByText(/members/i)).toBeInTheDocument();
});

test('renders MembersPage and displays a member', () => {
  render(
    <MemoryRouter>
      <MembersPage />
    </MemoryRouter>
  );
  expect(screen.getByText('Test Member')).toBeInTheDocument();
}); 
