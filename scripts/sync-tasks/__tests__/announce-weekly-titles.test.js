// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { announceWeeklyTitles, parseMode, STALE_CLAIM_MS } = require('../announce-weekly-titles.cjs');

const W9 = '2026-11-09T19:00:00+00:00';
const W16 = '2026-11-16T19:00:00+00:00';
// Monday 16 Nov, 19:17 UK: the week of 9-16 Nov has just been awarded.
const NOW = new Date('2026-11-16T19:17:00Z');
const quiet = () => {};

/**
 * The discord_announcements table in memory: a small query builder covering
 * the calls the job makes (insert/select/update/delete with eq, is, lt), and
 * the table's unique (kind, week_start).
 */
function announcementsTable(rows, { failDelete }) {
  let nextId = 100;
  return () => {
    const filters = [];
    let op = 'select';
    let payload = null;
    const matches = (r) => filters.every((f) => f(r));
    const run = () => {
      if (op === 'insert') {
        if (rows.some((r) => r.kind === payload.kind && r.week_start === payload.week_start)) {
          return { data: null, error: { code: '23505', message: 'duplicate key' } };
        }
        const saved = { id: nextId++, message_id: null, ...payload };
        rows.push(saved);
        return { data: [saved], error: null };
      }
      if (op === 'delete') {
        if (failDelete) return { data: null, error: { message: 'delete failed' } };
        const gone = rows.filter(matches);
        rows.splice(0, rows.length, ...rows.filter((r) => !matches(r)));
        return { data: gone, error: null };
      }
      const hit = rows.filter(matches);
      if (op === 'update') hit.forEach((r) => Object.assign(r, payload));
      return { data: hit.map((r) => ({ ...r })), error: null };
    };
    const q = {
      insert: (row) => ((op = 'insert'), (payload = row), q),
      update: (patch) => ((op = 'update'), (payload = patch), q),
      delete: () => ((op = 'delete'), q),
      select: () => q,
      eq: (col, v) => (filters.push((r) => r[col] === v), q),
      is: (col, v) => (filters.push((r) => r[col] === v), q),
      lt: (col, v) => (filters.push((r) => new Date(r[col]) < new Date(v)), q),
      single: async () => {
        const { data, error } = run();
        return { data: data?.[0] ?? null, error };
      },
      maybeSingle: async () => {
        const { data, error } = run();
        return { data: data?.[0] ?? null, error };
      },
      then: (resolve, reject) => Promise.resolve(run()).then(resolve, reject),
    };
    return q;
  };
}

/** Supabase stand-in for the four tables the job touches. */
function fakeSupabase({
  weeks = [{ week_start: W9, week_end: W16 }],
  gainer = [{ player_name: 'OakSmasher', placement: 1, xp_gained: 16310000 }],
  awards = [{ title: 'warrior', player_name: 'dusk owl', placement: 1, value: 8.47 }],
  announced = [],
  failDelete = false,
} = {}) {
  const table = { announced: announced.map((r) => ({ ...r })) };
  const announcements = announcementsTable(table.announced, { failDelete });

  const from = (name) => {
    if (name === 'weekly_title_weeks') {
      return { select: () => ({ order: () => ({ limit: async () => ({ data: weeks, error: null }) }) }) };
    }
    if (name === 'xp_awards') return { select: () => ({ eq: async () => ({ data: gainer, error: null }) }) };
    if (name === 'weekly_title_awards') return { select: () => ({ eq: async () => ({ data: awards, error: null }) }) };
    if (name === 'discord_announcements') return announcements();
    throw new Error(`unexpected table ${name}`);
  };

  return { from, table };
}

/** A Discord error with a status: Discord answered and refused the post. */
const refused = (status) => Object.assign(new Error(`Discord POST returned ${status}`), { status });

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
    expect(message.embeds[0].title).toBe("Last week's champions · 9 to 16 Nov");
    expect(supabase.table.announced).toEqual([
      { id: 100, kind: 'weekly_titles', week_start: W9, channel_id: 'live', claimed_at: NOW.toISOString(), message_id: 'msg-1' },
    ]);
  });

  it('posts a week only once, and a run that skips makes no Discord calls', async () => {
    const supabase = fakeSupabase();
    const postMessage = poster();
    const getEmojis = vi.fn(async () => []);

    await announceWeeklyTitles({ ...base, supabase, postMessage, getEmojis });
    const second = await announceWeeklyTitles({ ...base, supabase, postMessage, getEmojis });

    expect(second.status).toBe('skipped');
    expect(postMessage).toHaveBeenCalledTimes(1);
    expect(getEmojis).toHaveBeenCalledTimes(1);
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

  it('gives the week back when Discord refuses the post, so a later run retries', async () => {
    const supabase = fakeSupabase();
    const failing = vi.fn(async () => {
      throw refused(403);
    });

    await expect(announceWeeklyTitles({ ...base, supabase, postMessage: failing })).rejects.toThrow('403');
    expect(supabase.table.announced).toEqual([]);

    const postMessage = poster();
    const retry = await announceWeeklyTitles({ ...base, supabase, postMessage });
    expect(retry.status).toBe('posted');
  });

  it('still fails the run, and says how to retry, when the claim cannot be released', async () => {
    const supabase = fakeSupabase({ failDelete: true });
    const log = vi.fn();
    const failing = vi.fn(async () => {
      throw refused(403);
    });

    await expect(announceWeeklyTitles({ ...base, log, supabase, postMessage: failing })).rejects.toThrow('403');
    expect(log.mock.calls.flat().join('\n')).toMatch(/Delete that row to retry/);
  });

  it('keeps the claim on a Discord server error, which may still have posted', async () => {
    const supabase = fakeSupabase();
    const failing = vi.fn(async () => {
      throw refused(502);
    });

    await expect(announceWeeklyTitles({ ...base, supabase, postMessage: failing })).rejects.toThrow('502');
    expect(supabase.table.announced).toHaveLength(1);
    expect(supabase.table.announced[0].message_id).toBeNull();
  });

  it('keeps the claim when Discord does not answer, so the week is never posted twice', async () => {
    const supabase = fakeSupabase();
    const log = vi.fn();
    const lost = vi.fn(async () => {
      throw Object.assign(new Error('The operation was aborted due to timeout'), { name: 'TimeoutError' });
    });

    await expect(announceWeeklyTitles({ ...base, log, supabase, postMessage: lost })).rejects.toThrow('timeout');
    expect(supabase.table.announced).toHaveLength(1);
    expect(supabase.table.announced[0].message_id).toBeNull();
    expect(log.mock.calls.flat().join('\n')).toMatch(/may or may not have posted/);

    const postMessage = poster();
    const later = await announceWeeklyTitles({ ...base, supabase, postMessage, now: new Date(NOW.getTime() + 3600e3) });
    expect(later.status).toBe('skipped');
    expect(later.reason).toMatch(/unfinished post/);
    expect(postMessage).not.toHaveBeenCalled();
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
    expect(log.mock.calls.flat().join('\n')).toContain("Last week's champions · 9 to 16 Nov");
    expect(postMessage).not.toHaveBeenCalled();
    expect(supabase.table.announced).toEqual([]);
  });

  it('test posts to the test channel every time and never records', async () => {
    const supabase = fakeSupabase({ announced: [{ id: 9, kind: 'weekly_titles', week_start: W9, message_id: 'm' }] });
    const postMessage = poster();
    const old = new Date('2026-12-20T12:00:00Z');

    await announceWeeklyTitles({ ...base, supabase, postMessage, mode: 'test', now: old });
    await announceWeeklyTitles({ ...base, supabase, postMessage, mode: 'test', now: old });

    expect(postMessage.mock.calls.map(([channel]) => channel)).toEqual(['test', 'test']);
    expect(supabase.table.announced).toHaveLength(1);
  });

  it("uses the title emojis of the channel's server, and posts without them if they cannot be read", async () => {
    const postMessage = poster();
    const getEmojis = vi.fn(async () => [{ id: '111', name: 'title_warrior' }]);
    await announceWeeklyTitles({ ...base, supabase: fakeSupabase(), postMessage, getEmojis, mode: 'test' });
    expect(getEmojis).toHaveBeenCalledWith('test');
    expect(postMessage.mock.calls[0][1].embeds[0].description).toContain('<:title_warrior:111> **The Warrior**');

    const log = vi.fn();
    const failing = vi.fn(async () => {
      throw new Error('Discord GET returned 403');
    });
    const result = await announceWeeklyTitles({ ...base, log, supabase: fakeSupabase(), postMessage, getEmojis: failing, mode: 'test' });
    expect(result.status).toBe('posted');
    expect(postMessage.mock.calls[1][1].embeds[0].description).toContain('**The Warrior** · dusk owl');
    expect(log.mock.calls.flat().join('\n')).toMatch(/without title icons/);
  });

  it('test fails when the test channel is not configured', async () => {
    await expect(
      announceWeeklyTitles({ ...base, testChannelId: undefined, supabase: fakeSupabase(), postMessage: poster(), mode: 'test' })
    ).rejects.toThrow('DISCORD_TEST_CHANNEL_ID');
  });

  it('post takes over an unfinished claim once it is 10 minutes old', async () => {
    const claimedAt = NOW.toISOString();
    const supabase = fakeSupabase({
      announced: [{ id: 7, kind: 'weekly_titles', week_start: W9, channel_id: 'live', claimed_at: claimedAt, message_id: null }],
    });
    const postMessage = poster();

    const tooSoon = await announceWeeklyTitles({
      ...base, supabase, postMessage, mode: 'post', now: new Date(NOW.getTime() + STALE_CLAIM_MS - 1000),
    });
    expect(tooSoon.status).toBe('skipped');
    expect(tooSoon.reason).toMatch(/right now/);
    expect(postMessage).not.toHaveBeenCalled();

    const later = new Date(NOW.getTime() + STALE_CLAIM_MS + 1000);
    const taken = await announceWeeklyTitles({ ...base, supabase, postMessage, mode: 'post', now: later });
    expect(taken.status).toBe('posted');
    expect(supabase.table.announced).toEqual([
      { id: 7, kind: 'weekly_titles', week_start: W9, channel_id: 'live', claimed_at: later.toISOString(), message_id: 'msg-1' },
    ]);
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
    for (const inherited of ['toString', 'constructor', '__proto__', 'hasOwnProperty']) {
      expect(() => parseMode([inherited])).toThrow('Unknown argument');
    }
  });
});
