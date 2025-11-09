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
  expect(screen.getByText(/profile/i)).toBeInTheDocument();
}); 
