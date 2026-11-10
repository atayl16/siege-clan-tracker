import React from 'react';
import { render, act } from '@testing-library/react';
import { vi } from 'vitest';

// setupTests.js stubs BackgroundLoader for every other test; test the real one.
vi.unmock('../BackgroundLoader');
vi.mock('../../components/OsrsIcons', () => ({ preloadMetricIcons: vi.fn() }));

import BackgroundLoader from '../BackgroundLoader';
import { preloadMetricIcons } from '../../components/OsrsIcons';

describe('BackgroundLoader', () => {
  let fetchSpy;
  let errorSpy;

  beforeEach(() => {
    vi.useFakeTimers();
    // jsdom has no requestIdleCallback, so the loader uses its timer fallback.
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => ({}) });
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    fetchSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('preloads icons without prefetching API data or logging errors', () => {
    // It used to call React Query's prefetchQuery with the v3 signature,
    // which v5 rejects with "queryKey needs to be an Array" on every load.
    // DataProvider already loads that data through SWR.
    render(<BackgroundLoader />);
    // First the "app has loaded" timer, then the loading it starts.
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
    expect(preloadMetricIcons).toHaveBeenCalled();
  });
});
