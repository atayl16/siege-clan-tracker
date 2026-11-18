// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequire } from 'module';
import { rankPromotionFor, memberNeedsRankUpdate } from '../../../src/utils/rankUtils.js';

const require = createRequire(import.meta.url);
const { alertRankUps, renderRankUpAlert } = require('../rank-up-alerts.cjs');

/** A stand-in for the service-role client over the members table. */
function fakeSupabase(members) {
  const from = () => {
    const q = { filters: [], update: null };
    const builder = {
      select() { return builder; },
      update(values) { q.update = values; return builder; },
      eq(col, val) { q.filters.push([col, val]); return builder; },
      is(col, val) { q.filters.push([col, val]); return builder; },
      then(resolve) {
        const rows = members.filter((m) => q.filters.every(([c, v]) => (v === null ? m[c] == null : m[c] === v)));
        if (q.update) rows.forEach((m) => Object.assign(m, q.update));
        return Promise.resolve({ data: q.update ? rows.map((m) => ({ wom_id: m.wom_id })) : rows, error: null }).then(resolve);
      },
    };
    return builder;
  };
  return { from };
}

const fighter = (over = {}) => ({ wom_id: 1, name: 'Test Fighter', womrole: 'leader', ehb: 512.4, hidden: false, left_date: null, rank_alert_sent: null, ...over });

describe('alertRankUps', () => {
  let postMessage;
  const run = (members) =>
    alertRankUps({ supabase: fakeSupabase(members), postMessage, rankPromotionFor, memberNeedsRankUpdate, channelId: 'staff', log: () => {} });

  beforeEach(() => {
    postMessage = vi.fn().mockResolvedValue({ id: 'm1' });
  });

  it('announces a rank-up once, then stays quiet', async () => {
    const members = [fighter()];
    expect(await run(members)).toEqual({ posted: 1 });
    expect(postMessage.mock.calls[0][1].embeds[0].description).toContain('**Test Fighter**: Leader → **Supervisor** (512 EHB)');
    expect(members[0].rank_alert_sent).toBe('supervisor');

    expect(await run(members)).toEqual({ posted: 0 });
    expect(postMessage).toHaveBeenCalledTimes(1);
  });

  it('announces again when the next rank is earned', async () => {
    const members = [fighter({ womrole: 'supervisor', ehb: 705, rank_alert_sent: 'supervisor' })];
    expect(await run(members)).toEqual({ posted: 1 });
    expect(members[0].rank_alert_sent).toBe('superior');
  });

  it('never announces a move down, or hidden and former members', async () => {
    const members = [
      fighter({ womrole: 'supervisor', ehb: 480 }),
      fighter({ wom_id: 2, hidden: true }),
      fighter({ wom_id: 3, left_date: '2026-10-01' }),
    ];
    expect(await run(members)).toEqual({ posted: 0 });
    expect(postMessage).not.toHaveBeenCalled();
  });

  it('puts the claims back when Discord refuses the post', async () => {
    const members = [fighter()];
    postMessage.mockRejectedValueOnce(Object.assign(new Error('Missing Access'), { status: 403 }));
    await expect(run(members)).rejects.toThrow('Missing Access');
    expect(members[0].rank_alert_sent).toBeNull();
    expect(await run(members)).toEqual({ posted: 1 });
  });

  it('keeps the claims when the post may have gone through', async () => {
    const members = [fighter()];
    postMessage.mockRejectedValueOnce(new Error('timed out'));
    await expect(run(members)).rejects.toThrow('timed out');
    expect(members[0].rank_alert_sent).toBe('supervisor');
  });

  it('puts every rank-up from one run in one message', async () => {
    const members = [fighter(), { ...fighter({ wom_id: 2, name: 'Test Skiller', womrole: 'ruby', ehb: 0 }), current_xp: 45000000, first_xp: 3800000 }];
    expect(await run(members)).toEqual({ posted: 2 });
    expect(postMessage).toHaveBeenCalledTimes(1);
    expect(postMessage.mock.calls[0][1].embeds[0].title).toBe('2 rank-ups due');
    expect(postMessage.mock.calls[0][1].embeds[0].description).toContain('Ruby → **Diamond** (41.2M clan XP)');
  });
});

describe('renderRankUpAlert', () => {
  it('never pings, escapes names, and cuts a long list short', () => {
    const many = Array.from({ length: 35 }, (_, i) => ({ name: `big_test${i}`, from: 'leader', to: 'supervisor', type: 'fighter', stat: '500 EHB' }));
    const message = renderRankUpAlert(many);
    expect(message.allowed_mentions).toEqual({ parse: [] });
    expect(message.embeds[0].description).toContain('big\\_test0');
    expect(message.embeds[0].description).toContain('- and 5 more on the admin page');
    expect(message.embeds[0].description.length).toBeLessThan(4096);
  });
});
