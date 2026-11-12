import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

globalThis.Deno = {
  env: { get: (k) => (k === 'ALLOWED_ORIGIN' ? 'https://www.siege-clan.com' : undefined) },
};

const { default: handler, config } = await import('../wom-group-gained.js');

const START = '2026-11-09T19:00:00.000Z';
const END = '2026-11-16T19:00:00.000Z';

const call = (query) =>
  handler(
    new Request(`https://www.siege-clan.com/api/wom-group-gained?${query}`, {
      headers: { Origin: 'https://www.siege-clan.com' },
    }),
    {}
  );

const womRow = (id, gained) => ({
  player: { id, username: `p${id}`, displayName: `P${id}`, exp: 123, ehb: 4 },
  startDate: START,
  endDate: END,
  data: { gained, start: 1, end: 1 + gained },
});

describe('wom-group-gained', () => {
  const realFetch = globalThis.fetch;
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('opts in to edge caching, per window', async () => {
    expect(config.cache).toBe('manual');
    globalThis.fetch.mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
    const res = await call(`startDate=${START}&endDate=${END}`);
    expect(res.status).toBe(200);
    expect(res.headers.get('Netlify-Vary')).toBe('query=startDate|endDate');
    expect(res.headers.get('Netlify-CDN-Cache-Control')).toMatch(/^public, max-age=\d+/);
  });

  it('asks WOM for overall XP in the window', async () => {
    globalThis.fetch.mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
    await call(`startDate=${START}&endDate=${END}`);
    const url = new URL(globalThis.fetch.mock.calls[0][0]);
    expect(url.pathname).toBe('/v2/groups/2928/gained');
    expect(url.searchParams.get('metric')).toBe('overall');
    expect(url.searchParams.get('startDate')).toBe(START);
    expect(url.searchParams.get('endDate')).toBe(END);
  });

  it('returns every gainer, highest first, trimmed to the fields the page shows', async () => {
    globalThis.fetch.mockResolvedValue(
      new Response(JSON.stringify([womRow(1, 0), womRow(2, 50), womRow(3, 900)]), { status: 200 })
    );
    const body = await (await call(`startDate=${START}&endDate=${END}`)).json();
    expect(body).toEqual([
      { player: { id: 3, username: 'p3', displayName: 'P3' }, data: { gained: 900 } },
      { player: { id: 2, username: 'p2', displayName: 'P2' }, data: { gained: 50 } },
    ]);
  });

  it('keeps gainers past the top 25, so a member far down can see their place', async () => {
    const rows = Array.from({ length: 60 }, (_, i) => womRow(i + 1, 1000 - i));
    globalThis.fetch.mockResolvedValue(new Response(JSON.stringify(rows), { status: 200 }));
    const body = await (await call(`startDate=${START}&endDate=${END}`)).json();
    expect(body).toHaveLength(60);
  });

  it.each([
    ['missing dates', ''],
    ['a non-ISO start', `startDate=yesterday&endDate=${END}`],
    ['something smuggled into the query', `startDate=${START}%26metric%3Dzulrah&endDate=${END}`],
    ['end before start', `startDate=${END}&endDate=${START}`],
    ['a window over 31 days', `startDate=2026-01-01T00:00:00.000Z&endDate=${END}`],
  ])('refuses %s without calling WOM', async (_label, query) => {
    const res = await call(query);
    expect(res.status).toBe(400);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('answers 502, uncached, when WOM sends something other than a list', async () => {
    globalThis.fetch.mockResolvedValue(new Response(JSON.stringify({ message: 'odd' }), { status: 200 }));
    const res = await call(`startDate=${START}&endDate=${END}`);
    expect(res.status).toBe(502);
    expect(res.headers.get('Netlify-CDN-Cache-Control')).toBeNull();
  });

  it('passes a WOM rate limit through as 429', async () => {
    globalThis.fetch.mockResolvedValue(new Response('{}', { status: 429 }));
    const res = await call(`startDate=${START}&endDate=${END}`);
    expect(res.status).toBe(429);
  });
});
