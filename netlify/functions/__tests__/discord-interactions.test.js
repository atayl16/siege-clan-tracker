import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'module';
import { generateKeyPairSync, sign } from 'crypto';

// Real Node require, the way the Lambda runtime loads it.
const require = createRequire(import.meta.url);
const { createHandler, verifyDiscordSignature, voterHash } = require('../discord-interactions.cjs');

const { publicKey, privateKey } = generateKeyPairSync('ed25519');
// Discord gives the raw 32-byte key as hex: the tail of the SPKI DER encoding.
const PUBLIC_KEY_HEX = publicKey.export({ format: 'der', type: 'spki' }).subarray(-32).toString('hex');

const ENV = {
  DISCORD_PUBLIC_KEY: PUBLIC_KEY_HEX,
  DISCORD_BOT_TOKEN: 'bot-token',
  VOTER_HASH_SECRET: 'a'.repeat(64),
};

const USER_ID = '198765432109876543';
const POLL = {
  id: 17,
  question: 'What should our next skill of the week be?',
  options: [{ name: 'Farming', metrics: ['farming'] }, { name: 'Sailing', metrics: ['sailing'] }],
  closes_at: '2026-11-20T19:00:00+00:00',
  discord_channel_id: '111',
  discord_message_id: '222',
};

function signedEvent(interaction, { key = privateKey, timestamp = '1794700000', base64 = false } = {}) {
  const body = JSON.stringify(interaction);
  const signature = sign(null, Buffer.from(timestamp + body), key).toString('hex');
  return {
    httpMethod: 'POST',
    headers: { 'X-Signature-Ed25519': signature, 'X-Signature-Timestamp': timestamp },
    body: base64 ? Buffer.from(body).toString('base64') : body,
    isBase64Encoded: base64,
  };
}

const click = (customId, userId = USER_ID) => ({
  type: 3,
  data: { custom_id: customId, component_type: 2 },
  member: { user: { id: userId, username: 'someone' } },
});

const parse = (res) => JSON.parse(res.body);

function setup(outcome = { result: 'voted', previous: null, counts: [1, 0], poll: POLL }) {
  const castVote = vi.fn(async () => (typeof outcome === 'function' ? outcome() : outcome));
  const updateTally = vi.fn(async () => {});
  const handler = createHandler({ env: ENV, castVote, updateTally });
  return { handler, castVote, updateTally };
}

let logs;
beforeEach(() => {
  logs = [];
  for (const level of ['log', 'error', 'warn', 'info']) {
    vi.spyOn(console, level).mockImplementation((...args) => logs.push(args.join(' ')));
  }
});
afterEach(() => vi.restoreAllMocks());

describe('request verification', () => {
  it('rejects anything but POST', async () => {
    const { handler } = setup();
    expect((await handler({ httpMethod: 'GET', headers: {} })).statusCode).toBe(405);
  });

  it('rejects a missing or wrong signature with 401, as Discord checks on save', async () => {
    const { handler, castVote } = setup();
    const unsigned = { httpMethod: 'POST', headers: {}, body: '{"type":1}' };
    expect((await handler(unsigned)).statusCode).toBe(401);

    const otherKey = generateKeyPairSync('ed25519').privateKey;
    expect((await handler(signedEvent({ type: 1 }, { key: otherKey }))).statusCode).toBe(401);

    const tampered = signedEvent(click('poll:17:0'));
    tampered.body = tampered.body.replace('poll:17:0', 'poll:17:1');
    expect((await handler(tampered)).statusCode).toBe(401);
    expect(castVote).not.toHaveBeenCalled();
  });

  it('answers PING with PONG', async () => {
    const { handler } = setup();
    const res = await handler(signedEvent({ type: 1 }));
    expect(res.statusCode).toBe(200);
    expect(parse(res)).toEqual({ type: 1 });
  });

  it('accepts a base64-encoded body', async () => {
    const { handler } = setup();
    expect(parse(await handler(signedEvent({ type: 1 }, { base64: true })))).toEqual({ type: 1 });
  });

  it('verifyDiscordSignature refuses malformed input instead of throwing', () => {
    expect(verifyDiscordSignature('{}', 'zz', '1', PUBLIC_KEY_HEX)).toBe(false);
    expect(verifyDiscordSignature('{}', 'a'.repeat(128), '1', 'not-hex')).toBe(false);
    expect(verifyDiscordSignature('{}', undefined, '1', PUBLIC_KEY_HEX)).toBe(false);
  });
});

describe('voting', () => {
  it('records a vote anonymously, redraws the tally and replies privately', async () => {
    const { handler, castVote, updateTally } = setup();
    const res = await handler(signedEvent(click('poll:17:0')));

    const [, args] = castVote.mock.calls[0];
    expect(args.pollId).toBe(17);
    expect(args.optionIndex).toBe(0);
    expect(args.voterHash).toMatch(/^[0-9a-f]{64}$/);
    expect(args.voterHash).not.toContain(USER_ID);

    const [, channelId, messageId, message] = updateTally.mock.calls[0];
    expect([channelId, messageId]).toEqual(['111', '222']);
    expect(message.embeds[0].description).toContain('1 vote (100%)');

    const reply = parse(res);
    expect(reply.type).toBe(4);
    expect(reply.data.flags).toBe(64);
    expect(reply.data.content).toContain('Vote recorded: **Farming**');
  });

  it('hashes per poll: same person, same poll matches; another poll does not', () => {
    const secret = ENV.VOTER_HASH_SECRET;
    expect(voterHash(secret, '17', USER_ID)).toBe(voterHash(secret, '17', USER_ID));
    expect(voterHash(secret, '18', USER_ID)).not.toBe(voterHash(secret, '17', USER_ID));
    expect(voterHash(secret, '17', '1')).not.toBe(voterHash(secret, '17', USER_ID));
  });

  it('tells the voter when they changed their vote', async () => {
    const { handler } = setup({ result: 'changed', previous: 0, counts: [0, 1], poll: POLL });
    const reply = parse(await handler(signedEvent(click('poll:17:1'))));
    expect(reply.data.content).toContain('Vote changed to **Sailing** (was Farming)');
  });

  it('clicking your current choice changes nothing and skips the redraw', async () => {
    const { handler, updateTally } = setup({ result: 'unchanged', previous: 0, counts: [1, 0], poll: POLL });
    const reply = parse(await handler(signedEvent(click('poll:17:0'))));
    expect(reply.data.content).toContain("already voted for **Farming**");
    expect(updateTally).not.toHaveBeenCalled();
  });

  it('refuses votes on a closed poll', async () => {
    const { handler, updateTally } = setup({ result: 'closed' });
    const reply = parse(await handler(signedEvent(click('poll:17:0'))));
    expect(reply.data.content).toBe('This poll has closed.');
    expect(updateTally).not.toHaveBeenCalled();
  });

  it('still confirms the vote if the tally redraw fails', async () => {
    const { handler, updateTally } = setup();
    updateTally.mockRejectedValueOnce(new Error('429 rate limited'));
    const reply = parse(await handler(signedEvent(click('poll:17:0'))));
    expect(reply.data.content).toContain('Vote recorded');
  });

  it('replies with an apology, not a 500, if the database call fails', async () => {
    const { handler } = setup(() => { throw new Error('connection reset'); });
    const res = await handler(signedEvent(click('poll:17:0')));
    expect(res.statusCode).toBe(200);
    expect(parse(res).data.content).toMatch(/went wrong/);
  });

  it('refuses to record votes without VOTER_HASH_SECRET rather than store raw IDs', async () => {
    const castVote = vi.fn();
    const handler = createHandler({ env: { ...ENV, VOTER_HASH_SECRET: '' }, castVote, updateTally: vi.fn() });
    const reply = parse(await handler(signedEvent(click('poll:17:0'))));
    expect(reply.data.content).toMatch(/not set up/);
    expect(castVote).not.toHaveBeenCalled();
  });

  it('ignores buttons that are not ours, and preview ids', async () => {
    const { handler, castVote } = setup();
    for (const id of ['something:else', 'poll:preview-sotw:0']) {
      const reply = parse(await handler(signedEvent(click(id))));
      expect(reply.data.content).toBe('This poll is no longer available.');
    }
    expect(castVote).not.toHaveBeenCalled();
  });

  it('accepts a click from a DM-style payload (user instead of member)', async () => {
    const { handler, castVote } = setup();
    await handler(signedEvent({ type: 3, data: { custom_id: 'poll:17:1' }, user: { id: USER_ID } }));
    expect(castVote).toHaveBeenCalledTimes(1);
  });

  it('never logs who voted, even when things go wrong', async () => {
    const hash = voterHash(ENV.VOTER_HASH_SECRET, '17', USER_ID);
    const failing = setup(() => { throw new Error('boom'); });
    await failing.handler(signedEvent(click('poll:17:0')));
    const redrawFails = setup();
    redrawFails.updateTally.mockRejectedValueOnce(new Error('nope'));
    await redrawFails.handler(signedEvent(click('poll:17:0')));

    expect(logs.length).toBeGreaterThan(0);
    for (const line of logs) {
      expect(line).not.toContain(USER_ID);
      expect(line).not.toContain(hash);
    }
  });
});
