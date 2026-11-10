import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi } from 'vitest';
import { isBuiltInAdmin } from '../utils/builtInAdmin';

let auth;
vi.mock('../context/AuthContext', () => ({ useAuth: () => auth }));

import Navbar from '../components/Navbar';
import ProfilePage from '../pages/ProfilePage';

const session = (user) => ({
  user,
  userClaims: [],
  fetchUserClaims: vi.fn(),
  isLoggedIn: () => Boolean(user),
  isAdmin: () => Boolean(user?.is_admin),
  logout: vi.fn(),
  loading: false,
});

test('recognises only the built-in admin account', () => {
  expect(isBuiltInAdmin({ username: 'admin' })).toBe(true);
  expect(isBuiltInAdmin({ username: 'Admin' })).toBe(true);
  expect(isBuiltInAdmin({ username: 'roinrin', is_admin: true })).toBe(false);
  expect(isBuiltInAdmin(null)).toBe(false);
});

test('the built-in admin has no Profile link, but keeps Admin', () => {
  auth = session({ id: 'admin', username: 'admin', is_admin: true });
  render(<MemoryRouter><Navbar /></MemoryRouter>);
  expect(screen.queryByRole('link', { name: 'Profile' })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Admin' })).toBeInTheDocument();
});

test('members, admins included, still have a Profile link', () => {
  auth = session({ id: 'u1', username: 'roinrin', is_admin: true });
  render(<MemoryRouter><Navbar /></MemoryRouter>);
  expect(screen.getByRole('link', { name: 'Profile' })).toBeInTheDocument();
});

test('the built-in admin is sent from /profile to /admin', () => {
  auth = session({ id: 'admin', username: 'admin', is_admin: true });
  render(
    <MemoryRouter initialEntries={['/profile']}>
      <Routes>
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/admin" element={<div>admin page</div>} />
      </Routes>
    </MemoryRouter>
  );
  expect(screen.getByText('admin page')).toBeInTheDocument();
  expect(screen.queryByText('Account Management')).not.toBeInTheDocument();
});
