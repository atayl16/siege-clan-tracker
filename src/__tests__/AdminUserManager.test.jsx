import { render, screen } from '@testing-library/react';
import AdminUserManager from '../components/admin/AdminUserManager';
import { vi } from 'vitest';

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    toggleAdminStatus: vi.fn(),
    linkUserToSupabaseAuth: vi.fn(),
    user: { id: 1, username: 'adminuser', is_admin: true },
    isAdmin: true,
  }),
}));

let getMockDataContext;
let getMockUseUsers;

vi.mock('../context/DataContext', () => ({
  useData: () => getMockDataContext(),
}));

vi.mock('../hooks/useUsers', () => ({
  useUsers: () => getMockUseUsers(),
}));

const defaultMock = {
  users: [{ id: 1, username: 'adminuser', is_admin: true, created_at: new Date().toISOString() }],
  allUsers: [],
  members: [],
  userGoals: [],
  events: [],
  races: [],
  claimRequests: [],
  competitions: [],
  groupAchievements: [],
  groupStats: [],
  loading: false,
  error: undefined,
  usersLoading: false,
  usersError: null,
  refreshMembers: vi.fn(),
  searchResults: [],
  searchLoading: false,
  searchError: undefined,
  selectedUser: null,
  setSelectedUser: vi.fn(),
  filter: '',
  setFilter: vi.fn(),
  filters: [],
  setFilters: vi.fn(),
  sort: '',
  setSort: vi.fn(),
  sortOrder: 'asc',
  setSortOrder: vi.fn(),
  page: 1,
  setPage: vi.fn(),
  pageSize: 10,
  setPageSize: vi.fn(),
  total: 0,
  setTotal: vi.fn(),
};

test('renders AdminUserManager and displays a user', () => {
  getMockUseUsers = () => ({
    users: [{ id: 1, username: 'adminuser', is_admin: true, created_at: new Date().toISOString() }],
    loading: false,
    error: undefined,
    refreshMembers: vi.fn(),
  });
  getMockDataContext = () => ({ ...defaultMock });
  render(<AdminUserManager />);
  expect(screen.getByText('adminuser')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /remove admin/i })).toBeInTheDocument();
});

test('renders error message when usersError is a string', () => {
  getMockUseUsers = () => ({
    users: [{ id: 1, username: 'testuser', is_admin: false, created_at: new Date().toISOString() }],
    loading: false,
    error: undefined,
    refreshMembers: vi.fn(),
  });
  getMockDataContext = () => ({
    ...defaultMock,
    users: [{ id: 1, username: 'testuser', is_admin: false, created_at: new Date().toISOString() }],
    error: 'Failed to load users',
    searchError: undefined,
  });
  render(<AdminUserManager />);

  // Use a more flexible approach to find the error message
  expect(screen.getByText(/Failed to load users/)).toBeInTheDocument();
}); 
