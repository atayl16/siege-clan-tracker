import { describe, it, expect } from 'vitest';
import { MAX_LEVEL, hasLevels, levelForXp, xpForLevel } from '../skillLevels';

describe('skill levels', () => {
  it('matches the game XP table', () => {
    // Values from the OSRS wiki's experience table.
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(2)).toBe(83);
    expect(xpForLevel(81)).toBe(2_192_818);
    expect(xpForLevel(85)).toBe(3_258_594);
    expect(xpForLevel(92)).toBe(6_517_253);
    expect(xpForLevel(MAX_LEVEL)).toBe(13_034_431);
  });

  it('gives the level an amount of XP reaches', () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(82)).toBe(1);
    expect(levelForXp(83)).toBe(2);
    expect(levelForXp(3_258_593)).toBe(84);
    expect(levelForXp(3_258_594)).toBe(85);
    // XP keeps going past 99; the level does not.
    expect(levelForXp(200_000_000)).toBe(99);
  });

  it('round-trips every level', () => {
    for (let level = 1; level <= MAX_LEVEL; level++) {
      expect(levelForXp(xpForLevel(level))).toBe(level);
    }
  });

  it('does not offer levels for overall, whose level is the total level', () => {
    expect(hasLevels('thieving')).toBe(true);
    expect(hasLevels('overall')).toBe(false);
    expect(hasLevels('')).toBe(false);
  });
});
