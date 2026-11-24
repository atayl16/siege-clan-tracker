// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { runUsageCheck, buildMinutesReading, pickAccount } = require('../usage-check.cjs');

const MB = 1024 ** 2;
const NOW = new Date('2026-11-20T06:23:00Z');

const env = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-key',
  GITHUB_TOKEN: 'gh-token',
  GITHUB_REPOSITORY: 'example/repo',
  GITHUB_ASSIGNEE: 'example-owner',
  NETLIFY_USAGE_TOKEN: 'netlify-token',
};

function response(status, body) {
  const text = body === undefined ? '' : JSON.stringify(body);
  return { ok: status >= 200 && status < 300, status, text: async () => text };
}

/**
 * A fake fetch over the three APIs. `over` replaces a route's answer; each
 * call is recorded as [method, url, parsed body].
 */
function fakeApis(over = {}) {
  const calls = [];
  const routes = {
    accounts: () => response(200, [{ id: 'acc1', slug: 'test-team' }]),
    buildStatus: () =>
      response(200, [{ minutes: { current: 40, included_minutes: '300', period_start_date: '2026-11-01T00:00:00Z', period_end_date: '2026-12-01T00:00:00Z' } }]),
    bandwidth: () =>
      response(200, { used: 3 * 1024 ** 3, included: 100 * 1024 ** 3, period_start_date: '2026-11-01T00:00:00Z', period_end_date: '2026-12-01T00:00:00Z' }),
    dbSize: () => response(200, 20 * MB),
    history: () => response(200, [{ taken_on: '2026-11-01', used: String(19 * MB) }]),
    upsert: () => response(201),
    prune: () => response(204),
    search: () => response(200, { items: [] }),
    createIssue: () => response(201, { number: 1 }),
    ...over,
  };
  const fetchImpl = async (url, init = {}) => {
    const method = init.method || 'GET';
    calls.push([method, url, init.body ? JSON.parse(init.body) : undefined, init.headers]);
    if (url.endsWith('/api/v1/accounts')) return routes.accounts();
    if (url.endsWith('/builds/status')) return routes.buildStatus();
    if (url.endsWith('/bandwidth')) return routes.bandwidth();
    if (url.includes('/rpc/usage_database_bytes')) return routes.dbSize();
    if (url.includes('/usage_snapshots') && method === 'GET') return routes.history(url);
    if (url.includes('/usage_snapshots') && method === 'POST') return routes.upsert();
    if (url.includes('/usage_snapshots') && method === 'DELETE') return routes.prune();
    if (url.includes('/search/issues')) return routes.search(url);
    if (url.endsWith('/repos/example/repo/issues') && method === 'POST') return routes.createIssue();
    throw new Error(`Unexpected request ${method} ${url}`);
  };
  return { fetchImpl, calls };
}

const run = (fetchImpl, extraEnv = {}) => runUsageCheck({ env: { ...env, ...extraEnv }, fetchImpl, now: NOW, log: () => {} });

describe('runUsageCheck', () => {
  it('stores one row per metric for today and opens no issue when all is well', async () => {
    const { fetchImpl, calls } = fakeApis();
    const result = await run(fetchImpl);

    expect(result.failures).toEqual([]);
    expect(result.opened).toEqual([]);
    expect(result.rows.map((r) => [r.metric, r.level])).toEqual([
      ['netlify_build_minutes', 'ok'],
      ['netlify_bandwidth', 'ok'],
      ['supabase_database_size', 'ok'],
    ]);

    const upsert = calls.find(([m, url]) => m === 'POST' && url.includes('/usage_snapshots'));
    expect(upsert[1]).toContain('on_conflict=metric,taken_on');
    expect(upsert[2].every((r) => r.taken_on === '2026-11-20')).toBe(true);
    expect(calls.some(([, url]) => url.includes('github.com'))).toBe(false);
  });

  it('opens one assigned issue for a limit that is close', async () => {
    const { fetchImpl, calls } = fakeApis({
      buildStatus: () =>
        response(200, [{ minutes: { current: 260, included_minutes: '300', period_start_date: '2026-11-01T00:00:00Z', period_end_date: '2026-12-01T00:00:00Z' } }]),
    });
    const result = await run(fetchImpl);

    expect(result.opened).toEqual(['Free-tier usage: Netlify Build Minutes near the limit (period from 2026-11-01)']);
    const create = calls.find(([m, url]) => m === 'POST' && url.endsWith('/issues'));
    expect(create[2].assignees).toEqual(['example-owner']);
    expect(create[2].body).toContain('260 minutes of 300 minutes');
    // Issues are public; the team slug is the owner's email name.
    expect(create[2].body).not.toContain('test-team');
  });

  it('does not open the issue again in the same period, even if it was closed', async () => {
    const title = 'Free-tier usage: Netlify Build Minutes near the limit (period from 2026-11-01)';
    const { fetchImpl, calls } = fakeApis({
      buildStatus: () =>
        response(200, [{ minutes: { current: 260, included_minutes: '300', period_start_date: '2026-11-01T00:00:00Z', period_end_date: '2026-12-01T00:00:00Z' } }]),
      search: () => response(200, { items: [{ title: `${title} extra words` }, { title, state: 'closed' }] }),
    });
    const result = await run(fetchImpl);

    expect(result.opened).toEqual([]);
    expect(calls.some(([m, url]) => m === 'POST' && url.endsWith('/issues'))).toBe(false);
  });

  it('skips Netlify without a token, as a warning rather than a failure', async () => {
    const { fetchImpl, calls } = fakeApis();
    const result = await run(fetchImpl, { NETLIFY_USAGE_TOKEN: '' });

    expect(result.failures).toEqual([]);
    expect(result.warnings[0]).toMatch(/NETLIFY_USAGE_TOKEN/);
    expect(result.rows.map((r) => r.metric)).toEqual(['supabase_database_size']);
    expect(calls.some(([, url]) => url.includes('netlify.com'))).toBe(false);
  });

  it('fails the run when the Netlify token is refused, but still stores Supabase', async () => {
    const { fetchImpl } = fakeApis({ accounts: () => response(401, { message: 'Access Denied' }) });
    const result = await run(fetchImpl);

    expect(result.failures[0]).toMatch(/Netlify accounts: HTTP 401/);
    expect(result.rows.map((r) => r.metric)).toEqual(['supabase_database_size']);
  });

  it('only warns when the undocumented bandwidth endpoint is missing', async () => {
    const { fetchImpl } = fakeApis({ bandwidth: () => response(404, { message: 'Not Found' }) });
    const result = await run(fetchImpl);

    expect(result.failures).toEqual([]);
    expect(result.warnings.some((w) => /bandwidth: HTTP 404/.test(w))).toBe(true);
    expect(result.rows.map((r) => r.metric)).toEqual(['netlify_build_minutes', 'supabase_database_size']);
  });

  it('fails the run when the database size function is missing', async () => {
    const { fetchImpl } = fakeApis({ dbSize: () => response(404, { code: 'PGRST202' }) });
    const result = await run(fetchImpl);

    expect(result.failures[0]).toMatch(/usage_database_bytes: HTTP 404/);
  });

  it('still stores the database size when its history cannot be read', async () => {
    const { fetchImpl } = fakeApis({ history: () => response(503, { message: 'busy' }) });
    const result = await run(fetchImpl);

    expect(result.failures[0]).toMatch(/usage_snapshots read: HTTP 503/);
    const db = result.rows.find((r) => r.metric === 'supabase_database_size');
    expect(db).toMatchObject({ used: 20 * MB, projected: null, level: 'ok' });
  });

  it('never puts a token in a failure message', async () => {
    const { fetchImpl } = fakeApis({ accounts: () => response(500, { message: 'oops' }) });
    const result = await run(fetchImpl);
    expect(result.failures.join(' ')).not.toMatch(/netlify-token|service-key|gh-token/);
  });
});

describe('Netlify parsing', () => {
  it('reads build minutes from the documented array, or a bare object', () => {
    const minutes = { current: 12, included_minutes: '300', period_start_date: 'a', period_end_date: 'b' };
    expect(buildMinutesReading([{ minutes }])).toMatchObject({ used: 12, limit: 300 });
    expect(buildMinutesReading({ minutes })).toMatchObject({ used: 12, limit: 300 });
    expect(() => buildMinutesReading([])).toThrow(/no minutes/);
  });

  it('prefers the included minutes with packs when present', () => {
    expect(buildMinutesReading([{ minutes: { current: 1, included_minutes: '300', included_minutes_with_packs: '800' } }]).limit).toBe(800);
  });

  it('picks the team by slug, or the only team', () => {
    const teams = [{ id: '1', slug: 'a' }, { id: '2', slug: 'b' }];
    expect(pickAccount(teams, 'b').id).toBe('2');
    expect(pickAccount([teams[0]]).id).toBe('1');
    expect(() => pickAccount(teams)).toThrow(/NETLIFY_ACCOUNT_SLUG/);
    expect(() => pickAccount([])).toThrow(/no teams/);
  });
});
