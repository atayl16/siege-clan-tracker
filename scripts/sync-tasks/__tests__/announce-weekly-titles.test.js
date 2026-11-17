// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { announceWeeklyTitles, parseMode } = require('../announce-weekly-titles.cjs');

const W9 = '2026-11-09T19:00:00+00:00';
const W16 = '2026-11-16T19:00:00+00:00';
// Monday 16 Nov, 19:17 UK: the week of 9-16 Nov has just been awarded.
const NOW = new Date('2026-11-16T19:17:00Z');
const quiet = () => {};

/**
 * Supabase stand-in for the four tables the job touches. `announced` is the
 * discord_announcements table; insert enforces its unique (kind, week_start).
 */
function fakeSupabase({
  weeks = [{ week_start: W9, week_end: W16 }],
  gainer = [{ player_name: 'FinPunisher', placement: 1, xp_gained: 16310000 }],
  awards = [{ title: 'warrior', player_name: 'noon air', placement: 1, value: 8.47 }],
  announced = [],
  failDelete = false,
} = {}) {
  const table = { announced: [...announced] };
  let nextId = 1;

  const from = (name) => {
    if (name === 'weekly_title_weeks') {
      return { select: () => ({ order: () => ({ limit: async () => ({ data: weeks, error: null }) }) }) };
    }
    if (name === 'xp_awards') return { select: () => ({ eq: async () => ({ data: gainer, error: null }) }) };
    if (name === 'weekly_title_awards') return { select: () => ({ eq: async () => ({ data: awards, error: null }) }) };
    if (name === 'discord_announcements') {
      return {
        insert: (row) => ({
          select: () => ({
            single: async () => {
              if (table.announced.some((r) => r.kind === row.kind && r.week_start === row.week_start)) {
                return { data: null, error: { code: '23505', message: 'duplicate key' } };
              }
              const saved = { id: nextId++, message_id: null, ...row };
              table.announced.push(saved);
              return { data: { id: saved.id }, error: null };
            },
          }),
        }),
        delete: () => ({
          eq: async (_col, id) => {
            if (failDelete) return { error: { message: 'delete failed' } };
            table.announced = table.announced.filter((r) => r.id !== id);
            return { error: null };
          },
        }),
        update: (patch) => ({
          eq: async (_col, id) => {
            Object.assign(table.announced.find((r) => r.id === id), patch);
            return { error: null };
          },
        }),
      };
    }
    throw new Error(`unexpected table ${name}`);
  };

  return { from, table };
}

const poster = () => vi.fn(async () => ({ id: 'msg-1' }));
const base = { liveChannelId: 'live', testChannelId: 'test', now: NOW, log: quiet };

describe('announceWeeklyTitles, hourly', () => {
  it('posts the newly awarded week to the live channel and records it', async () => {
    const supabase = fakeSupabase();
    const postMessage = poster();

    const result = await announceWeeklyTitles({ ...base, supabase, postMessage });

    expect(result).toEqual({ status: 'posted', messageId: 'msg-1' });
    const [channel, message] = postMessage.mock.calls[0];
    expect(channel).toBe('live');
    expect(message.embeds[0].title).toBe('Weekly titles · 9 to 16 Nov');
    expect(supabase.table.announced).toEqual([
      { id: 1, kind: 'weekly_titles', week_start: W9, channel_id: 'live', message_id: 'msg-1' },
    ]);
  });

  it('posts a week only once', async () => {
    const supabase = fakeSupabase();
    const postMessage = poster();

    await announceWeeklyTitles({ ...base, supabase, postMessage });
    const second = await announceWeeklyTitles({ ...base, supabase, postMessage });

    expect(second.status).toBe('skipped');
    expect(postMessage).toHaveBeenCalledTimes(1);
  });

  it('waits until The Gainer is awarded too', async () => {
    const supabase = fakeSupabase({ gainer: [] });
    const postMessage = poster();

    const result = await announceWeeklyTitles({ ...base, supabase, postMessage });

    expect(result.status).toBe('skipped');
    expect(result.reason).toMatch(/Gainer/);
    expect(postMessage).not.toHaveBeenCalled();
    expect(supabase.table.announced).toEqual([]);
  });

  it('does nothing before any week is awarded', async () => {
    const postMessage = poster();
    const result = await announceWeeklyTitles({ ...base, supabase: fakeSupabase({ weeks: [] }), postMessage });
    expect(result.status).toBe('skipped');
    expect(postMessage).not.toHaveBeenCalled();
  });

  it('never posts a week that ended more than 7 days ago', async () => {
    const supabase = fakeSupabase();
    const postMessage = poster();

    const result = await announceWeeklyTitles({ ...base, supabase, postMessage, now: new Date('2026-11-23T19:30:00Z') });

    expect(result.status).toBe('skipped');
    expect(result.reason).toMatch(/more than 7 days/);
    expect(postMessage).not.toHaveBeenCalled();
    expect(supabase.table.announced).toEqual([]);
  });

  it('gives the week back when Discord fails, so a later run retries', async () => {
    const supabase = fakeSupabase();
    const failing = vi.fn(async () => {
      throw new Error('Discord POST returned 500');
    });

    await expect(announceWeeklyTitles({ ...base, supabase, postMessage: failing })).rejects.toThrow('500');
    expect(supabase.table.announced).toEqual([]);

    const postMessage = poster();
    const retry = await announceWeeklyTitles({ ...base, supabase, postMessage });
    expect(retry.status).toBe('posted');
  });

  it('still fails the run, and says how to retry, when the claim cannot be released', async () => {
    const supabase = fakeSupabase({ failDelete: true });
    const log = vi.fn();
    const failing = vi.fn(async () => {
      throw new Error('Discord POST returned 403');
    });

    await expect(announceWeeklyTitles({ ...base, log, supabase, postMessage: failing })).rejects.toThrow('403');
    expect(log.mock.calls.flat().join('\n')).toMatch(/Delete that row to retry/);
  });

  it('fails when the live channel is not configured', async () => {
    await expect(
      announceWeeklyTitles({ ...base, liveChannelId: undefined, supabase: fakeSupabase(), postMessage: poster() })
    ).rejects.toThrow('DISCORD_POLLS_CHANNEL_ID');
  });
});

describe('announceWeeklyTitles, by hand', () => {
  it('preview prints the message and posts nothing', async () => {
    const supabase = fakeSupabase();
    const postMessage = poster();
    const log = vi.fn();

    const result = await announceWeeklyTitles({ ...base, log, supabase, postMessage, mode: 'preview' });

    expect(result.status).toBe('preview');
    expect(log.mock.calls.flat().join('\n')).toContain('Weekly titles · 9 to 16 Nov');
    expect(postMessage).not.toHaveBeenCalled();
    expect(supabase.table.announced).toEqual([]);
  });

  it('test posts to the test channel every time and never records', async () => {
    const supabase = fakeSupabase({ announced: [{ id: 9, kind: 'weekly_titles', week_start: W9 }] });
    const postMessage = poster();
    const old = new Date('2026-12-20T12:00:00Z');

    await announceWeeklyTitles({ ...base, supabase, postMessage, mode: 'test', now: old });
    await announceWeeklyTitles({ ...base, supabase, postMessage, mode: 'test', now: old });

    expect(postMessage.mock.calls.map(([channel]) => channel)).toEqual(['test', 'test']);
    expect(supabase.table.announced).toHaveLength(1);
  });

  it('test fails when the test channel is not configured', async () => {
    await expect(
      announceWeeklyTitles({ ...base, testChannelId: undefined, supabase: fakeSupabase(), postMessage: poster(), mode: 'test' })
    ).rejects.toThrow('DISCORD_TEST_CHANNEL_ID');
  });

  it('post sends a missed week however old, but still only once', async () => {
    const supabase = fakeSupabase();
    const postMessage = poster();
    const later = new Date('2026-12-01T12:00:00Z');

    const first = await announceWeeklyTitles({ ...base, supabase, postMessage, mode: 'post', now: later });
    const again = await announceWeeklyTitles({ ...base, supabase, postMessage, mode: 'post', now: later });

    expect(first.status).toBe('posted');
    expect(again.status).toBe('skipped');
    expect(postMessage).toHaveBeenCalledTimes(1);
  });
});

describe('parseMode', () => {
  it('reads one flag, or none for the hourly run', () => {
    expect(parseMode([])).toBe('auto');
    expect(parseMode(['--preview'])).toBe('preview');
    expect(parseMode(['--test'])).toBe('test');
    expect(parseMode(['--post'])).toBe('post');
  });

  it('rejects anything else', () => {
    expect(() => parseMode(['--live'])).toThrow('Unknown argument');
    expect(() => parseMode(['--test', '--post'])).toThrow('at most one');
  });
});
