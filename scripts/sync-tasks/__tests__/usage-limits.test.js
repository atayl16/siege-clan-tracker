// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const {
  projectCumulative,
  projectGauge,
  levelFor,
  evaluate,
  formatAmount,
  issueTitle,
  issueBody,
  dashboardUrl,
  METRICS,
} = require('../usage-limits.cjs');

const MB = 1024 ** 2;
const GB = 1024 ** 3;

// A 30-day period, 1 to 31 November.
const period = { periodStart: '2026-11-01T00:00:00Z', periodEnd: '2026-12-01T00:00:00Z' };
const day = (n) => new Date(Date.UTC(2026, 10, 1 + n));

describe('projectCumulative', () => {
  it('scales the daily rate so far to the whole period', () => {
    expect(projectCumulative({ used: 100, ...period, now: day(10) })).toBeCloseTo(300);
  });

  it('gives no projection in the first days, when a busy day would dominate', () => {
    expect(projectCumulative({ used: 30, ...period, now: day(4) })).toBeNull();
    expect(projectCumulative({ used: 30, ...period, now: day(5) })).toBeCloseTo(180);
  });

  it('returns the figure itself once the period is over', () => {
    expect(projectCumulative({ used: 250, ...period, now: day(31) })).toBe(250);
  });

  it('gives no projection without period dates', () => {
    expect(projectCumulative({ used: 10, now: day(10) })).toBeNull();
    expect(projectCumulative({ used: 10, periodStart: period.periodStart, now: day(10) })).toBeNull();
  });
});

describe('projectGauge', () => {
  it('projects 30 days ahead from growth since the oldest reading', () => {
    const history = [
      { taken_on: '2026-11-01', used: 100 },
      { taken_on: '2026-11-06', used: 105 },
    ];
    // 10 over 10 days is 1 a day, so 110 + 30.
    expect(projectGauge({ used: 110, now: day(10), history })).toBeCloseTo(140);
  });

  it('needs at least 5 days of history', () => {
    expect(projectGauge({ used: 110, now: day(10), history: [{ taken_on: '2026-11-08', used: 100 }] })).toBeNull();
    expect(projectGauge({ used: 110, now: day(10), history: [] })).toBeNull();
  });

  it('never projects a shrinking gauge downwards', () => {
    expect(projectGauge({ used: 90, now: day(10), history: [{ taken_on: '2026-11-01', used: 100 }] })).toBe(90);
  });
});

describe('levelFor', () => {
  const limit = 300;

  it('is ok well inside the limit', () => {
    expect(levelFor({ used: 100, limit, projected: 200 })).toBe('ok');
    expect(levelFor({ used: 100, limit, projected: null })).toBe('ok');
  });

  it('watches at 50% used', () => {
    expect(levelFor({ used: 150, limit, projected: null })).toBe('watch');
  });

  it('watches when on course for 80%', () => {
    expect(levelFor({ used: 60, limit, projected: 240 })).toBe('watch');
    expect(levelFor({ used: 60, limit, projected: 239 })).toBe('ok');
  });

  it('is a problem at 80% used', () => {
    expect(levelFor({ used: 240, limit, projected: null })).toBe('problem');
  });

  it('is a problem when on course to pass the limit', () => {
    expect(levelFor({ used: 100, limit, projected: 300 })).toBe('problem');
  });
});

describe('evaluate', () => {
  it('builds the stored row, with the provider limit and period', () => {
    const row = evaluate({ metric: 'netlify_build_minutes', used: 120, limit: 300, ...period }, day(10));
    expect(row).toEqual({
      metric: 'netlify_build_minutes',
      used: 120,
      usage_limit: 300,
      unit: 'minutes',
      period_start: '2026-11-01',
      period_end: '2026-12-01',
      projected: 360,
      level: 'problem',
    });
  });

  it('falls back to the plan limit when the provider gives none', () => {
    const row = evaluate({ metric: 'netlify_bandwidth', used: 2 * GB, ...period }, day(10));
    expect(row.usage_limit).toBe(100 * GB);
    expect(row.level).toBe('ok');
  });

  it('projects a gauge from history', () => {
    const row = evaluate(
      { metric: 'supabase_database_size', used: 300 * MB },
      day(10),
      [{ taken_on: '2026-11-01', used: 200 * MB }],
    );
    // 10 MB a day for 30 more days: 600 MB, over 500.
    expect(row.projected).toBe(600 * MB);
    expect(row.level).toBe('problem');
    expect(row.period_start).toBeNull();
  });

  it('refuses an unknown metric or an unreadable figure', () => {
    expect(() => evaluate({ metric: 'nope', used: 1 }, day(1))).toThrow(/Unknown/);
    expect(() => evaluate({ metric: 'netlify_build_minutes', used: undefined }, day(1))).toThrow(/unreadable/);
    expect(() => evaluate({ metric: 'netlify_build_minutes', used: -1 }, day(1))).toThrow(/unreadable/);
  });
});

describe('formatAmount', () => {
  it('shows bytes as MB or GB and minutes as minutes', () => {
    expect(formatAmount(12 * MB, 'bytes')).toBe('12 MB');
    expect(formatAmount(1.44 * GB, 'bytes')).toBe('1.4 GB');
    expect(formatAmount(1234, 'minutes')).toBe('1,234 minutes');
  });
});

describe('issues', () => {
  const row = evaluate({ metric: 'netlify_build_minutes', used: 250, limit: 300, ...period }, day(20));

  it('titles a cumulative metric by its billing period', () => {
    expect(issueTitle(row, day(20))).toBe(
      'Free-tier usage: Netlify Build Minutes near the limit (period from 2026-11-01)',
    );
  });

  it('titles a gauge by calendar month', () => {
    const gauge = evaluate({ metric: 'supabase_database_size', used: 450 * MB }, day(20));
    expect(issueTitle(gauge, day(20))).toBe(
      'Free-tier usage: Supabase Database Size near the limit (period from 2026-11)',
    );
  });

  it('gives the figures, the projection, the usage page and what is not checked', () => {
    const body = issueBody(row);
    expect(body).toContain('250 minutes of 300 minutes (83%)');
    expect(body).toContain('375 minutes (125%) by 2026-12-01');
    expect(body).toContain('https://app.netlify.com (Usage & Billing)');
    expect(body).toContain('Supabase egress');
  });

  it('links the team billing page when the slug is known, the Netlify home page when not', () => {
    expect(dashboardUrl(METRICS.netlify_bandwidth, 'test-team')).toBe('https://app.netlify.com/teams/test-team/billing/usage');
    expect(dashboardUrl(METRICS.netlify_bandwidth, null)).toBe('https://app.netlify.com');
    expect(dashboardUrl(METRICS.supabase_database_size, 'test-team')).toBe('https://supabase.com/dashboard/org/_/usage');
  });
});
