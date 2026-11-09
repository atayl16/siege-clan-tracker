import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getSeasonalIcon } from '../seasonalIcons';

describe('seasonalIcons', () => {
  describe('getSeasonalIcon', () => {
    beforeEach(() => {
      // Use vitest's built-in date mocking
      vi.useFakeTimers();
    });

    afterEach(() => {
      // Restore real timers
      vi.useRealTimers();
    });

    const mockDate = (month) => {
      // Use vitest's setSystemTime for robust date mocking
      const year = 2024;
      const day = 15;
      vi.setSystemTime(new Date(year, month, day));
    };

    describe('October (Halloween season)', () => {
      it('returns pumpkin icon for October (month index 9)', () => {
        mockDate(9);
        expect(getSeasonalIcon()).toBe('/icons/siege_pumpkin.png');
      });
    });

    describe('December (Holiday season)', () => {
      it('returns Santa hat icon for December (month index 11)', () => {
        mockDate(11);
        expect(getSeasonalIcon()).toBe('/icons/siege_hat_1.png');
      });
    });

    describe('Default icon (non-seasonal months)', () => {
      it('returns the default logo for January (month index 0)', () => {
        mockDate(0);
        expect(getSeasonalIcon()).toBe('/icons/original_logo.png');
      });

      it('returns the default logo for February (month index 1)', () => {
        mockDate(1);
        expect(getSeasonalIcon()).toBe('/icons/original_logo.png');
      });

      it('returns the default logo for March (month index 2)', () => {
        mockDate(2);
        expect(getSeasonalIcon()).toBe('/icons/original_logo.png');
      });

      it('returns the default logo for April (month index 3)', () => {
        mockDate(3);
        expect(getSeasonalIcon()).toBe('/icons/original_logo.png');
      });

      it('returns the default logo for May (month index 4)', () => {
        mockDate(4);
        expect(getSeasonalIcon()).toBe('/icons/original_logo.png');
      });

      it('returns the default logo for June (month index 5)', () => {
        mockDate(5);
        expect(getSeasonalIcon()).toBe('/icons/original_logo.png');
      });

      it('returns the default logo for July (month index 6)', () => {
        mockDate(6);
        expect(getSeasonalIcon()).toBe('/icons/original_logo.png');
      });

      it('returns the default logo for August (month index 7)', () => {
        mockDate(7);
        expect(getSeasonalIcon()).toBe('/icons/original_logo.png');
      });

      it('returns the default logo for September (month index 8)', () => {
        mockDate(8);
        expect(getSeasonalIcon()).toBe('/icons/original_logo.png');
      });

      it('returns the default logo for November (month index 10)', () => {
        mockDate(10);
        expect(getSeasonalIcon()).toBe('/icons/original_logo.png');
      });
    });

    describe('all months coverage', () => {
      it('returns appropriate icon for all 12 months', () => {
        const expectedIcons = {
          0: '/icons/original_logo.png',    // January
          1: '/icons/original_logo.png',    // February
          2: '/icons/original_logo.png',    // March
          3: '/icons/original_logo.png',    // April
          4: '/icons/original_logo.png',    // May
          5: '/icons/original_logo.png',    // June
          6: '/icons/original_logo.png',    // July
          7: '/icons/original_logo.png',    // August
          8: '/icons/original_logo.png',    // September
          9: '/icons/siege_pumpkin.png', // October
          10: '/icons/original_logo.png',   // November
          11: '/icons/siege_hat_1.png'  // December
        };

        for (let month = 0; month < 12; month++) {
          mockDate(month);
          const result = getSeasonalIcon();
          expect(result).toBe(expectedIcons[month]);
        }
      });
    });

    describe('icon path format', () => {
      it('returns paths starting with /icons/', () => {
        for (let month = 0; month < 12; month++) {
          mockDate(month);
          const result = getSeasonalIcon();
          expect(result).toMatch(/^\/icons\//);
        }
      });

      it('returns paths ending with .png or .ico', () => {
        for (let month = 0; month < 12; month++) {
          mockDate(month);
          const result = getSeasonalIcon();
          expect(result).toMatch(/\.(png|ico)$/);
        }
      });
    });

    describe('seasonal icon consistency', () => {
      it('returns same icon when called multiple times in same month', () => {
        mockDate(9); // October
        const firstCall = getSeasonalIcon();
        const secondCall = getSeasonalIcon();
        const thirdCall = getSeasonalIcon();

        expect(firstCall).toBe(secondCall);
        expect(secondCall).toBe(thirdCall);
      });
    });

    describe('boundary testing', () => {
      it('handles first month of year (January)', () => {
        mockDate(0);
        expect(getSeasonalIcon()).toBe('/icons/original_logo.png');
      });

      it('handles last month of year (December)', () => {
        mockDate(11);
        expect(getSeasonalIcon()).toBe('/icons/siege_hat_1.png');
      });

      it('handles month before Halloween (September)', () => {
        mockDate(8);
        expect(getSeasonalIcon()).toBe('/icons/original_logo.png');
      });

      it('handles month after Halloween (November)', () => {
        mockDate(10);
        expect(getSeasonalIcon()).toBe('/icons/original_logo.png');
      });
    });

    describe('real-world usage', () => {
      it('returns pumpkin icon during Halloween season', () => {
        mockDate(9); // October
        const icon = getSeasonalIcon();
        expect(icon).toContain('pumpkin');
      });

      it('returns holiday icon during Christmas season', () => {
        mockDate(11); // December
        const icon = getSeasonalIcon();
        expect(icon).toContain('hat');
      });

      it('returns default favicon outside seasonal periods', () => {
        mockDate(5); // June (summer)
        const icon = getSeasonalIcon();
        expect(icon).toBe('/icons/original_logo.png');
      });
    });
  });
});
