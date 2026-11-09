import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// The edge runtime provides Deno. env is swapped per test so the API key can
// be present or absent.
let env = {};
globalThis.Deno = {
  env: { get: (k) => (k === 'ALLOWED_ORIGIN' ? 'https://www.siege-clan.com' : env[k]) },
};

const modules = {
  'wom-group': await import('../wom-group.js'),
  'wom-group-stats': await import('../wom-group-stats.js'),
  'wom-group-achievements': await import('../wom-group-achievements.js'),
  'wom-competitions': await import('../wom-competitions.js'),
  'wom-player': await import('../wom-player.js'),
  'wom-player-events': await import('../wom-player-events.js'),
};

const perPlayer = new Set(['wom-player', 'wom-player-events']);

const call = (name) =>
  modules[name].default(
    new Request(`https://www.siege-clan.com/api/${name}${perPlayer.has(name) ? '?id=1234' : ''}`, {
      headers: { Origin: 'https://www.siege-clan.com' },
    }),
    {}
  );

// wom-player-events needs a username from its first call; everything else
// just needs a JSON body.
const ok = () =>
  new Response(JSON.stringify({ username: 'roinrin', id: 1234 }), { status: 200 });

const names = Object.keys(modules);

describe('WOM edge functions', () => {
  const realFetch = globalThis.fetch;
  beforeEach(() => {
    env = {};
    globalThis.fetch = vi.fn().mockImplementation(async () => ok());
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  // Without this Netlify ignores the Cache-Control headers below and runs the
  // function, and so calls WOM, on every request.
  it.each(names)('%s opts in to edge caching', (name) => {
    expect(modules[name].config.cache).toBe('manual');
  });

  it.each(names)('%s marks a success cacheable at the edge', async (name) => {
    const res = await call(name);
    expect(res.status).toBe(200);
    expect(res.headers.get('Netlify-CDN-Cache-Control')).toMatch(/^public, max-age=\d+, stale-while-revalidate=\d+$/);
    expect(res.headers.get('Cache-Control')).toMatch(/^public, max-age=\d+$/);
  });

  it.each([...perPlayer])('%s caches each player separately', async (name) => {
    const res = await call(name);
    expect(res.headers.get('Netlify-Vary')).toBe('query=id');
  });

  it.each(names)('%s sends the WOM key as x-api-key, the header WOM reads', async (name) => {
    env.WOM_API_KEY = 'test-key';
    const res = await call(name);
    // Without these, a handler that returned early would pass by checking
    // no requests at all.
    expect(res.status).toBe(200);
    expect(globalThis.fetch).toHaveBeenCalled();
    for (const [, init] of globalThis.fetch.mock.calls) {
      expect(init.headers['x-api-key']).toBe('test-key');
      expect(init.headers.Authorization).toBeUndefined();
    }
  });

  it('calls WOM anonymously when no key is configured', async () => {
    await call('wom-group-stats');
    const [, init] = globalThis.fetch.mock.calls[0];
    expect(init.headers['x-api-key']).toBeUndefined();
  });

  it('falls back to anonymous once if WOM rejects the key', async () => {
    env.WOM_API_KEY = 'revoked-key';
    const rejected = new Response('{"message":"Invalid API Key"}', { status: 403 });
    const cancel = vi.spyOn(rejected.body, 'cancel');
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(rejected)
      .mockResolvedValueOnce(ok());
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await call('wom-group-stats');

    expect(res.status).toBe(200);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    expect(globalThis.fetch.mock.calls[1][1].headers['x-api-key']).toBeUndefined();
    expect(cancel).toHaveBeenCalled(); // the unread 403 body is released
    expect(errorLog).toHaveBeenCalledWith(expect.stringContaining('WOM_API_KEY'));
    errorLog.mockRestore();
  });

  // wom-player-events makes two WOM calls. The cases above fail the first
  // one; these fail the second (standings) after the player lookup succeeds.
  it.each([
    [429, 429, '42'],
    [503, 502, null],
  ])('wom-player-events maps a standings %i to %i, uncached', async (upstream, expected, retryAfter) => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(ok())
      .mockResolvedValueOnce(
        new Response('{}', { status: upstream, headers: retryAfter ? { 'Retry-After': retryAfter } : {} })
      );

    const res = await call('wom-player-events');

    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    expect(res.status).toBe(expected);
    expect(res.headers.get('Retry-After')).toBe(retryAfter);
    expect(res.headers.get('Cache-Control')).toBeNull();
    expect(res.headers.get('Netlify-CDN-Cache-Control')).toBeNull();
  });

  it.each(names)('%s passes a WOM 429 through with Retry-After, uncached', async (name) => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(new Response('{}', { status: 429, headers: { 'Retry-After': '42' } }));
    const res = await call(name);
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('42');
    expect(res.headers.get('Netlify-CDN-Cache-Control')).toBeNull();
    expect((await res.json()).error).toMatch(/rate limiting/i);
  });

  it.each(names)('%s reports a WOM outage as 502, uncached', async (name) => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('down', { status: 503 }));
    const res = await call(name);
    expect(res.status).toBe(502);
    expect(res.headers.get('Netlify-CDN-Cache-Control')).toBeNull();
  });

  it.each(names)('%s reports a network failure as 502', async (name) => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('fetch failed'));
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await call(name);
    expect(res.status).toBe(502);
    errorLog.mockRestore();
  });

  it('passes a WOM 404 through, since an unknown player is a real answer', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 404 }));
    const res = await call('wom-player');
    expect(res.status).toBe(404);
  });
});
