import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import ProgressPage from '../pages/ProgressPage';

test.skip('renders ProgressPage without crashing', () => {
  render(
    <MemoryRouter>
      <AuthProvider>
        <ProgressPage />
      </AuthProvider>
    </MemoryRouter>
  );
  expect(screen.getByText(/progress/i)).toBeInTheDocument();
}); 
