/**
 * Discord Interactions Endpoint for the weekly SotW / BotW / RotW poll buttons.
 *
 * Discord POSTs here every time someone clicks a vote button. Set it in the
 * Discord developer portal as
 *   https://siege-clan.com/.netlify/functions/discord-interactions
 * Not /api/...: netlify.toml routes /api/* to the edge functions.
 *
 * Each click: verify Discord's signature, record the vote with one RPC,
 * redraw the public tally, and reply privately to the voter. Discord allows
 * 3 seconds for the reply, and a Netlify function stops when it returns, so
 * all of it happens before the response.
 *
 * ANONYMITY: votes are stored as HMAC(VOTER_HASH_SECRET, pollId:userId), never
 * the Discord ID. Do not log the interaction body, the user ID or the hash -
 * Netlify keeps function logs, and a log line would undo the anonymity.
 *
 * Env: DISCORD_PUBLIC_KEY, DISCORD_BOT_TOKEN, VOTER_HASH_SECRET,
 *      SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Read per request, not at load, so a missing variable fails one click with a
 * message instead of taking the function down.
 */

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const { parseVoteCustomId, renderPoll } = require('../../scripts/comp-polls/render.cjs');
const { editMessage } = require('../../scripts/comp-polls/discord.cjs');

const INTERACTION_PING = 1;
const INTERACTION_MESSAGE_COMPONENT = 3;
const RESPONSE_PONG = 1;
const RESPONSE_CHANNEL_MESSAGE = 4;
const FLAG_EPHEMERAL = 64;

// Discord's budget is 3 s from when it sent the request. Leave headroom.
const BUDGET_MS = 2600;
const RPC_TIMEOUT_MS = 2000;

// DER header that turns Discord's raw 32-byte Ed25519 key into an SPKI key Node can load.
const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

/** True if Discord signed timestamp + body with the application's key. */
function verifyDiscordSignature(rawBody, signatureHex, timestamp, publicKeyHex) {
  if (!signatureHex || !timestamp || !publicKeyHex) return false;
  if (!/^[0-9a-f]{128}$/i.test(signatureHex) || !/^[0-9a-f]{64}$/i.test(publicKeyHex)) return false;
  try {
    const key = crypto.createPublicKey({
      key: Buffer.concat([ED25519_SPKI_PREFIX, Buffer.from(publicKeyHex, 'hex')]),
      format: 'der',
      type: 'spki',
    });
    return crypto.verify(null, Buffer.from(timestamp + rawBody), key, Buffer.from(signatureHex, 'hex'));
  } catch {
    return false;
  }
}

/** One-way, per-poll voter id. Same person + same poll = same hash; nothing else links. */
function voterHash(secret, pollId, userId) {
  return crypto.createHmac('sha256', secret).update(`${pollId}:${userId}`).digest('hex');
}

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

/** A reply only the person who clicked can see. */
const privateReply = (content) => json(200, {
  type: RESPONSE_CHANNEL_MESSAGE,
  data: { content, flags: FLAG_EPHEMERAL, allowed_mentions: { parse: [] } },
});

let supabase;
async function castVoteViaSupabase(env, { pollId, voterHash: hash, optionIndex }) {
  if (!supabase) {
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set');
    }
    supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  const { data, error } = await supabase
    .rpc('cast_comp_poll_vote', { p_poll_id: pollId, p_voter_hash: hash, p_option_index: optionIndex })
    .abortSignal(AbortSignal.timeout(RPC_TIMEOUT_MS));
  if (error) throw new Error(`cast_comp_poll_vote: ${error.message}`);
  return data;
}

function updateTallyViaDiscord(env, channelId, messageId, message, timeoutMs) {
  return editMessage(channelId, messageId, message, { token: env.DISCORD_BOT_TOKEN, timeoutMs, retries: 0 });
}

const closesText = (closesAt) => `<t:${Math.floor(new Date(closesAt).getTime() / 1000)}:f>`;

/**
 * @param {object} [deps] test seams
 * @param {object} [deps.env]
 * @param {Function} [deps.castVote]    (env, {pollId, voterHash, optionIndex}) -> RPC result
 * @param {Function} [deps.updateTally] (env, channelId, messageId, message, timeoutMs) -> Promise
 * @param {Function} [deps.now]
 */
function createHandler(deps = {}) {
  const castVote = deps.castVote || castVoteViaSupabase;
  const updateTally = deps.updateTally || updateTallyViaDiscord;
  const now = deps.now || Date.now;

  return async function handler(event) {
    const started = now();
    const env = deps.env || process.env;

    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

    const headers = {};
    for (const [k, v] of Object.entries(event.headers || {})) headers[k.toLowerCase()] = v;
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body || '', 'base64').toString('utf8')
      : event.body || '';

    const signed = verifyDiscordSignature(
      rawBody,
      headers['x-signature-ed25519'],
      headers['x-signature-timestamp'],
      env.DISCORD_PUBLIC_KEY
    );
    if (!signed) return json(401, { error: 'invalid request signature' });

    let interaction;
    try {
      interaction = JSON.parse(rawBody);
    } catch {
      return json(400, { error: 'Body is not JSON' });
    }

    if (interaction.type === INTERACTION_PING) return json(200, { type: RESPONSE_PONG });
    if (interaction.type !== INTERACTION_MESSAGE_COMPONENT) {
      return privateReply('This bot only handles poll buttons.');
    }

    const vote = parseVoteCustomId(interaction.data?.custom_id);
    if (!vote || !/^\d+$/.test(vote.pollId)) return privateReply('This poll is no longer available.');

    const userId = interaction.member?.user?.id ?? interaction.user?.id;
    if (!userId) return privateReply('Could not tell who clicked. Please try again.');

    if (!env.VOTER_HASH_SECRET) {
      // Never fall back to storing raw IDs.
      console.error('discord-interactions: VOTER_HASH_SECRET is not set; refusing to record votes');
      return privateReply('Voting is not set up yet. Please let an admin know.');
    }

    let outcome;
    try {
      outcome = await castVote(env, {
        pollId: Number(vote.pollId),
        voterHash: voterHash(env.VOTER_HASH_SECRET, vote.pollId, userId),
        optionIndex: vote.optionIndex,
      });
    } catch (err) {
      console.error(`discord-interactions: vote not recorded for poll ${vote.pollId}: ${err.message}`);
      return privateReply('Something went wrong recording your vote. Please try again.');
    }

    const poll = outcome?.poll;
    const chosen = poll?.options?.[vote.optionIndex]?.name;

    switch (outcome?.result) {
      case 'voted':
      case 'changed': {
        try {
          const message = renderPoll({
            pollId: poll.id,
            question: poll.question,
            options: poll.options,
            counts: outcome.counts,
            closesAt: new Date(poll.closes_at),
          });
          const remaining = Math.max(300, BUDGET_MS - (now() - started));
          await updateTally(env, poll.discord_channel_id, poll.discord_message_id, message, remaining);
        } catch (err) {
          // The vote is saved. The tally catches up on the next click, and the
          // Friday job redraws the final result regardless.
          console.error(`discord-interactions: tally not redrawn for poll ${vote.pollId}: ${err.message}`);
        }
        const until = `You can change it until ${closesText(poll.closes_at)}.`;
        if (outcome.result === 'voted') return privateReply(`Vote recorded: **${chosen}**. ${until}`);
        const was = poll.options[outcome.previous]?.name;
        return privateReply(`Vote changed to **${chosen}**${was ? ` (was ${was})` : ''}. ${until}`);
      }
      case 'unchanged':
        return privateReply(`You've already voted for **${chosen}**. Pick another option if you want to change it.`);
      case 'closed':
        return privateReply('This poll has closed.');
      default:
        return privateReply('This poll is no longer available.');
    }
  };
}

exports.handler = createHandler();
exports.createHandler = createHandler;
exports.verifyDiscordSignature = verifyDiscordSignature;
exports.voterHash = voterHash;
