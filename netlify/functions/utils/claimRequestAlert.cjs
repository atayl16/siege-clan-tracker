/**
 * Tell the staff Discord channel that a member raised a claim request, so an
 * admin knows to go and approve it.
 *
 * Called by user-claim-request-notify.cjs right after the site saves a
 * request. Each request is announced at most once: notified_at is set with a
 * conditional update BEFORE posting, so repeat calls (a double click, or
 * someone calling the function by hand) find it already claimed and post
 * nothing. Only the member who raised a request can trigger its post.
 *
 * No pings: the post names nobody and allowed_mentions turns mentions off.
 *
 * Kept free of request handling so it can be tested with stand-ins.
 */

const ADMIN_URL = 'https://siege-clan.com/admin?tab=claim-requests';
const EMBED_COLOR = 0xff9800; // the site's orange
const LINK_BUTTON = 5;
const MESSAGE_LIMIT = 500;

class AlertError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

/**
 * Discord markdown would eat "_" and "*" in a name like "big_dave", and a
 * line of the member's note starting "#" or "-" would become a heading or a
 * list.
 */
function escapeMarkdown(text) {
  return String(text)
    .replace(/([\\*_~`|>[\]])/g, '\\$1')
    .replace(/^([#-])/, '\\$1');
}

/**
 * @param {object} args
 * @param {{ rsn: string, message?: string|null }} args.request
 * @param {string|null} args.username - the requester's site username
 * @returns a Discord message body
 */
function renderClaimRequestAlert({ request, username }) {
  const who = username ? `**${escapeMarkdown(username)}**` : 'A member';
  const lines = [`${who} wants to claim **${escapeMarkdown(request.rsn)}**.`];

  const note = String(request.message ?? '').trim();
  if (note) {
    const clipped = note.length > MESSAGE_LIMIT ? `${note.slice(0, MESSAGE_LIMIT)}…` : note;
    lines.push('', ...clipped.split(/\r?\n/).map((line) => `> ${escapeMarkdown(line)}`));
  }

  return {
    embeds: [{ color: EMBED_COLOR, title: 'New claim request', description: lines.join('\n') }],
    components: [
      {
        type: 1,
        components: [{ type: 2, style: LINK_BUTTON, label: 'Review claim requests', url: ADMIN_URL }],
      },
    ],
    allowed_mentions: { parse: [] },
  };
}

/**
 * Undo a claim after Discord refused the post, so the request can be
 * announced later. Tries twice; if both fail the request stays marked as
 * announced although nothing was posted, so say so in the log, by id, for
 * an admin to clear by hand. The request itself is unaffected and still
 * shows in the admin queue.
 */
async function releaseClaim(supabase, id) {
  let lastError;
  for (let attempt = 0; attempt < 2; attempt++) {
    const { error } = await supabase.from('claim_requests').update({ notified_at: null }).eq('id', id);
    if (!error) return true;
    lastError = error;
  }
  console.error(
    `claim request ${id}: Discord refused the alert and notified_at could not be cleared, so it will not be announced:`,
    lastError?.message || lastError
  );
  return false;
}

/**
 * @param {object} args
 * @param {object} args.supabase - service-role client
 * @param {{ id: string }} args.authUser - the caller, from supabase.auth.getUser(token)
 * @param {number|string} args.requestId
 * @param {string} args.channelId - the staff channel
 * @param {Function} args.postMessage - (channelId, message) => Discord message
 * @returns {Promise<{ notified: boolean, reason?: string }>}
 * @throws {AlertError} for a request the caller may not announce
 */
async function alertClaimRequest({ supabase, authUser, requestId, channelId, postMessage }) {
  const id = Number(requestId);
  if (!Number.isInteger(id) || id <= 0) throw new AlertError('Give the claim request id.', 400);

  const { data: request, error: findError } = await supabase
    .from('claim_requests')
    .select('id, user_id, rsn, message, status, notified_at')
    .eq('id', id)
    .maybeSingle();
  if (findError) throw findError;
  // Same answer for "no such request" and "not yours", so the function
  // cannot be used to probe other people's requests.
  if (!request || request.user_id !== authUser.id) throw new AlertError('No such claim request.', 404);
  if (request.status !== 'pending') return { notified: false, reason: 'not pending' };
  if (request.notified_at) return { notified: false, reason: 'already announced' };

  // Claim it. Only one caller can move notified_at off NULL, and not once
  // an admin has handled the request since it was read above.
  const { data: claimed, error: claimError } = await supabase
    .from('claim_requests')
    .update({ notified_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'pending')
    .is('notified_at', null)
    .select('id');
  if (claimError) throw claimError;
  if (!claimed?.length) return { notified: false, reason: 'already announced' };

  // Accounts are created with users.id = auth user id; supabase_auth_id
  // covers accounts linked afterwards. A missing name still posts.
  const { data: users } = await supabase
    .from('users')
    .select('username')
    .or(`id.eq.${authUser.id},supabase_auth_id.eq.${authUser.id}`)
    .limit(1);

  try {
    await postMessage(channelId, renderClaimRequestAlert({ request, username: users?.[0]?.username ?? null }));
  } catch (error) {
    // Discord refused it (4xx): nothing was posted, so release the claim.
    // On a timeout or 5xx the post may have gone through, so keep it rather
    // than risk posting twice.
    if (error?.status >= 400 && error?.status < 500) await releaseClaim(supabase, id);
    throw error;
  }
  return { notified: true };
}

module.exports = { alertClaimRequest, renderClaimRequestAlert, escapeMarkdown, AlertError, ADMIN_URL };
