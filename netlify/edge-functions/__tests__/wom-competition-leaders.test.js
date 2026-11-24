import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// The edge runtime provides Deno; checkAuth reads ALLOWED_ORIGIN from it.
globalThis.Deno = { env: { get: (k) => (k === 'ALLOWED_ORIGIN' ? 'https://www.siege-clan.com' : undefined) } };

const { default: handler, topPlayers } = await import('../wom-competition-leaders.js');

const call = () =>
  handler(
    new Request('https://www.siege-clan.com/api/wom-competition-leaders', {
      headers: { Origin: 'https://www.siege-clan.com' },
    }),
    {}
  );

const ok = (body) => new Response(JSON.stringify(body), { status: 200 });
const DAY = 24 * 60 * 60 * 1000;
const iso = (offset) => new Date(Date.now() + offset).toISOString();
const entry = (name, gained) => ({ player: { displayName: name }, progress: { gained } });

describe('topPlayers', () => {
  it('takes the three highest gains, highest first', () => {
    const top = topPlayers([entry('Moon Fern', 50), entry('Ash Vale', 900), entry('Iron Wren', 0), entry('Kel Brook', 300), entry('Pip Holt', 10)]);
    expect(top).toEqual([
      { place: 1, name: 'Ash Vale', gained: 900 },
      { place: 2, name: 'Kel Brook', gained: 300 },
      { place: 3, name: 'Moon Fern', gained: 50 },
    ]);
  });

  it('gives a shared place to equal gains', () => {
    const top = topPlayers([entry('Moon Fern', 12), entry('Ash Vale', 12), entry('Kel Brook', 9)]);
    expect(top.map((p) => p.place)).toEqual([1, 1, 3]);
  });

  it('leaves out anyone who has gained nothing yet', () => {
    expect(topPlayers([entry('Moon Fern', 0), entry('Ash Vale', 4)])).toEqual([{ place: 1, name: 'Ash Vale', gained: 4 }]);
    expect(topPlayers(undefined)).toEqual([]);
  });
});

describe('wom-competition-leaders', () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  beforeEach(() => {
    globalThis.fetch = vi.fn(async (url) => {
      if (url.endsWith('/groups/2928/competitions')) {
        return ok([
          { id: 11, startsAt: iso(-DAY), endsAt: iso(5 * DAY) }, // running
          { id: 12, startsAt: iso(-2 * DAY), endsAt: iso(2 * DAY) }, // running, ends sooner
          { id: 13, startsAt: iso(-9 * DAY), endsAt: iso(-2 * DAY) }, // finished
          { id: 14, startsAt: iso(DAY), endsAt: iso(8 * DAY) }, // not started
        ]);
      }
      const id = Number(url.split('/').pop());
      return ok({ id, participations: [entry(`Player ${id}`, id * 100)] });
    });
  });

  it('fetches standings only for competitions running now', async () => {
    await call();
    const urls = globalThis.fetch.mock.calls.map(([url]) => url);
    expect(urls).toEqual([
      'https://api.wiseoldman.net/v2/groups/2928/competitions',
      'https://api.wiseoldman.net/v2/competitions/12',
      'https://api.wiseoldman.net/v2/competitions/11',
    ]);
  });

  it('returns each running competition with its top players, soonest-ending first', async () => {
    const res = await call();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([
      { competitionId: 12, top: [{ place: 1, name: 'Player 12', gained: 1200 }] },
      { competitionId: 11, top: [{ place: 1, name: 'Player 11', gained: 1100 }] },
    ]);
  });

  it('fails the whole answer, uncached, when one competition cannot be fetched', async () => {
    const inner = globalThis.fetch;
    globalThis.fetch = vi.fn(async (url) =>
      url.endsWith('/competitions/11') ? new Response('down', { status: 503 }) : inner(url)
    );
    const res = await call();
    expect(res.status).toBe(502);
    expect(res.headers.get('Netlify-CDN-Cache-Control')).toBeNull();
  });

  it('makes no standings calls when nothing is running', async () => {
    globalThis.fetch = vi.fn(async () => ok([{ id: 13, startsAt: iso(-9 * DAY), endsAt: iso(-2 * DAY) }]));
    const res = await call();
    expect(await res.json()).toEqual([]);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });
});
