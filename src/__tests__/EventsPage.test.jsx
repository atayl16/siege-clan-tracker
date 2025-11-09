import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EventsPage from '../pages/EventsPage';

test('renders EventsPage without crashing', () => {
  render(
    <MemoryRouter>
      <EventsPage />
    </MemoryRouter>
  );
  // Use getAllByText since there are multiple elements with 'event'
  expect(screen.getAllByText(/event/i).length).toBeGreaterThan(0);
}); 
