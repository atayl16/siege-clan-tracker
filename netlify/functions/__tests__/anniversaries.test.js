import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Test suite for anniversary date calculation
 *
 * BUG-001: Anniversary Date Calculation Incorrect
 *
 * The bug: Only comparing years without verifying the actual anniversary date.
 * This causes incorrect anniversary notifications to be sent.
 *
 * Example:
 * - Member joined: 2023-12-31
 * - Current date: 2024-01-01
 * - Bug calculates: 2024 - 2023 = 1 year ✗ WRONG
 * - Correct: Not their anniversary yet (wrong month/day) ✓
 */

/**
 * Helper function to calculate if today is a member's anniversary
 * This is the CORRECT implementation that should be used
 */
function calculateAnniversary(joinDate, currentDate = new Date()) {
  const join = new Date(joinDate);
  const today = new Date(currentDate);

  // Get month-day for comparison (MM-DD format) using UTC to avoid timezone issues
  const joinMonthDay = `${String(join.getUTCMonth() + 1).padStart(2, '0')}-${String(join.getUTCDate()).padStart(2, '0')}`;
  const todayMonthDay = `${String(today.getUTCMonth() + 1).padStart(2, '0')}-${String(today.getUTCDate()).padStart(2, '0')}`;

  // Not an anniversary if month/day don't match
  if (joinMonthDay !== todayMonthDay) {
    return null;
  }

  // Calculate years - safe now because we know it's the same month/day
  let years = today.getUTCFullYear() - join.getUTCFullYear();

  // Must be at least 1 year
  if (years < 1) {
    return null;
  }

  return years;
}

describe('Anniversary Date Calculation', () => {
  describe('calculateAnniversary - Correct Implementation', () => {
    it('should return correct years when anniversary date matches', () => {
      const joinDate = '2023-11-06';
      const currentDate = new Date('2024-11-06');
      const years = calculateAnniversary(joinDate, currentDate);
      expect(years).toBe(1);
    });

    it('should return null when anniversary has not occurred yet this year', () => {
      const joinDate = '2023-11-06';
      const currentDate = new Date('2024-11-05'); // Day before
      const years = calculateAnniversary(joinDate, currentDate);
      expect(years).toBeNull();
    });

    it('should return null when anniversary already passed this year', () => {
      const joinDate = '2023-11-06';
      const currentDate = new Date('2024-11-07'); // Day after
      const years = calculateAnniversary(joinDate, currentDate);
      expect(years).toBeNull();
    });

    it('should NOT trigger for Dec 31 join date on Jan 1', () => {
      const joinDate = '2023-12-31';
      const currentDate = new Date('2024-01-01');
      const years = calculateAnniversary(joinDate, currentDate);
      expect(years).toBeNull();
    });

    it('should NOT trigger for Jan 1 join date on Dec 31', () => {
      const joinDate = '2023-01-01';
      const currentDate = new Date('2024-12-31');
      const years = calculateAnniversary(joinDate, currentDate);
      expect(years).toBeNull();
    });

    it('should return correct years for multiple year anniversary', () => {
      const joinDate = '2020-06-15';
      const currentDate = new Date('2024-06-15');
      const years = calculateAnniversary(joinDate, currentDate);
      expect(years).toBe(4);
    });

    it('should handle leap year anniversaries correctly', () => {
      const joinDate = '2020-02-29'; // Leap year
      const currentDate = new Date('2024-02-29'); // Next leap year
      const years = calculateAnniversary(joinDate, currentDate);
      expect(years).toBe(4);
    });

    it('should return null for members who joined less than 1 year ago', () => {
      const joinDate = '2024-06-15';
      const currentDate = new Date('2024-11-06');
      const years = calculateAnniversary(joinDate, currentDate);
      expect(years).toBeNull();
    });

    it('should return null when join date is exactly 1 year ago but wrong day', () => {
      const joinDate = '2023-11-06';
      const currentDate = new Date('2024-11-05'); // One day before 1 year
      const years = calculateAnniversary(joinDate, currentDate);
      expect(years).toBeNull();
    });

    it('should handle first anniversary correctly on exact date', () => {
      const joinDate = '2023-11-06';
      const currentDate = new Date('2024-11-06');
      const years = calculateAnniversary(joinDate, currentDate);
      expect(years).toBe(1);
    });

    it('should handle month boundaries correctly', () => {
      // Join on last day of month
      const joinDate1 = '2023-01-31';
      const currentDate1 = new Date('2024-01-31');
      expect(calculateAnniversary(joinDate1, currentDate1)).toBe(1);

      // Not anniversary on first of next month
      const currentDate2 = new Date('2024-02-01');
      expect(calculateAnniversary(joinDate1, currentDate2)).toBeNull();
    });
  });

  describe('Bug Reproduction - OLD Implementation', () => {
    /**
     * This demonstrates the BUGGY behavior
     * DO NOT use this implementation - it's only for testing the bug
     */
    function buggyAnniversaryCalculation(joinDate, currentDate = new Date()) {
      const join = new Date(joinDate);
      const today = new Date(currentDate);
      const years = today.getFullYear() - join.getFullYear();
      return years > 0 ? years : null;
    }

    it('BUG: incorrectly returns 1 year for Dec 31 join on Jan 1', () => {
      const joinDate = '2023-12-31';
      const currentDate = new Date('2024-01-01');
      const buggyResult = buggyAnniversaryCalculation(joinDate, currentDate);

      // The buggy implementation returns 1 (WRONG)
      expect(buggyResult).toBe(1);

      // The correct implementation returns null (CORRECT)
      const correctResult = calculateAnniversary(joinDate, currentDate);
      expect(correctResult).toBeNull();
    });

    it('BUG: incorrectly returns years even when not anniversary date', () => {
      const joinDate = '2023-11-06';
      const currentDate = new Date('2024-01-01'); // Not the anniversary
      const buggyResult = buggyAnniversaryCalculation(joinDate, currentDate);

      // The buggy implementation returns 1 (WRONG)
      expect(buggyResult).toBe(1);

      // The correct implementation returns null (CORRECT)
      const correctResult = calculateAnniversary(joinDate, currentDate);
      expect(correctResult).toBeNull();
    });

    it('BUG: sends anniversary notification every day of the year after 1 year', () => {
      const joinDate = '2023-06-15';

      // The buggy implementation would return 1 for ANY date in 2024
      expect(buggyAnniversaryCalculation(joinDate, new Date('2024-01-01'))).toBe(1);
      expect(buggyAnniversaryCalculation(joinDate, new Date('2024-03-15'))).toBe(1);
      expect(buggyAnniversaryCalculation(joinDate, new Date('2024-12-31'))).toBe(1);

      // The correct implementation only returns a value on the actual anniversary
      expect(calculateAnniversary(joinDate, new Date('2024-01-01'))).toBeNull();
      expect(calculateAnniversary(joinDate, new Date('2024-03-15'))).toBeNull();
      expect(calculateAnniversary(joinDate, new Date('2024-06-15'))).toBe(1); // Only on actual date
      expect(calculateAnniversary(joinDate, new Date('2024-12-31'))).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid dates gracefully', () => {
      expect(() => calculateAnniversary('invalid-date')).not.toThrow();
    });

    it('should handle future join dates', () => {
      const joinDate = '2025-11-06';
      const currentDate = new Date('2024-11-06');
      const years = calculateAnniversary(joinDate, currentDate);
      expect(years).toBeNull();
    });

    it('should handle same year joins (less than 1 year ago)', () => {
      const joinDate = '2024-01-15';
      const currentDate = new Date('2024-11-06');
      const years = calculateAnniversary(joinDate, currentDate);
      expect(years).toBeNull();
    });

    it('should handle timezone edge cases', () => {
      // Dates should be compared as dates, not affected by timezone
      const joinDate = '2023-11-06T23:59:59Z';
      const currentDate = new Date('2024-11-06T00:00:01Z');
      const years = calculateAnniversary(joinDate, currentDate);
      expect(years).toBe(1);
    });
  });

  describe('Integration Test Scenarios', () => {
    it('should process batch of members correctly', () => {
      const currentDate = new Date('2024-11-06');

      const members = [
        { name: 'Alice', join_date: '2023-11-06' }, // ✓ 1 year today
        { name: 'Bob', join_date: '2023-11-05' },   // ✗ Yesterday
        { name: 'Charlie', join_date: '2023-11-07' }, // ✗ Tomorrow
        { name: 'Dave', join_date: '2024-11-06' },   // ✗ Today but less than 1 year
        { name: 'Eve', join_date: '2020-11-06' },    // ✓ 4 years today
        { name: 'Frank', join_date: '2023-12-31' },  // ✗ Wrong date
      ];

      const anniversaries = members
        .map(member => {
          const years = calculateAnniversary(member.join_date, currentDate);
          return years ? { ...member, years } : null;
        })
        .filter(Boolean);

      expect(anniversaries).toHaveLength(2);
      expect(anniversaries[0].name).toBe('Alice');
      expect(anniversaries[0].years).toBe(1);
      expect(anniversaries[1].name).toBe('Eve');
      expect(anniversaries[1].years).toBe(4);
    });

    it('should handle members joined on same date across multiple years', () => {
      const currentDate = new Date('2024-06-15');

      const members = [
        { name: 'One Year', join_date: '2023-06-15' },
        { name: 'Two Years', join_date: '2022-06-15' },
        { name: 'Three Years', join_date: '2021-06-15' },
        { name: 'Five Years', join_date: '2019-06-15' },
      ];

      const anniversaries = members
        .map(member => {
          const years = calculateAnniversary(member.join_date, currentDate);
          return years ? { ...member, years } : null;
        })
        .filter(Boolean);

      expect(anniversaries).toHaveLength(4);
      expect(anniversaries[0].years).toBe(1);
      expect(anniversaries[1].years).toBe(2);
      expect(anniversaries[2].years).toBe(3);
      expect(anniversaries[3].years).toBe(5);
    });
  });
});

// Export the helper for use in the actual function
export { calculateAnniversary };
