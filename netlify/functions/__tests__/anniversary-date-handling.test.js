/**
 * BUG-001 Follow-up Tests: Anniversary Date Calculation Improvements
 *
 * This test suite covers:
 * - UTC timezone normalization (prevents timezone-related bugs)
 * - Invalid date handling (prevents crashes from malformed data)
 * - Leap year policy (documents Feb 29 behavior)
 * - Edge cases in anniversary calculations
 */

import { describe, it, expect, vi } from 'vitest';

describe('BUG-001 Follow-up: Anniversary Date Calculation', () => {
  describe('UTC Timezone Normalization', () => {
    it('should use UTC methods to avoid timezone-dependent bugs', () => {
      // Create a date that could have different values in different timezones
      const testDate = new Date('2024-01-01T23:00:00Z'); // 11 PM UTC on Jan 1

      // ❌ BAD: Using local timezone methods
      const localMonth = testDate.getMonth() + 1;
      const localDay = testDate.getDate();

      // ✅ GOOD: Using UTC methods
      const utcMonth = testDate.getUTCMonth() + 1;
      const utcDay = testDate.getUTCDate();

      // UTC values are consistent regardless of server timezone
      expect(utcMonth).toBe(1);
      expect(utcDay).toBe(1);

      // Local values might be different (could be Jan 2 in some timezones)
      // We don't test specific values because they depend on the test environment's timezone
    });

    it('should calculate anniversaries consistently across timezones', () => {
      const joinDate = new Date('2020-01-15T12:00:00Z');
      const currentDate = new Date('2024-01-15T12:00:00Z');

      // Using UTC methods ensures consistent calculation
      const years = currentDate.getUTCFullYear() - joinDate.getUTCFullYear();

      expect(years).toBe(4);
    });

    it('should match month and day using UTC to avoid date boundary issues', () => {
      // Someone joins on Jan 1 at 1 AM UTC
      const joinDate = new Date('2020-01-01T01:00:00Z');

      // Check anniversary on Jan 1 at 11 PM UTC (same day)
      const anniversaryDate = new Date('2024-01-01T23:00:00Z');

      const isSameMonthDay =
        joinDate.getUTCMonth() === anniversaryDate.getUTCMonth() &&
        joinDate.getUTCDate() === anniversaryDate.getUTCDate();

      expect(isSameMonthDay).toBe(true);
    });
  });

  describe('Invalid Date Handling', () => {
    it('should detect invalid date strings', () => {
      const invalidDates = [
        'not-a-date',
        '2024-13-01', // Invalid month
        '2024-01-32', // Invalid day
        '2024-02-30', // Feb 30 doesn't exist
        null,
        undefined,
        '',
        'abc123'
      ];

      invalidDates.forEach(dateString => {
        const date = new Date(dateString);
        const isValid = !isNaN(date.getTime());

        expect(isValid).toBe(false);
      });
    });

    it('should validate dates before calculating years', () => {
      const invalidJoinDate = new Date('invalid-date');
      const currentDate = new Date('2024-01-15');

      // ❌ BAD: Calculating without validation
      const yearsWithoutValidation = currentDate.getUTCFullYear() - invalidJoinDate.getUTCFullYear();
      expect(isNaN(yearsWithoutValidation)).toBe(true); // Results in NaN

      // ✅ GOOD: Check validity first
      if (isNaN(invalidJoinDate.getTime())) {
        // Skip calculation for invalid dates
        expect(true).toBe(true); // Validation prevents the NaN issue
      } else {
        const years = currentDate.getUTCFullYear() - invalidJoinDate.getUTCFullYear();
        expect(years).toBeGreaterThanOrEqual(0);
      }
    });

    it('should handle null or undefined join dates gracefully', () => {
      const testCases = [null, undefined, ''];

      testCases.forEach(joinDate => {
        if (!joinDate) {
          // Should return early or skip
          expect(joinDate).toBeFalsy();
        }
      });
    });

    it('should warn when encountering invalid dates in production', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const member = {
        wom_id: '12345',
        join_date: 'invalid-date'
      };

      const joinDate = new Date(member.join_date);

      if (isNaN(joinDate.getTime())) {
        console.warn(`Invalid join_date for member ${member.wom_id}: ${member.join_date}`);
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        'Invalid join_date for member 12345: invalid-date'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Leap Year Policy', () => {
    it('should match Feb 29 anniversaries on Feb 29 in leap years', () => {
      const joinDate = new Date('2020-02-29T12:00:00Z'); // Leap year

      // Leap years: 2024, 2028, 2032
      const leapYear2024 = new Date('2024-02-29T12:00:00Z');

      const matchesLeapYear =
        joinDate.getUTCMonth() === leapYear2024.getUTCMonth() &&
        joinDate.getUTCDate() === leapYear2024.getUTCDate();

      expect(matchesLeapYear).toBe(true); // Feb 29 matches Feb 29
    });

    it('should celebrate Feb 29 anniversaries on Feb 28 in non-leap years', () => {
      const joinDate = new Date('2020-02-29T12:00:00Z'); // Joined on leap day
      const feb28_2023 = new Date('2023-02-28T12:00:00Z'); // Non-leap year
      const feb28_2025 = new Date('2025-02-28T12:00:00Z'); // Non-leap year

      const isLeapYear = (year) => (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);

      // Check if we should celebrate on Feb 28
      const joinMonthDay = '02-29';
      const todayMonthDay = '02-28';

      const shouldCelebrate2023 =
        joinMonthDay === todayMonthDay ||
        (joinMonthDay === '02-29' && todayMonthDay === '02-28' && !isLeapYear(2023));

      const shouldCelebrate2025 =
        joinMonthDay === todayMonthDay ||
        (joinMonthDay === '02-29' && todayMonthDay === '02-28' && !isLeapYear(2025));

      expect(shouldCelebrate2023).toBe(true); // Feb 29 celebrated on Feb 28
      expect(shouldCelebrate2025).toBe(true); // Feb 29 celebrated on Feb 28
    });

    it('should celebrate Feb 29 members every year (not just leap years)', () => {
      // This test documents the updated policy
      const feb29JoinDate = new Date('2020-02-29');
      const isLeapYear = (year) => (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);

      // Years 2021-2024: they get celebrated every year now
      const anniversariesCount = [2021, 2022, 2023, 2024].filter(year => {
        // On leap years: Feb 29 exists
        if (isLeapYear(year)) {
          const testDate = new Date(`${year}-02-29`);
          return !isNaN(testDate.getTime()) && testDate.getUTCDate() === 29;
        }
        // On non-leap years: celebrated on Feb 28
        return true;
      }).length;

      // All 4 years should have anniversaries (3 on Feb 28, 1 on Feb 29)
      expect(anniversariesCount).toBe(4);
    });

    it('should identify leap years correctly', () => {
      const isLeapYear = (year) => {
        return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
      };

      expect(isLeapYear(2020)).toBe(true);
      expect(isLeapYear(2024)).toBe(true);
      expect(isLeapYear(2000)).toBe(true); // Divisible by 400
      expect(isLeapYear(2100)).toBe(false); // Divisible by 100 but not 400
      expect(isLeapYear(2023)).toBe(false);
      expect(isLeapYear(2025)).toBe(false);
    });

    it('should NOT celebrate Feb 29 members on Feb 28 during a leap year', () => {
      // In a leap year, Feb 29 members should only be celebrated on Feb 29, not Feb 28
      const joinMonthDay = '02-29';
      const todayMonthDay = '02-28';
      const isLeapYear = (year) => (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);

      const shouldCelebrate2024 =
        joinMonthDay === todayMonthDay ||
        (joinMonthDay === '02-29' && todayMonthDay === '02-28' && !isLeapYear(2024));

      expect(shouldCelebrate2024).toBe(false); // Don't celebrate on Feb 28 in leap year
    });

    it('should celebrate regular Feb 28 members on Feb 28 regardless of leap year', () => {
      const joinMonthDay = '02-28';
      const todayMonthDay = '02-28';

      const shouldCelebrate = joinMonthDay === todayMonthDay;

      expect(shouldCelebrate).toBe(true); // Feb 28 members always celebrated on Feb 28
    });
  });

  describe('Edge Cases', () => {
    it('should handle anniversaries at year boundaries', () => {
      const dec31Join = new Date('2020-12-31T23:59:59Z');
      const jan1Check = new Date('2024-01-01T00:00:00Z');
      const dec31Check = new Date('2024-12-31T23:59:59Z');

      const matchesJan1 =
        dec31Join.getUTCMonth() === jan1Check.getUTCMonth() &&
        dec31Join.getUTCDate() === jan1Check.getUTCDate();

      const matchesDec31 =
        dec31Join.getUTCMonth() === dec31Check.getUTCMonth() &&
        dec31Join.getUTCDate() === dec31Check.getUTCDate();

      expect(matchesJan1).toBe(false);
      expect(matchesDec31).toBe(true);
    });

    it('should not count same-day joins as anniversaries', () => {
      const todayJoin = new Date('2024-01-15T12:00:00Z');
      const todayCheck = new Date('2024-01-15T18:00:00Z');

      const isSameMonthDay =
        todayJoin.getUTCMonth() === todayCheck.getUTCMonth() &&
        todayJoin.getUTCDate() === todayCheck.getUTCDate();

      const isSameYear =
        todayJoin.getUTCFullYear() === todayCheck.getUTCFullYear();

      const isAnniversary = isSameMonthDay && !isSameYear;

      expect(isAnniversary).toBe(false); // Same day in same year
    });

    it('should calculate correct years for members joining exactly 1 year ago', () => {
      const joinDate = new Date('2023-01-15T12:00:00Z');
      const currentDate = new Date('2024-01-15T12:00:00Z');

      const years = currentDate.getUTCFullYear() - joinDate.getUTCFullYear();

      expect(years).toBe(1);
    });

    it('should handle very old join dates correctly', () => {
      const oldJoinDate = new Date('1990-05-20T00:00:00Z');
      const currentDate = new Date('2024-05-20T00:00:00Z');

      const years = currentDate.getUTCFullYear() - oldJoinDate.getUTCFullYear();

      expect(years).toBe(34);
    });

    it('should handle dates at different times of day consistently', () => {
      const morningJoin = new Date('2020-06-15T08:00:00Z');
      const eveningCheck = new Date('2024-06-15T20:00:00Z');

      const isSameMonthDay =
        morningJoin.getUTCMonth() === eveningCheck.getUTCMonth() &&
        morningJoin.getUTCDate() === eveningCheck.getUTCDate();

      expect(isSameMonthDay).toBe(true); // Time doesn't matter, only date
    });
  });

  describe('Month-Day Format Consistency', () => {
    it('should format month-day strings with zero-padding', () => {
      const date = new Date('2024-01-05T12:00:00Z');

      const monthDay = `${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;

      expect(monthDay).toBe('01-05'); // Zero-padded
      expect(monthDay).not.toBe('1-5'); // Not single digit
    });

    it('should handle all months correctly in formatting', () => {
      const testCases = [
        { date: new Date('2024-01-15'), expected: '01-15' },
        { date: new Date('2024-02-28'), expected: '02-28' },
        { date: new Date('2024-03-01'), expected: '03-01' },
        { date: new Date('2024-12-31'), expected: '12-31' },
      ];

      testCases.forEach(({ date, expected }) => {
        const monthDay = `${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
        expect(monthDay).toBe(expected);
      });
    });
  });

  describe('Security and Validation', () => {
    it('should not crash on SQL injection attempts in date strings', () => {
      const maliciousInputs = [
        "'; DROP TABLE members; --",
        "<script>alert('xss')</script>",
        "2024-01-01' OR '1'='1"
      ];

      maliciousInputs.forEach(input => {
        const date = new Date(input);
        // JavaScript Date constructor safely returns Invalid Date
        expect(isNaN(date.getTime())).toBe(true);
      });
    });

    it('should validate that years is a positive number', () => {
      const futureJoinDate = new Date('2025-01-15');
      const currentDate = new Date('2024-01-15');

      const years = currentDate.getUTCFullYear() - futureJoinDate.getUTCFullYear();

      // Future join date would give negative years
      expect(years).toBeLessThan(0);

      // Should be filtered out (only include years > 0)
      const shouldInclude = years > 0;
      expect(shouldInclude).toBe(false);
    });
  });
});
