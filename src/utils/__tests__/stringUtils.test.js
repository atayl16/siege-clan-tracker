import { describe, it, expect } from 'vitest';
import { titleize } from '../stringUtils';

describe('stringUtils', () => {
  describe('titleize', () => {
    describe('basic functionality', () => {
      it('capitalizes first letter of each word in lowercase string', () => {
        expect(titleize('hello world')).toBe('Hello World');
      });

      it('capitalizes first letter of each word in uppercase string', () => {
        expect(titleize('HELLO WORLD')).toBe('Hello World');
      });

      it('capitalizes first letter of each word in mixed case string', () => {
        expect(titleize('hElLo WoRlD')).toBe('Hello World');
      });

      it('handles single word', () => {
        expect(titleize('hello')).toBe('Hello');
      });

      it('handles single character', () => {
        expect(titleize('a')).toBe('A');
      });

      it('preserves multiple spaces between words', () => {
        expect(titleize('hello  world')).toBe('Hello  World');
      });
    });

    describe('null, undefined, and empty string handling', () => {
      it('returns "-" for null', () => {
        expect(titleize(null)).toBe('-');
      });

      it('returns "-" for undefined', () => {
        expect(titleize(undefined)).toBe('-');
      });

      it('returns "-" for empty string', () => {
        expect(titleize('')).toBe('-');
      });

      it('returns "-" for whitespace only string', () => {
        expect(titleize('   ')).toBe('-');
      });
    });

    describe('special characters and numbers', () => {
      it('handles strings with numbers', () => {
        expect(titleize('hello 123 world')).toBe('Hello 123 World');
      });

      it('handles strings with hyphens', () => {
        expect(titleize('hello-world')).toBe('Hello-world');
      });

      it('handles strings with underscores', () => {
        expect(titleize('hello_world')).toBe('Hello_world');
      });

      it('handles strings with apostrophes', () => {
        expect(titleize("it's working")).toBe("It's Working");
      });

      it('handles strings with special characters', () => {
        expect(titleize('hello@world.com')).toBe('Hello@world.com');
      });
    });

    describe('RuneScape rank names (real-world usage)', () => {
      it('titleizes skiller rank names', () => {
        expect(titleize('opal')).toBe('Opal');
        expect(titleize('sapphire')).toBe('Sapphire');
        expect(titleize('emerald')).toBe('Emerald');
        expect(titleize('ruby')).toBe('Ruby');
        expect(titleize('diamond')).toBe('Diamond');
        expect(titleize('dragonstone')).toBe('Dragonstone');
        expect(titleize('onyx')).toBe('Onyx');
        expect(titleize('zenyte')).toBe('Zenyte');
      });

      it('titleizes fighter rank names', () => {
        expect(titleize('mentor')).toBe('Mentor');
        expect(titleize('prefect')).toBe('Prefect');
        expect(titleize('leader')).toBe('Leader');
        expect(titleize('supervisor')).toBe('Supervisor');
        expect(titleize('superior')).toBe('Superior');
        expect(titleize('executive')).toBe('Executive');
        expect(titleize('senator')).toBe('Senator');
        expect(titleize('monarch')).toBe('Monarch');
        expect(titleize('tzkal')).toBe('Tzkal');
      });

      it('handles uppercase rank names from database', () => {
        expect(titleize('OPAL')).toBe('Opal');
        expect(titleize('TZKAL')).toBe('Tzkal');
      });

      it('handles rank names with spaces', () => {
        expect(titleize('iron man')).toBe('Iron Man');
        expect(titleize('ultimate ironman')).toBe('Ultimate Ironman');
      });
    });

    describe('edge cases', () => {
      it('handles very long strings', () => {
        const longString = 'word '.repeat(100).trim();
        const titleized = titleize(longString);
        expect(titleized.split(' ').every(word => word[0] === word[0].toUpperCase())).toBe(true);
      });

      it('handles strings with leading spaces', () => {
        expect(titleize('  hello world')).toBe('  Hello World');
      });

      it('handles strings with trailing spaces', () => {
        expect(titleize('hello world  ')).toBe('Hello World  ');
      });

      it('handles strings with mixed spacing', () => {
        expect(titleize('  hello   world  ')).toBe('  Hello   World  ');
      });

      it('handles single space', () => {
        expect(titleize(' ')).toBe('-');
      });

      it('handles tabs and newlines', () => {
        expect(titleize('hello\tworld')).toBe('Hello\tworld');
        expect(titleize('hello\nworld')).toBe('Hello\nworld');
      });
    });

    describe('type coercion', () => {
      it('handles falsy values consistently', () => {
        expect(titleize(0)).toBe('-');
        expect(titleize(false)).toBe('-');
        expect(titleize(NaN)).toBe('-');
      });

      it('handles empty array', () => {
        expect(titleize([])).toBe('-');
      });

      it('handles empty object', () => {
        // {} is truthy, so toString() will be called
        expect(titleize({})).toBe('[object Object]');
      });
    });
  });
});
