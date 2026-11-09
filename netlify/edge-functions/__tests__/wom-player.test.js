import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// The edge runtime provides Deno; checkAuth reads ALLOWED_ORIGIN from it.
globalThis.Deno = { env: { get: (k) => (k === 'ALLOWED_ORIGIN' ? 'https://www.siege-clan.com' : undefined) } };

const { default: handler } = await import('../wom-player.js');

const call = (query) =>
  handler(
    new Request(`https://www.siege-clan.com/api/wom-player${query}`, {
      headers: { Origin: 'https://www.siege-clan.com' },
    }),
    {}
  );

describe('wom-player', () => {
  const realFetch = globalThis.fetch;
  beforeEach(() => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 1234 }), { status: 200 })
    );
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('looks the player up by numeric id, not as a username', async () => {
    // Regression: /v2/players/1234 treats 1234 as a username and 404s,
    // which left the goal metric picker empty.
    const res = await call('?id=1234');
    expect(res.status).toBe(200);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://api.wiseoldman.net/v2/players/id/1234',
      expect.anything()
    );
  });

  it.each([['', 'missing'], ['?id=abc', 'a name'], ['?id=../groups/1', 'a path']])(
    'rejects %s (%s) without calling WOM',
    async (query) => {
      const res = await call(query);
      expect(res.status).toBe(400);
      expect(globalThis.fetch).not.toHaveBeenCalled();
    }
  );
});
