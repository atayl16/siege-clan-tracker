import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// The edge runtime provides Deno; checkAuth reads ALLOWED_ORIGIN from it.
globalThis.Deno = { env: { get: (k) => (k === 'ALLOWED_ORIGIN' ? 'https://www.siege-clan.com' : undefined) } };

const { default: handler } = await import('../wom-player-events.js');

const call = (query) =>
  handler(
    new Request(`https://www.siege-clan.com/api/wom-player-events${query}`, {
      headers: { Origin: 'https://www.siege-clan.com' },
    }),
    {}
  );

const ok = (body) => new Response(JSON.stringify(body), { status: 200 });

const standing = (id, endsAt, rank, gained) => ({
  playerId: 1234,
  competitionId: id,
  rank,
  progress: { start: 0, end: gained, gained },
  competition: {
    id,
    title: `Event ${id}`,
    metric: 'runecrafting',
    type: 'classic',
    endsAt,
    participantCount: 40,
  },
});

describe('wom-player-events', () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  describe('with WOM answering', () => {
    beforeEach(() => {
      globalThis.fetch = vi.fn(async (url) => {
        if (url.endsWith('/players/id/1234')) return ok({ id: 1234, username: 'roin rin' });
        return ok([
          standing(2, '2026-12-01T00:00:00Z', 7, 500),
          standing(1, '2026-11-20T00:00:00Z', 1, 12000),
        ]);
      });
    });

    it('resolves the username from the id, then asks for ongoing standings', async () => {
      const res = await call('?id=1234');
      expect(res.status).toBe(200);
      expect(globalThis.fetch).toHaveBeenNthCalledWith(
        1,
        'https://api.wiseoldman.net/v2/players/id/1234',
        expect.anything()
      );
      expect(globalThis.fetch).toHaveBeenNthCalledWith(
        2,
        'https://api.wiseoldman.net/v2/players/roin%20rin/competitions/standings?status=ongoing',
        expect.anything()
      );
    });

    it('returns a trimmed list, soonest-ending first', async () => {
      const body = await (await call('?id=1234')).json();
      expect(body).toEqual([
        {
          competitionId: 1,
          title: 'Event 1',
          metric: 'runecrafting',
          type: 'classic',
          endsAt: '2026-11-20T00:00:00Z',
          rank: 1,
          participantCount: 40,
          gained: 12000,
        },
        expect.objectContaining({ competitionId: 2, rank: 7, gained: 500 }),
      ]);
    });
  });

  it('passes a WOM 404 through', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 404 }));
    const res = await call('?id=1234');
    expect(res.status).toBe(404);
  });

  it.each([['', 'missing'], ['?id=abc', 'a name'], ['?id=../groups/1', 'a path']])(
    'rejects %s (%s) without calling WOM',
    async (query) => {
      globalThis.fetch = vi.fn();
      const res = await call(query);
      expect(res.status).toBe(400);
      expect(globalThis.fetch).not.toHaveBeenCalled();
    }
  );
});
