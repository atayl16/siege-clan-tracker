/**
 * Tests for Rank Calculation Utilities
 *
 * These tests cover all rank calculation logic including:
 * - Skiller ranks (XP-based): Opal → Zenyte (8 ranks)
 * - Fighter ranks (EHB-based): Mentor → TzKal (9 ranks)
 * - Rank progression calculations
 * - Member rank update detection
 */

import { describe, it, expect } from 'vitest';
import {
  SKILLER_RANKS,
  FIGHTER_RANKS,
  SKILLER_RANK_NAMES,
  FIGHTER_RANK_NAMES,
  safeFormat,
  safeParseInt,
  calculateNextLevel,
  calculateAppropriateRank,
  memberNeedsRankUpdate
} from '../rankUtils';

describe('Rank Constants', () => {
  it('defines 8 skiller ranks', () => {
    expect(SKILLER_RANKS).toHaveLength(8);
    expect(SKILLER_RANK_NAMES).toHaveLength(8);
  });

  it('defines 9 fighter ranks', () => {
    expect(FIGHTER_RANKS).toHaveLength(9);
    expect(FIGHTER_RANK_NAMES).toHaveLength(9);
  });

  it('has correct skiller rank order', () => {
    const expected = ["Opal", "Sapphire", "Emerald", "Ruby", "Diamond", "Dragonstone", "Onyx", "Zenyte"];
    expect(SKILLER_RANK_NAMES).toEqual(expected);
  });

  it('has correct fighter rank order', () => {
    const expected = ["Mentor", "Prefect", "Leader", "Supervisor", "Superior", "Executive", "Senator", "Monarch", "TzKal"];
    expect(FIGHTER_RANK_NAMES).toEqual(expected);
  });
});

describe('safeFormat', () => {
  it('formats numbers with locale separators', () => {
    expect(safeFormat(1000)).toBe('1,000');
    expect(safeFormat(1000000)).toBe('1,000,000');
  });

  it('handles null and undefined', () => {
    expect(safeFormat(null)).toBe('0');
    expect(safeFormat(undefined)).toBe('0');
  });

  it('handles zero', () => {
    expect(safeFormat(0)).toBe('0');
  });

  it('handles decimal numbers', () => {
    expect(safeFormat(1234.56)).toBe('1,234.56');
  });
});

describe('safeParseInt', () => {
  it('parses valid integers', () => {
    expect(safeParseInt('123')).toBe(123);
    expect(safeParseInt('1000000')).toBe(1000000);
  });

  it('handles null and undefined', () => {
    expect(safeParseInt(null)).toBe(0);
    expect(safeParseInt(undefined)).toBe(0);
  });

  it('handles empty string', () => {
    expect(safeParseInt('')).toBe(0);
  });

  it('handles invalid values', () => {
    expect(safeParseInt('abc')).toBe(0);
    expect(safeParseInt('12abc')).toBe(12); // parseInt behavior
  });

  it('handles numbers passed as numbers', () => {
    expect(safeParseInt(123)).toBe(123);
  });
});

describe('calculateAppropriateRank - Skiller Ranks', () => {
  it('returns Opal for 0-3M clan XP', () => {
    const member = {
      womrole: 'Opal',
      current_xp: 5000000,
      first_xp: 3000000, // 2M clan XP
      ehb: 0
    };
    expect(calculateAppropriateRank(member)).toBe('Opal');
  });

  it('returns Sapphire for 3M-8M clan XP', () => {
    const member = {
      womrole: 'Sapphire',
      current_xp: 10000000,
      first_xp: 5000000, // 5M clan XP
      ehb: 0
    };
    expect(calculateAppropriateRank(member)).toBe('Sapphire');
  });

  it('returns Emerald for 8M-15M clan XP', () => {
    const member = {
      womrole: 'Emerald',
      current_xp: 20000000,
      first_xp: 10000000, // 10M clan XP
      ehb: 0
    };
    expect(calculateAppropriateRank(member)).toBe('Emerald');
  });

  it('returns Ruby for 15M-40M clan XP', () => {
    const member = {
      womrole: 'Ruby',
      current_xp: 35000000,
      first_xp: 10000000, // 25M clan XP
      ehb: 0
    };
    expect(calculateAppropriateRank(member)).toBe('Ruby');
  });

  it('returns Diamond for 40M-90M clan XP', () => {
    const member = {
      womrole: 'Diamond',
      current_xp: 100000000,
      first_xp: 50000000, // 50M clan XP
      ehb: 0
    };
    expect(calculateAppropriateRank(member)).toBe('Diamond');
  });

  it('returns Dragonstone for 90M-150M clan XP', () => {
    const member = {
      womrole: 'Dragonstone',
      current_xp: 200000000,
      first_xp: 100000000, // 100M clan XP
      ehb: 0
    };
    expect(calculateAppropriateRank(member)).toBe('Dragonstone');
  });

  it('returns Onyx for 150M-500M clan XP', () => {
    const member = {
      womrole: 'Onyx',
      current_xp: 300000000,
      first_xp: 100000000, // 200M clan XP
      ehb: 0
    };
    expect(calculateAppropriateRank(member)).toBe('Onyx');
  });

  it('returns Zenyte for 500M+ clan XP', () => {
    const member = {
      womrole: 'Zenyte',
      current_xp: 600000000,
      first_xp: 0, // 600M clan XP
      ehb: 0
    };
    expect(calculateAppropriateRank(member)).toBe('Zenyte');
  });

  describe('Boundary Cases - Skiller', () => {
    it('returns Opal at exactly 0 XP', () => {
      const member = { womrole: 'Opal', current_xp: 0, first_xp: 0, ehb: 0 };
      expect(calculateAppropriateRank(member)).toBe('Opal');
    });

    it('returns Sapphire at exactly 3M clan XP', () => {
      const member = { womrole: 'Sapphire', current_xp: 3000000, first_xp: 0, ehb: 0 };
      expect(calculateAppropriateRank(member)).toBe('Sapphire');
    });

    it('returns Emerald at exactly 8M clan XP', () => {
      const member = { womrole: 'Emerald', current_xp: 8000000, first_xp: 0, ehb: 0 };
      expect(calculateAppropriateRank(member)).toBe('Emerald');
    });

    it('returns Ruby at exactly 15M clan XP', () => {
      const member = { womrole: 'Ruby', current_xp: 15000000, first_xp: 0, ehb: 0 };
      expect(calculateAppropriateRank(member)).toBe('Ruby');
    });

    it('returns Zenyte at exactly 500M clan XP', () => {
      const member = { womrole: 'Zenyte', current_xp: 500000000, first_xp: 0, ehb: 0 };
      expect(calculateAppropriateRank(member)).toBe('Zenyte');
    });
  });
});

describe('calculateAppropriateRank - Fighter Ranks', () => {
  it('returns Mentor for 0-100 EHB', () => {
    const member = {
      womrole: 'Mentor',
      current_xp: 0,
      first_xp: 0,
      ehb: 50
    };
    expect(calculateAppropriateRank(member)).toBe('Mentor');
  });

  it('returns Prefect for 100-300 EHB', () => {
    const member = {
      womrole: 'Prefect',
      current_xp: 0,
      first_xp: 0,
      ehb: 200
    };
    expect(calculateAppropriateRank(member)).toBe('Prefect');
  });

  it('returns Leader for 300-500 EHB', () => {
    const member = {
      womrole: 'Leader',
      current_xp: 0,
      first_xp: 0,
      ehb: 400
    };
    expect(calculateAppropriateRank(member)).toBe('Leader');
  });

  it('returns Supervisor for 500-700 EHB', () => {
    const member = {
      womrole: 'Supervisor',
      current_xp: 0,
      first_xp: 0,
      ehb: 600
    };
    expect(calculateAppropriateRank(member)).toBe('Supervisor');
  });

  it('returns Superior for 700-900 EHB', () => {
    const member = {
      womrole: 'Superior',
      current_xp: 0,
      first_xp: 0,
      ehb: 800
    };
    expect(calculateAppropriateRank(member)).toBe('Superior');
  });

  it('returns Executive for 900-1100 EHB', () => {
    const member = {
      womrole: 'Executive',
      current_xp: 0,
      first_xp: 0,
      ehb: 1000
    };
    expect(calculateAppropriateRank(member)).toBe('Executive');
  });

  it('returns Senator for 1100-1300 EHB', () => {
    const member = {
      womrole: 'Senator',
      current_xp: 0,
      first_xp: 0,
      ehb: 1200
    };
    expect(calculateAppropriateRank(member)).toBe('Senator');
  });

  it('returns Monarch for 1300-1500 EHB', () => {
    const member = {
      womrole: 'Monarch',
      current_xp: 0,
      first_xp: 0,
      ehb: 1400
    };
    expect(calculateAppropriateRank(member)).toBe('Monarch');
  });

  it('returns TzKal for 1500+ EHB', () => {
    const member = {
      womrole: 'TzKal',
      current_xp: 0,
      first_xp: 0,
      ehb: 2000
    };
    expect(calculateAppropriateRank(member)).toBe('TzKal');
  });

  describe('Boundary Cases - Fighter', () => {
    it('returns Mentor at exactly 0 EHB', () => {
      const member = { womrole: 'Mentor', current_xp: 0, first_xp: 0, ehb: 0 };
      expect(calculateAppropriateRank(member)).toBe('Mentor');
    });

    it('returns Prefect at exactly 100 EHB', () => {
      const member = { womrole: 'Prefect', current_xp: 0, first_xp: 0, ehb: 100 };
      expect(calculateAppropriateRank(member)).toBe('Prefect');
    });

    it('returns Leader at exactly 300 EHB', () => {
      const member = { womrole: 'Leader', current_xp: 0, first_xp: 0, ehb: 300 };
      expect(calculateAppropriateRank(member)).toBe('Leader');
    });

    it('returns TzKal at exactly 1500 EHB', () => {
      const member = { womrole: 'TzKal', current_xp: 0, first_xp: 0, ehb: 1500 };
      expect(calculateAppropriateRank(member)).toBe('TzKal');
    });
  });
});

describe('calculateAppropriateRank - Edge Cases', () => {
  it('handles null member', () => {
    expect(calculateAppropriateRank(null)).toBe(null);
  });

  it('handles undefined member', () => {
    expect(calculateAppropriateRank(undefined)).toBe(null);
  });

  it('handles null XP values for skiller', () => {
    const member = {
      womrole: 'Opal',
      current_xp: null,
      first_xp: null,
      ehb: 0
    };
    expect(calculateAppropriateRank(member)).toBe('Opal');
  });

  it('handles null EHB for fighter', () => {
    const member = {
      womrole: 'Mentor',
      current_xp: 0,
      first_xp: 0,
      ehb: null
    };
    expect(calculateAppropriateRank(member)).toBe('Mentor');
  });

  it('handles string XP values', () => {
    const member = {
      womrole: 'Ruby',
      current_xp: '20000000',
      first_xp: '5000000',
      ehb: 0
    };
    expect(calculateAppropriateRank(member)).toBe('Ruby');
  });

  it('handles string EHB values', () => {
    const member = {
      womrole: 'Leader',
      current_xp: 0,
      first_xp: 0,
      ehb: '400'
    };
    expect(calculateAppropriateRank(member)).toBe('Leader');
  });

  it('handles missing womrole', () => {
    const member = {
      womrole: null,
      current_xp: 10000000,
      first_xp: 0,
      ehb: 0
    };
    expect(calculateAppropriateRank(member)).toBe(null);
  });

  it('handles unknown womrole', () => {
    const member = {
      womrole: 'Unknown Rank',
      current_xp: 10000000,
      first_xp: 0,
      ehb: 0
    };
    expect(calculateAppropriateRank(member)).toBe(null);
  });
});

describe('calculateNextLevel - Skiller', () => {
  it('calculates XP to next rank for Opal', () => {
    const member = {
      womrole: 'Opal',
      current_xp: 2000000,
      first_xp: 0,
      ehb: 0
    };
    // Opal range is 0-3M, member has 2M, needs 1M more
    expect(calculateNextLevel(member)).toBe(1000000);
  });

  it('calculates XP to next rank for Sapphire', () => {
    const member = {
      womrole: 'Sapphire',
      current_xp: 5000000,
      first_xp: 0,
      ehb: 0
    };
    // Sapphire range is 3M-8M, member has 5M, needs 3M more
    expect(calculateNextLevel(member)).toBe(3000000);
  });

  it('returns 0 for max rank (Zenyte)', () => {
    const member = {
      womrole: 'Zenyte',
      current_xp: 600000000,
      first_xp: 0,
      ehb: 0
    };
    expect(calculateNextLevel(member)).toBe(0);
  });

  it('handles member at exact threshold', () => {
    const member = {
      womrole: 'Sapphire',
      current_xp: 3000000,
      first_xp: 0,
      ehb: 0
    };
    // At exactly 3M (start of Sapphire), needs 5M to reach 8M
    expect(calculateNextLevel(member)).toBe(5000000);
  });
});

describe('calculateNextLevel - Fighter', () => {
  it('calculates EHB to next rank for Mentor', () => {
    const member = {
      womrole: 'Mentor',
      current_xp: 0,
      first_xp: 0,
      ehb: 50
    };
    // Mentor range is 0-100, member has 50, needs 50 more
    expect(calculateNextLevel(member)).toBe(50);
  });

  it('calculates EHB to next rank for Prefect', () => {
    const member = {
      womrole: 'Prefect',
      current_xp: 0,
      first_xp: 0,
      ehb: 200
    };
    // Prefect range is 100-300, member has 200, needs 100 more
    expect(calculateNextLevel(member)).toBe(100);
  });

  it('returns 0 for max rank (TzKal)', () => {
    const member = {
      womrole: 'TzKal',
      current_xp: 0,
      first_xp: 0,
      ehb: 2000
    };
    expect(calculateNextLevel(member)).toBe(0);
  });
});

describe('calculateNextLevel - Edge Cases', () => {
  it('handles null member', () => {
    expect(calculateNextLevel(null)).toBe(0);
  });

  it('handles undefined member', () => {
    expect(calculateNextLevel(undefined)).toBe(0);
  });

  it('handles member with no role', () => {
    const member = {
      womrole: '',
      current_xp: 10000000,
      first_xp: 0,
      ehb: 0
    };
    expect(calculateNextLevel(member)).toBe(0);
  });

  it('handles unknown rank type', () => {
    const member = {
      womrole: 'Unknown',
      current_xp: 10000000,
      first_xp: 0,
      ehb: 100
    };
    expect(calculateNextLevel(member)).toBe(0);
  });
});

describe('memberNeedsRankUpdate - Skiller', () => {
  it('returns true when Opal should be Sapphire', () => {
    const member = {
      womrole: 'Opal',
      wom_id: 123,
      hidden: false,
      first_xp: 0,
      current_xp: 5000000, // 5M clan XP = should be Sapphire
      ehb: 0
    };
    expect(memberNeedsRankUpdate(member)).toBe(true);
  });

  it('returns false when rank is correct', () => {
    const member = {
      womrole: 'Sapphire',
      wom_id: 123,
      hidden: false,
      first_xp: 0,
      current_xp: 5000000, // 5M clan XP = Sapphire is correct
      ehb: 0
    };
    expect(memberNeedsRankUpdate(member)).toBe(false);
  });

  it('returns true when Ruby should be Diamond', () => {
    const member = {
      womrole: 'Ruby',
      wom_id: 123,
      hidden: false,
      first_xp: 0,
      current_xp: 50000000, // 50M clan XP = should be Diamond
      ehb: 0
    };
    expect(memberNeedsRankUpdate(member)).toBe(true);
  });

  it('returns false when Zenyte is at max', () => {
    const member = {
      womrole: 'Zenyte',
      wom_id: 123,
      hidden: false,
      first_xp: 0,
      current_xp: 600000000, // 600M = Zenyte is correct
      ehb: 0
    };
    expect(memberNeedsRankUpdate(member)).toBe(false);
  });
});

describe('memberNeedsRankUpdate - Fighter', () => {
  it('returns true when Mentor should be Prefect', () => {
    const member = {
      womrole: 'Mentor',
      wom_id: 123,
      hidden: false,
      first_xp: 0,
      current_xp: 0,
      ehb: 150 // 150 EHB = should be Prefect
    };
    expect(memberNeedsRankUpdate(member)).toBe(true);
  });

  it('returns false when rank is correct', () => {
    const member = {
      womrole: 'Leader',
      wom_id: 123,
      hidden: false,
      first_xp: 0,
      current_xp: 0,
      ehb: 400 // 400 EHB = Leader is correct
    };
    expect(memberNeedsRankUpdate(member)).toBe(false);
  });

  it('returns true when Executive should be Senator', () => {
    const member = {
      womrole: 'Executive',
      wom_id: 123,
      hidden: false,
      first_xp: 0,
      current_xp: 0,
      ehb: 1150 // 1150 EHB = should be Senator
    };
    expect(memberNeedsRankUpdate(member)).toBe(true);
  });
});

describe('memberNeedsRankUpdate - Edge Cases', () => {
  it('returns false for null member', () => {
    expect(memberNeedsRankUpdate(null)).toBe(false);
  });

  it('returns false for undefined member', () => {
    expect(memberNeedsRankUpdate(undefined)).toBe(false);
  });

  it('returns false for hidden member', () => {
    const member = {
      womrole: 'Opal',
      wom_id: 123,
      hidden: true,
      first_xp: 0,
      current_xp: 10000000,
      ehb: 0
    };
    expect(memberNeedsRankUpdate(member)).toBe(false);
  });

  it('returns false for member without wom_id', () => {
    const member = {
      womrole: 'Opal',
      wom_id: null,
      hidden: false,
      first_xp: 0,
      current_xp: 10000000,
      ehb: 0
    };
    expect(memberNeedsRankUpdate(member)).toBe(false);
  });

  it('returns false for member without womrole', () => {
    const member = {
      womrole: null,
      wom_id: 123,
      hidden: false,
      first_xp: 0,
      current_xp: 10000000,
      ehb: 0
    };
    expect(memberNeedsRankUpdate(member)).toBe(false);
  });

  it('returns false for unknown rank type', () => {
    const member = {
      womrole: 'Unknown Rank',
      wom_id: 123,
      hidden: false,
      first_xp: 0,
      current_xp: 10000000,
      ehb: 100
    };
    expect(memberNeedsRankUpdate(member)).toBe(false);
  });

  it('handles string values for XP', () => {
    const member = {
      womrole: 'Opal',
      wom_id: 123,
      hidden: false,
      first_xp: '0',
      current_xp: '5000000',
      ehb: 0
    };
    expect(memberNeedsRankUpdate(member)).toBe(true);
  });

  it('handles string values for EHB', () => {
    const member = {
      womrole: 'Mentor',
      wom_id: 123,
      hidden: false,
      first_xp: 0,
      current_xp: 0,
      ehb: '150'
    };
    expect(memberNeedsRankUpdate(member)).toBe(true);
  });
});

describe('memberNeedsRankUpdate - Case Sensitivity', () => {
  it('handles lowercase womrole', () => {
    const member = {
      womrole: 'opal',
      wom_id: 123,
      hidden: false,
      first_xp: 0,
      current_xp: 5000000,
      ehb: 0
    };
    expect(memberNeedsRankUpdate(member)).toBe(true);
  });

  it('handles uppercase womrole', () => {
    const member = {
      womrole: 'SAPPHIRE',
      wom_id: 123,
      hidden: false,
      first_xp: 0,
      current_xp: 5000000,
      ehb: 0
    };
    expect(memberNeedsRankUpdate(member)).toBe(false);
  });

  it('handles mixed case womrole', () => {
    const member = {
      womrole: 'RuBy',
      wom_id: 123,
      hidden: false,
      first_xp: 0,
      current_xp: 20000000,
      ehb: 0
    };
    expect(memberNeedsRankUpdate(member)).toBe(false);
  });
});
