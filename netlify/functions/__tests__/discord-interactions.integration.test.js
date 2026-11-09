import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'child_process';
import { createRequire } from 'module';
import { generateKeyPairSync, sign } from 'crypto';

/**
 * The poll vote path against a real database: a signed Discord click, the real
 * handler, the real cast_comp_poll_vote RPC, real rows. The unit tests fake
 * the RPC, so they would pass against SQL that does not work.
 *
 * Also proves the anonymity and lockdown the migration promises: only hashes
 * are stored, and the anon key can neither read polls or votes nor call the
 * vote function.
 *
 * Requires the local Supabase stack (`supabase start`). Skips when it is not
 * running; the smoke workflow runs it in CI.
 */

const require = createRequire(import.meta.url);

function localStack() {
  try {
    const out = execFileSync('supabase', ['status', '-o', 'env'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const env = Object.fromEntries(
      out
        .split('\n')
        .map((line) => line.match(/^([A-Z_]+)="?([^"]*)"?$/))
        .filter(Boolean)
        .map((m) => [m[1], m[2]])
    );
    if (!env.API_URL || !env.SERVICE_ROLE_KEY || !env.ANON_KEY) return null;
    return env;
  } catch {
    return null;
  }
}

const stack = localStack();

describe.skipIf(!stack)('poll voting against a real database', () => {
  const { createClient } = require('@supabase/supabase-js');
  const { createStore } = require('../../../scripts/comp-polls/store.cjs');
  const { createHandler, voterHash } = require('../discord-interactions.cjs');

  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const PUBLIC_KEY_HEX = publicKey.export({ format: 'der', type: 'spki' }).subarray(-32).toString('hex');
  const SECRET = 'integration-test-secret-'.padEnd(64, 'x');
  const USER_A = '300000000000000001';
  const USER_B = '300000000000000002';

  let admin;
  let anon;
  let store;
  let handler;
  let poll;
  const redraws = [];
  const createdIds = [];

  const click = (pollId, optionIndex, userId) => {
    const body = JSON.stringify({
      type: 3,
      data: { custom_id: `poll:${pollId}:${optionIndex}` },
      member: { user: { id: userId } },
    });
    const timestamp = String(Math.floor(Date.now() / 1000));
    return {
      httpMethod: 'POST',
      headers: {
        'x-signature-ed25519': sign(null, Buffer.from(timestamp + body), privateKey).toString('hex'),
        'x-signature-timestamp': timestamp,
      },
      body,
    };
  };
  const vote = async (...args) => JSON.parse((await handler(click(...args))).body).data.content;

  const newPoll = async (overrides = {}) => {
    const now = Date.now();
    const row = await store.insertPoll({
      week_start: '2099-01-05',
      category: 'sotw',
      is_test: true,
      question: 'What should our next skill of the week be?',
      options: [
        { name: 'Farming', metrics: ['farming'] },
        { name: 'Sailing', metrics: ['sailing'] },
        { name: 'Prayer', metrics: ['prayer'] },
      ],
      opens_at: new Date(now - 60_000).toISOString(),
      closes_at: new Date(now + 60 * 60_000).toISOString(),
      competition_starts_at: '2099-01-05T19:00:00Z',
      competition_ends_at: '2099-01-12T19:00:00Z',
      discord_channel_id: 'chan-1',
      ...overrides,
    });
    createdIds.push(row.id);
    return store.updatePoll(row.id, { status: 'open', discord_message_id: `msg-${row.id}` });
  };

  beforeAll(async () => {
    admin = createClient(stack.API_URL, stack.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    anon = createClient(stack.API_URL, stack.ANON_KEY, { auth: { persistSession: false } });
    store = createStore(admin);
    handler = createHandler({
      env: {
        DISCORD_PUBLIC_KEY: PUBLIC_KEY_HEX,
        VOTER_HASH_SECRET: SECRET,
        SUPABASE_URL: stack.API_URL,
        SUPABASE_SERVICE_ROLE_KEY: stack.SERVICE_ROLE_KEY,
      },
      updateTally: async (env, channelId, messageId, message) => {
        redraws.push({ channelId, messageId, message });
      },
    });
    poll = await newPoll();
  });

  afterAll(async () => {
    if (admin && createdIds.length) await admin.from('comp_polls').delete().in('id', createdIds);
  });

  it('records, changes and refuses votes through the real RPC', async () => {
    expect(await vote(poll.id, 0, USER_A)).toContain('Vote recorded: **Farming**');
    expect(await vote(poll.id, 0, USER_A)).toContain('already voted for **Farming**');
    expect(await vote(poll.id, 2, USER_A)).toContain('Vote changed to **Prayer** (was Farming)');
    expect(await vote(poll.id, 2, USER_B)).toContain('Vote recorded: **Prayer**');

    expect(await store.voteCounts(poll.id, 3)).toEqual([0, 0, 2]);

    const last = redraws.at(-1);
    expect(last.messageId).toBe(`msg-${poll.id}`);
    expect(last.message.embeds[0].description).toContain('2 votes so far');
  });

  it('stores only per-poll hashes, never Discord IDs', async () => {
    const { data } = await admin.from('comp_poll_votes').select('*').eq('poll_id', poll.id);
    expect(data.map((r) => r.voter_hash).sort()).toEqual(
      [voterHash(SECRET, String(poll.id), USER_A), voterHash(SECRET, String(poll.id), USER_B)].sort()
    );
    expect(JSON.stringify(data)).not.toContain(USER_A);
    expect(Object.keys(data[0]).sort()).toEqual(['option_index', 'poll_id', 'voter_hash']);
  });

  it('refuses bad options, unknown polls, and anything after closing', async () => {
    expect(await vote(poll.id, 4, USER_A)).toBe('This poll is no longer available.');
    expect(await vote(999999999, 0, USER_A)).toBe('This poll is no longer available.');

    const closed = await newPoll({
      opens_at: new Date(Date.now() - 120_000).toISOString(),
      closes_at: new Date(Date.now() - 60_000).toISOString(),
    });
    expect(await vote(closed.id, 0, USER_A)).toBe('This poll has closed.');

    await store.updatePoll(poll.id, { status: 'closed' });
    expect(await vote(poll.id, 1, USER_A)).toBe('This poll has closed.');
    expect(await store.voteCounts(poll.id, 3)).toEqual([0, 0, 2]);
    await store.updatePoll(poll.id, { status: 'open' });
  });

  it('keeps the anon key out entirely', async () => {
    const rpc = await anon.rpc('cast_comp_poll_vote', { p_poll_id: poll.id, p_voter_hash: 'a'.repeat(64), p_option_index: 0 });
    expect(rpc.error).toBeTruthy();

    const polls = await anon.from('comp_polls').select('*');
    expect(polls.data ?? []).toEqual([]);
    const votes = await anon.from('comp_poll_votes').select('*');
    expect(votes.data ?? []).toEqual([]);
  });

  it('allows one real poll per category per week, any number of test polls', async () => {
    const real = {
      week_start: '2099-02-02',
      category: 'botw',
      is_test: false,
      question: 'Boss?',
      options: [{ name: 'Obor', metrics: ['obor'] }],
      opens_at: '2099-01-26T19:00:00Z',
      closes_at: '2099-01-30T19:00:00Z',
      competition_starts_at: '2099-02-02T19:00:00Z',
      competition_ends_at: '2099-02-09T19:00:00Z',
      discord_channel_id: 'chan-1',
    };
    const first = await store.insertPoll(real);
    createdIds.push(first.id);
    expect(await store.insertPoll(real)).toBeNull();

    const t1 = await store.insertPoll({ ...real, is_test: true });
    const t2 = await store.insertPoll({ ...real, is_test: true });
    createdIds.push(t1.id, t2.id);
    expect(t1.id).not.toBe(t2.id);

    expect((await store.pollsForWeek('2099-02-02')).map((p) => p.id)).toEqual([first.id]);
    expect((await store.pollBatch(t1)).map((p) => p.id)).toEqual([t1.id, t2.id]);
  });

  it('finds unfinished polls past their closing time', async () => {
    const due = await store.unfinishedPolls(new Date('2099-01-31T00:00:00Z'));
    const ids = due.map((p) => p.id);
    expect(ids).toContain(poll.id); // open, closes long before 2099-01-31
    for (const p of due) expect(['open', 'closed', 'created']).toContain(p.status);
  });
});
