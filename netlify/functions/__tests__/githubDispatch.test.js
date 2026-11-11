import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const require = createRequire(import.meta.url);
const { dispatchWorkflow, scheduledDispatch } = require('../utils/githubDispatch.cjs');

const ok = () => vi.fn(async () => ({ status: 204, text: async () => '' }));

describe('dispatchWorkflow', () => {
  it('asks GitHub to run the workflow on main with the token', async () => {
    const fetchImpl = ok();
    const result = await dispatchWorkflow({ workflow: 'hourly-clan-sync.yml', token: 'tok', repo: 'o/r', fetchImpl });

    expect(result).toEqual({ started: true });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://api.github.com/repos/o/r/actions/workflows/hourly-clan-sync.yml/dispatches');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer tok');
    expect(init.headers.Accept).toBe('application/vnd.github+json');
    expect(JSON.parse(init.body)).toEqual({ ref: 'main' });
  });

  it('does nothing, and says why, when no token is set', async () => {
    const fetchImpl = ok();
    const result = await dispatchWorkflow({ workflow: 'x.yml', token: '', fetchImpl });
    expect(result).toEqual({ started: false, reason: 'GITHUB_DISPATCH_TOKEN is not set' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('throws when GitHub refuses, with its status and message', async () => {
    const fetchImpl = vi.fn(async () => ({ status: 403, text: async () => 'Resource not accessible by personal access token' }));
    await expect(dispatchWorkflow({ workflow: 'x.yml', token: 't', fetchImpl })).rejects.toThrow(
      'GitHub refused to start x.yml: 403 Resource not accessible by personal access token'
    );
  });

  it('gives up when GitHub does not answer in time', async () => {
    const fetchImpl = vi.fn((_url, { signal }) => new Promise((_r, reject) => {
      signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
    }));
    await expect(dispatchWorkflow({ workflow: 'x.yml', token: 't', fetchImpl, timeoutMs: 20 })).rejects.toThrow(
      'GitHub did not answer within 20ms when starting x.yml'
    );
  });
});

describe('scheduled functions', () => {
  it('log and return without failing when the token is missing', async () => {
    const before = process.env.GITHUB_DISPATCH_TOKEN;
    delete process.env.GITHUB_DISPATCH_TOKEN;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const res = await scheduledDispatch('daily-clan-sync.yml')();
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toMatchObject({ workflow: 'daily-clan-sync.yml', started: false });
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
    if (before !== undefined) process.env.GITHUB_DISPATCH_TOKEN = before;
  });

  it('are scheduled in netlify.toml, for workflows that accept a dispatch', () => {
    const root = resolve(__dirname, '../../..');
    const toml = readFileSync(resolve(root, 'netlify.toml'), 'utf8');
    const schedules = {
      'scheduled-hourly-sync': ['17 * * * *', 'hourly-clan-sync.yml'],
      'scheduled-daily-sync': ['43 13 * * *', 'daily-clan-sync.yml'],
    };
    for (const [fn, [cron, workflow]] of Object.entries(schedules)) {
      expect(toml).toContain(`[functions."${fn}"]\n  schedule = "${cron}"`);
      const source = readFileSync(resolve(root, `netlify/functions/${fn}.cjs`), 'utf8');
      expect(source).toContain(`scheduledDispatch('${workflow}')`);
      const yml = readFileSync(resolve(root, `.github/workflows/${workflow}`), 'utf8');
      expect(yml).toMatch(/^\s+workflow_dispatch:/m);
      expect(yml).toMatch(/^concurrency:/m);
    }
  });
});
