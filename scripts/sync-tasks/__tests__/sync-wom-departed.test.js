// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
process.env.SUPABASE_URL ||= 'http://127.0.0.1:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'stub-service-key';
const { departedToRemove, groupLooksComplete, DEPARTED_GRACE_DAYS } = require('../sync-wom.cjs');

const NOW = new Date('2026-11-25T12:00:00Z');
const daysAgo = (n) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000).toISOString();
const member = (over) => ({ wom_id: 1, active: false, left_date: daysAgo(30), ...over });
const group = (...ids) => new Map(ids.map((id) => [id, { womrole: 'ruby' }]));
const ids = (rows) => rows.map((m) => m.wom_id);

describe('departedToRemove', () => {
  it('waits 7 days', () => {
    expect(DEPARTED_GRACE_DAYS).toBe(7);
  });

  it('removes members marked as left 7+ days ago who are still out of the group', () => {
    const members = [
      member({ wom_id: 1, left_date: daysAgo(30) }),
      member({ wom_id: 2, left_date: daysAgo(7) }),
    ];
    expect(ids(departedToRemove(members, group(99), NOW))).toEqual([1, 2]);
  });

  it('keeps anyone back in the group, however long ago they were marked as left', () => {
    // Rejoined, but the rejoin step has not reactivated them yet.
    const members = [member({ wom_id: 1, left_date: daysAgo(400) })];
    expect(departedToRemove(members, group(1), NOW)).toEqual([]);
  });

  it('keeps members marked as left less than 7 days ago', () => {
    const members = [member({ wom_id: 1, left_date: daysAgo(6.9) })];
    expect(departedToRemove(members, group(), NOW)).toEqual([]);
  });

  it('never removes a member who is not marked as left', () => {
    const members = [
      // Out of the group but not marked yet: the sync marks them first.
      member({ wom_id: 1, active: true, left_date: null }),
      member({ wom_id: 2, active: false, left_date: null }),
      // Marked, but someone set them active again: needs a person to look.
      member({ wom_id: 3, active: true, left_date: daysAgo(30) }),
    ];
    expect(departedToRemove(members, group(), NOW)).toEqual([]);
  });

  it('keeps a member whose left_date cannot be read', () => {
    expect(departedToRemove([member({ left_date: 'not a date' })], group(), NOW)).toEqual([]);
  });
});

describe('groupLooksComplete', () => {
  const active = (n) => Array.from({ length: n }, (_, i) => ({ wom_id: i, active: true }));

  it('accepts a group about the size of the clan', () => {
    expect(groupLooksComplete(active(128), [...active(130), { wom_id: 999, active: false }])).toBe(true);
  });

  it('rejects an empty or cut-short group', () => {
    expect(groupLooksComplete([], active(130))).toBe(false);
    expect(groupLooksComplete(active(64), active(130))).toBe(false);
  });

  it('counts only active members, so former ones cannot make a real group look short', () => {
    const formers = Array.from({ length: 200 }, (_, i) => ({ wom_id: 1000 + i, active: false }));
    expect(groupLooksComplete(active(130), [...active(130), ...formers])).toBe(true);
  });
});
