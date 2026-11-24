import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// The function checks these at load. Never dialled: createClient does not
// connect when constructed, and these tests call no handler.
process.env.SUPABASE_URL ||= 'http://127.0.0.1:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'test-service-key';

const { usageMetrics } = require('../admin-usage.cjs');

const MB = 1024 ** 2;

describe('usageMetrics', () => {
  it('lists every metric, with the newest row for each and null where none', () => {
    const rows = [
      { metric: 'supabase_database_size', taken_on: '2026-11-20', used: String(20 * MB), usage_limit: String(500 * MB), unit: 'bytes', projected: null, level: 'ok' },
      { metric: 'supabase_database_size', taken_on: '2026-11-19', used: String(19 * MB), usage_limit: String(500 * MB), unit: 'bytes', projected: null, level: 'ok' },
    ];
    const metrics = usageMetrics(rows);

    expect(metrics.map((m) => m.metric)).toEqual(['netlify_build_minutes', 'netlify_bandwidth', 'supabase_database_size']);
    expect(metrics[0].snapshot).toBeNull();
    const db = metrics[2];
    expect(db.provider).toBe('Supabase');
    expect(db.snapshot.taken_on).toBe('2026-11-20');
  });

  it('turns NUMERIC strings into numbers and adds display text', () => {
    const [row] = usageMetrics([
      { metric: 'netlify_build_minutes', taken_on: '2026-11-20', used: '40', usage_limit: '300', unit: 'minutes', projected: '120', level: 'ok' },
    ]);
    expect(row.snapshot).toMatchObject({
      used: 40,
      usage_limit: 300,
      projected: 120,
      used_text: '40 minutes',
      limit_text: '300 minutes',
      projected_text: '120 minutes',
    });
  });

  it('links Netlify billing for the team in NETLIFY_TEAM_SLUG, else the Netlify home page', () => {
    const saved = process.env.NETLIFY_TEAM_SLUG;
    try {
      delete process.env.NETLIFY_TEAM_SLUG;
      expect(usageMetrics([])[0].dashboard).toBe('https://app.netlify.com');
      process.env.NETLIFY_TEAM_SLUG = 'test-team';
      expect(usageMetrics([])[0].dashboard).toBe('https://app.netlify.com/teams/test-team/billing/usage');
    } finally {
      if (saved === undefined) delete process.env.NETLIFY_TEAM_SLUG;
      else process.env.NETLIFY_TEAM_SLUG = saved;
    }
  });

  it('keeps a missing projection as null', () => {
    const [row] = usageMetrics([
      { metric: 'netlify_build_minutes', taken_on: '2026-11-20', used: '4', usage_limit: '300', unit: 'minutes', projected: null, level: 'ok' },
    ]);
    expect(row.snapshot.projected).toBeNull();
    expect(row.snapshot.projected_text).toBeNull();
  });
});
