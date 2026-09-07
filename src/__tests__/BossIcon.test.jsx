import { render, screen, fireEvent } from '@testing-library/react';
import { BossIcon } from '../components/OsrsIcons';

/**
 * BossIcon used to `return null` for any metric it did not have a bundled asset
 * for, so a boss added to the game rendered as a silently blank cell in the
 * Hall of Fame - no error, no console warning. These cover the three-step
 * fallback that replaced it.
 */

const ORIGINAL_URL = process.env.SUPABASE_URL;

beforeEach(() => {
  process.env.SUPABASE_URL = 'https://test-project.supabase.co';
});

afterEach(() => {
  process.env.SUPABASE_URL = ORIGINAL_URL;
});

describe('BossIcon', () => {
  it('uses the bundled asset for a registered boss', () => {
    render(<BossIcon boss="zulrah" />);
    const img = screen.getByAltText('zulrah icon');
    // Vite resolves the png import to a path; the point is that it is a local
    // asset rather than the Storage URL.
    expect(img.getAttribute('src')).not.toContain('/storage/v1/object/public/');
  });

  it('falls back to Supabase Storage for a boss added since the last deploy', () => {
    render(<BossIcon boss="some_new_boss" />);
    const img = screen.getByAltText('some_new_boss icon');
    expect(img.getAttribute('src')).toBe(
      'https://test-project.supabase.co/storage/v1/object/public/boss-icons/some_new_boss.png'
    );
  });

  it('falls back to the generic icon when the Storage object is missing', () => {
    render(<BossIcon boss="some_new_boss" />);
    const img = screen.getByAltText('some_new_boss icon');

    // Simulate the 404 the browser would report for an un-uploaded icon.
    fireEvent.error(img);

    const after = screen.getByAltText('some_new_boss icon');
    expect(after.getAttribute('src')).not.toContain('/storage/v1/object/public/');
    // Never blank: the whole point of the change.
    expect(after).toBeInTheDocument();
  });

  it('renders the generic icon rather than nothing when SUPABASE_URL is unset', () => {
    delete process.env.SUPABASE_URL;
    render(<BossIcon boss="some_new_boss" />);
    expect(screen.getByAltText('some_new_boss icon')).toBeInTheDocument();
  });
});
