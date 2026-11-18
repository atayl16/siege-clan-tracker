/**
 * Tell the staff Discord channel about members who have earned a rank-up,
 * once per rank. Run hourly, after the Wise Old Man sync.
 *
 * "Earned" is rankPromotionFor() in src/utils/rankUtils.js, the same rule as
 * the admin page: ranks only go up, so a fighter whose EHB fell after a WOM
 * rate change is never told to move down.
 *
 * Once per rank: members.rank_alert_sent holds the rank last announced for
 * that member. A member is announced only when the rank they have earned
 * differs from it, and the column is set BEFORE posting with a conditional
 * update, so overlapping runs cannot both post. If Discord refuses the post
 * (4xx) the claims are put back so the next run tries again; on a timeout or
 * 5xx they are kept rather than risk posting twice.
 *
 * All rank-ups found in one run go in one message. No pings.
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DISCORD_BOT_TOKEN,
 *      DISCORD_STAFF_CHANNEL_ID.
 */

const ALERTS_URL = 'https://siege-clan.com/admin?tab=alerts';
// One embed's description holds 4096 characters; a line is under 100.
const MAX_LISTED = 30;

/** Discord markdown would eat "_" and "*" in a name like "big_dave". */
function escapeName(name) {
  return String(name).replace(/([\\*_~`|>[\]])/g, '\\$1');
}

const titleCase = (rank) => rank.charAt(0).toUpperCase() + rank.slice(1);

/**
 * @param {Array<{ name: string, from: string, to: string, type: string, stat: string }>} rankUps
 * @returns a Discord message body
 */
function renderRankUpAlert(rankUps) {
  const shown = rankUps.slice(0, MAX_LISTED);
  const lines = shown.map(
    (r) => `- **${escapeName(r.name)}**: ${titleCase(r.from)} → **${titleCase(r.to)}** (${r.stat})`
  );
  const more = rankUps.length - shown.length;
  if (more > 0) lines.push(`- and ${more} more on the admin page`);

  return {
    embeds: [
      {
        color: 0xff9800,
        title: rankUps.length === 1 ? 'Rank-up due' : `${rankUps.length} rank-ups due`,
        description: `${lines.join('\n')}\n\nPromote them in game. Each is announced once per rank.`,
      },
    ],
    components: [
      { type: 1, components: [{ type: 2, style: 5, label: 'Open the alerts', url: ALERTS_URL }] },
    ],
    allowed_mentions: { parse: [] },
  };
}

/** "512 EHB" or "41.2M clan XP". */
function statText(member, type) {
  if (type === 'fighter') return `${Math.floor(Number(member.ehb) || 0).toLocaleString('en-GB')} EHB`;
  const clanXp = (parseInt(member.current_xp, 10) || 0) - (parseInt(member.first_xp, 10) || 0);
  return `${(clanXp / 1e6).toFixed(1)}M clan XP`;
}

/**
 * @param {object} deps
 * @param {object} deps.supabase - service-role client
 * @param {Function} deps.postMessage - (channelId, message) => Discord message
 * @param {Function} deps.rankPromotionFor - from src/utils/rankUtils.js
 * @param {Function} deps.memberNeedsRankUpdate - from src/utils/rankUtils.js
 * @param {string} deps.channelId
 * @returns {Promise<{ posted: number }>}
 */
async function alertRankUps({ supabase, postMessage, rankPromotionFor, memberNeedsRankUpdate, channelId, log = console.log }) {
  const { data: members, error } = await supabase
    .from('members')
    .select('wom_id, name, womrole, ehb, current_xp, first_xp, hidden, left_date, rank_alert_sent');
  if (error) throw new Error(`Could not read members: ${error.message}`);

  const due = [];
  for (const member of members || []) {
    if (!memberNeedsRankUpdate(member)) continue;
    const promotion = rankPromotionFor(member);
    if (!promotion || promotion.rank === member.rank_alert_sent) continue;
    due.push({ member, promotion });
  }
  if (!due.length) {
    log('No new rank-ups to announce');
    return { posted: 0 };
  }

  // Claim each one. A member another run claimed first returns no row.
  const claimed = [];
  for (const { member, promotion } of due) {
    // What it was before this claim, to put back if Discord refuses the post.
    const previous = member.rank_alert_sent ?? null;
    let query = supabase.from('members').update({ rank_alert_sent: promotion.rank }).eq('wom_id', member.wom_id);
    query = previous === null ? query.is('rank_alert_sent', null) : query.eq('rank_alert_sent', previous);
    const { data, error: claimError } = await query.select('wom_id');
    if (claimError) throw new Error(`Could not record the alert for ${member.name}: ${claimError.message}`);
    if (data?.length) claimed.push({ member, promotion, previous });
  }
  if (!claimed.length) {
    log('Another run already announced these rank-ups');
    return { posted: 0 };
  }

  const rankUps = claimed.map(({ member, promotion }) => ({
    name: member.name,
    from: String(member.womrole).toLowerCase(),
    to: promotion.rank,
    type: promotion.type,
    stat: statText(member, promotion.type),
  }));

  try {
    await postMessage(channelId, renderRankUpAlert(rankUps));
  } catch (postError) {
    // Discord refused it (4xx): nothing was posted, so put the claims back
    // for the next run. On a timeout or 5xx it may have gone through.
    if (postError?.status >= 400 && postError?.status < 500) {
      for (const { member, promotion, previous } of claimed) {
        const { error: releaseError } = await supabase
          .from('members')
          .update({ rank_alert_sent: previous })
          .eq('wom_id', member.wom_id)
          .eq('rank_alert_sent', promotion.rank);
        if (releaseError) {
          console.error(`Could not undo the alert record for ${member.name}; it will not be announced:`, releaseError.message);
        }
      }
    }
    throw postError;
  }

  log(`Announced ${rankUps.length} rank-up(s): ${rankUps.map((r) => `${r.name} -> ${r.to}`).join(', ')}`);
  return { posted: rankUps.length };
}

async function main() {
  const channelId = process.env.DISCORD_STAFF_CHANNEL_ID;
  if (!channelId || !process.env.DISCORD_BOT_TOKEN) {
    console.log('DISCORD_STAFF_CHANNEL_ID or DISCORD_BOT_TOKEN is not set; no rank-up alerts sent');
    return;
  }
  const { createClient } = require('@supabase/supabase-js');
  const { postMessage } = require('../comp-polls/discord.cjs');
  const { rankPromotionFor, memberNeedsRankUpdate } = await import('../../src/utils/rankUtils.js');

  await alertRankUps({
    supabase: createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY),
    postMessage,
    rankPromotionFor,
    memberNeedsRankUpdate,
    channelId,
  });
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  });
}

module.exports = { alertRankUps, renderRankUpAlert, statText };
