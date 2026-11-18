// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
process.env.SUPABASE_URL ||= 'http://127.0.0.1:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'stub-service-key';
const { rankChanges } = require('../sync-wom.cjs');

describe('rankChanges', () => {
  const wom = new Map([
    [1, { womrole: 'ruby' }],
    [2, { womrole: 'emerald' }],
    [3, { womrole: 'leader' }],
    [4, { womrole: null }],
  ]);

  it('finds every member whose stored rank differs from WOM, gaining XP or not', () => {
    const members = [
      { wom_id: 1, womrole: 'emerald' },
      { wom_id: 2, womrole: 'emerald' },
      { wom_id: 3, womrole: null },
    ];
    expect(rankChanges(members, wom)).toEqual([
      { wom_id: 1, from: 'emerald', to: 'ruby' },
      { wom_id: 3, from: null, to: 'leader' },
    ]);
  });

  it('never clears a rank WOM does not give, and ignores members not in the group', () => {
    expect(rankChanges([{ wom_id: 4, womrole: 'opal' }, { wom_id: 9, womrole: 'opal' }], wom)).toEqual([]);
  });
});
