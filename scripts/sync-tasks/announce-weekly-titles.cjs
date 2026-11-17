/**
 * Posts the week's title holders to Discord, once per week.
 *
 * Run by the hourly sync after the weekly XP award and the weekly titles,
 * only while the repository variable TITLES_DISCORD_ENABLED is "true". Each
 * run looks at the most recently awarded week and posts it if:
 *
 *   - both The Gainer (xp_awards) and the titles (weekly_title_weeks) have
 *     been awarded for it,
 *   - it has not been announced yet (discord_announcements), and
 *   - it ended in the last 7 days, so turning the switch on, or a long
 *     outage, never posts an old week.
 *
 * Plan: .claude/workspace/DISCORD_TITLES_PLAN.md (local only).
 *
 * By hand (the "Weekly Titles Discord" workflow):
 *
 *   --preview  print the message; posts and records nothing
 *   --test     post the latest awarded week to DISCORD_TEST_CHANNEL_ID;
 *              never recorded, so it can be run as often as you like
 *   --post     post the latest awarded week to the live channel now, if it
 *              has not been announced, however old (for a missed week)
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DISCORD_BOT_TOKEN (not for
 * --preview), DISCORD_POLLS_CHANNEL_ID (live), DISCORD_TEST_CHANNEL_ID (--test).
 */

const KIND = 'weekly_titles';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const UNIQUE_VIOLATION = '23505';

const loadMessage = () => import('./weekly-titles-message.mjs');

/** The latest awarded week and everything the message needs, or a reason to wait. */
async function latestWeek(supabase) {
  const { data: weeks, error } = await supabase
    .from('weekly_title_weeks')
    .select('week_start, week_end')
    .order('week_start', { ascending: false })
    .limit(1);
  if (error) throw new Error(`Could not read weekly_title_weeks: ${error.message}`);
  if (!weeks.length) return { wait: 'no week has been awarded yet' };
  const { week_start: weekStart, week_end: weekEnd } = weeks[0];

  const { data: gainer, error: gainerError } = await supabase
    .from('xp_awards')
    .select('player_name, placement, xp_gained')
    .eq('week_start', weekStart);
  if (gainerError) throw new Error(`Could not read xp_awards: ${gainerError.message}`);
  if (!gainer.length) return { wait: `The Gainer is not awarded yet for the week of ${weekStart}` };

  const { data: awards, error: awardsError } = await supabase
    .from('weekly_title_awards')
    .select('title, player_name, placement, value')
    .eq('week_start', weekStart);
  if (awardsError) throw new Error(`Could not read weekly_title_awards: ${awardsError.message}`);

  return { weekStart, weekEnd, gainer, awards };
}

/**
 * @param {{
 *   supabase: import('@supabase/supabase-js').SupabaseClient,
 *   postMessage?: (channelId: string, message: object) => Promise<{ id: string }>,
 *   mode?: 'auto' | 'preview' | 'test' | 'post',
 *   liveChannelId?: string,
 *   testChannelId?: string,
 *   now?: Date,
 *   log?: (msg: string) => void,
 * }} deps
 * @returns {Promise<{ status: 'posted' | 'skipped' | 'preview', reason?: string, messageId?: string }>}
 */
async function announceWeeklyTitles({
  supabase,
  postMessage,
  mode = 'auto',
  liveChannelId,
  testChannelId,
  now = new Date(),
  log = console.log,
}) {
  const skip = (reason) => {
    log(`Nothing posted: ${reason}.`);
    return { status: 'skipped', reason };
  };

  const week = await latestWeek(supabase);
  if (week.wait) return skip(week.wait);

  const { renderWeeklyTitlesMessage, messageAsText } = await loadMessage();
  const message = renderWeeklyTitlesMessage(week);

  if (mode === 'preview') {
    log(messageAsText(message));
    log('\nAs sent to Discord:');
    log(JSON.stringify(message, null, 2));
    return { status: 'preview' };
  }

  if (mode === 'test') {
    if (!testChannelId) throw new Error('DISCORD_TEST_CHANNEL_ID is not set');
    const posted = await postMessage(testChannelId, message);
    log(`Posted the week of ${week.weekStart} to the test channel (message ${posted.id}). Not recorded.`);
    return { status: 'posted', messageId: posted.id };
  }

  if (!liveChannelId) throw new Error('DISCORD_POLLS_CHANNEL_ID is not set');

  if (mode === 'auto' && now.getTime() - new Date(week.weekEnd).getTime() > MAX_AGE_MS) {
    return skip(`the latest awarded week ended ${week.weekEnd}, more than 7 days ago`);
  }

  // Claim the week before posting: if another run already has, the insert
  // fails on the unique constraint and this run posts nothing.
  const { data: claim, error: claimError } = await supabase
    .from('discord_announcements')
    .insert({ kind: KIND, week_start: week.weekStart, channel_id: liveChannelId })
    .select('id')
    .single();
  if (claimError?.code === UNIQUE_VIOLATION) return skip(`the week of ${week.weekStart} was already announced`);
  if (claimError) throw new Error(`Could not record the announcement: ${claimError.message}`);

  let posted;
  try {
    posted = await postMessage(liveChannelId, message);
  } catch (err) {
    // Give the week back so a later run tries again.
    const { error: releaseError } = await supabase.from('discord_announcements').delete().eq('id', claim.id);
    if (releaseError) {
      log(`Could not release the claim (id ${claim.id}): ${releaseError.message}. Delete that row to retry.`);
    }
    throw err;
  }

  const { error: updateError } = await supabase
    .from('discord_announcements')
    .update({ message_id: posted.id })
    .eq('id', claim.id);
  // Posted and claimed either way; only the message id is missing.
  if (updateError) log(`Posted, but could not save the message id: ${updateError.message}`);

  log(`Posted the week of ${week.weekStart} to the live channel (message ${posted.id}).`);
  return { status: 'posted', messageId: posted.id };
}

/** --preview | --test | --post, or nothing for the hourly run. */
function parseMode(argv) {
  const flags = { '--preview': 'preview', '--test': 'test', '--post': 'post' };
  const modes = argv.map((arg) => {
    if (!flags[arg]) throw new Error(`Unknown argument: ${arg}`);
    return flags[arg];
  });
  if (modes.length > 1) throw new Error('Give at most one of --preview, --test, --post');
  return modes[0] || 'auto';
}

if (require.main === module) {
  const { requireEnv, run } = require('../comp-polls/cli.cjs');
  run(async () => {
    const mode = parseMode(process.argv.slice(2));
    requireEnv(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', ...(mode === 'preview' ? [] : ['DISCORD_BOT_TOKEN'])]);
    const { createClient } = require('@supabase/supabase-js');
    const { postMessage } = require('../comp-polls/discord.cjs');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await announceWeeklyTitles({
      supabase,
      postMessage,
      mode,
      liveChannelId: process.env.DISCORD_POLLS_CHANNEL_ID,
      testChannelId: process.env.DISCORD_TEST_CHANNEL_ID,
    });
  });
}

module.exports = { announceWeeklyTitles, parseMode, KIND };
