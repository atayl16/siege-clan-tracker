import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import ProfilePage from '../pages/ProfilePage';

test('renders ProfilePage without crashing', () => {
  render(
    <MemoryRouter>
      <AuthProvider>
        <ProfilePage />
      </AuthProvider>
    </MemoryRouter>
  );
  // Use getAllByText since there may be multiple elements with 'profile'
  expect(screen.getAllByText(/profile/i).length).toBeGreaterThan(0);
}); 
