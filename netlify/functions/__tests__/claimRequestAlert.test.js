import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { alertClaimRequest, renderClaimRequestAlert, AlertError, ADMIN_URL } = require('../utils/claimRequestAlert.cjs');

const CALLER = { id: 'auth-1' };
const CHANNEL = 'staff-channel';

/**
 * A stand-in for the service-role client, over two tables. Filters are
 * applied for real, so the conditional claim behaves as it would in Postgres.
 */
function fakeSupabase({ requests, users = [] }) {
  const tables = { claim_requests: requests, users };
  const updates = [];
  const from = (table) => {
    const q = { filters: [], or: null, update: null };
    const matches = () => {
      let rows = tables[table];
      if (q.or) {
        const ids = [...q.or.matchAll(/\.eq\.([^,]+)/g)].map((m) => m[1]);
        rows = rows.filter((r) => ids.includes(r.id) || ids.includes(r.supabase_auth_id));
      }
      return rows.filter((r) => q.filters.every(([col, val]) => (val === null ? r[col] == null : r[col] === val)));
    };
    const builder = {
      select() { return builder; },
      eq(col, val) { q.filters.push([col, val]); return builder; },
      is(col, val) { q.filters.push([col, val]); return builder; },
      or(expr) { q.or = expr; return builder; },
      limit() { return builder; },
      update(values) { q.update = values; return builder; },
      async maybeSingle() { return { data: matches()[0] ?? null, error: null }; },
      then(resolve) {
        const rows = matches();
        if (q.update) {
          updates.push({ table, values: q.update });
          rows.forEach((r) => Object.assign(r, q.update));
        }
        return Promise.resolve({ data: rows, error: null }).then(resolve);
      },
    };
    return builder;
  };
  return { from, updates };
}

const pending = (over = {}) => ({
  id: 7,
  user_id: 'auth-1',
  rsn: 'Test Main',
  message: 'This is my main, I am the same person as test_user.',
  status: 'pending',
  notified_at: null,
  ...over,
});

describe('alertClaimRequest', () => {
  let postMessage;
  beforeEach(() => {
    postMessage = vi.fn().mockResolvedValue({ id: 'msg-1' });
  });

  const run = (supabase, requestId = 7) =>
    alertClaimRequest({ supabase, authUser: CALLER, requestId, channelId: CHANNEL, postMessage });

  it("posts the caller's pending request to the staff channel and marks it announced", async () => {
    const requests = [pending()];
    const supabase = fakeSupabase({ requests, users: [{ id: 'auth-1', username: 'test_user' }] });

    expect(await run(supabase)).toEqual({ notified: true });
    expect(postMessage).toHaveBeenCalledTimes(1);
    const [channel, message] = postMessage.mock.calls[0];
    expect(channel).toBe(CHANNEL);
    expect(message.embeds[0].description).toContain('**test\\_user** wants to claim **Test Main**.');
    expect(requests[0].notified_at).not.toBeNull();
  });

  it('posts once however often it is called', async () => {
    const supabase = fakeSupabase({ requests: [pending()] });
    await run(supabase);
    expect(await run(supabase)).toEqual({ notified: false, reason: 'already announced' });
    expect(postMessage).toHaveBeenCalledTimes(1);
  });

  it("refuses someone else's request, and one that does not exist, the same way", async () => {
    const supabase = fakeSupabase({ requests: [pending({ user_id: 'auth-2' })] });
    await expect(run(supabase)).rejects.toMatchObject({ statusCode: 404, message: 'No such claim request.' });
    await expect(run(supabase, 99)).rejects.toMatchObject({ statusCode: 404, message: 'No such claim request.' });
    expect(postMessage).not.toHaveBeenCalled();
  });

  it('rejects a missing or malformed id', async () => {
    const supabase = fakeSupabase({ requests: [pending()] });
    for (const id of [null, 'abc', -1, 1.5]) {
      await expect(run(supabase, id)).rejects.toBeInstanceOf(AlertError);
    }
  });

  it('says nothing about a request an admin has already handled', async () => {
    const supabase = fakeSupabase({ requests: [pending({ status: 'approved' })] });
    expect(await run(supabase)).toEqual({ notified: false, reason: 'not pending' });
    expect(postMessage).not.toHaveBeenCalled();
  });

  it('releases the claim when Discord refuses the post, so it can be tried again', async () => {
    const requests = [pending()];
    const supabase = fakeSupabase({ requests });
    postMessage.mockRejectedValueOnce(Object.assign(new Error('Missing Access'), { status: 403 }));

    await expect(run(supabase)).rejects.toThrow('Missing Access');
    expect(requests[0].notified_at).toBeNull();
    expect(await run(supabase)).toEqual({ notified: true });
  });

  it('keeps the claim when the post may have gone through, rather than risk a second post', async () => {
    const requests = [pending()];
    const supabase = fakeSupabase({ requests });
    postMessage.mockRejectedValueOnce(Object.assign(new Error('timed out'), { name: 'TimeoutError' }));

    await expect(run(supabase)).rejects.toThrow('timed out');
    expect(requests[0].notified_at).not.toBeNull();
  });
});

describe('renderClaimRequestAlert', () => {
  it('names the member and the character, quotes their note, and links the admin queue', () => {
    const message = renderClaimRequestAlert({
      request: { rsn: 'Test Main', message: 'Line one\n# not a heading' },
      username: 'test_user',
    });
    expect(message.embeds[0].title).toBe('New claim request');
    expect(message.embeds[0].description).toBe(
      ['**test\\_user** wants to claim **Test Main**.', '', '> Line one', '> \\# not a heading'].join('\n')
    );
    expect(message.components[0].components[0]).toMatchObject({ style: 5, label: 'Review claim requests', url: ADMIN_URL });
  });

  it('never pings anyone', () => {
    const message = renderClaimRequestAlert({ request: { rsn: '@everyone' }, username: null });
    expect(message.allowed_mentions).toEqual({ parse: [] });
    expect(message.embeds[0].description).toBe('A member wants to claim **@everyone**.');
  });

  it('cuts a long note short', () => {
    const message = renderClaimRequestAlert({ request: { rsn: 'Test Main', message: 'x'.repeat(2000) }, username: 'test_user' });
    expect(message.embeds[0].description.length).toBeLessThan(700);
    expect(message.embeds[0].description.endsWith('…')).toBe(true);
  });
});
