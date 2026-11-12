/**
 * Weekly Overall XP award.
 *
 * When an XP week closes (Monday 19:00 UK, the same moment SotW and BotW
 * turn over), the clan's top five Overall XP gainers for that week earn Siege
 * Score: 15, 10, 5, 2 and 2 points. See src/utils/xpWeek.js for the window
 * and the ranking, which the site uses too, so the standings members watch
 * during the week are the ones that get paid.
 *
 * Runs every hour from the hourly sync. Each run offers the most recently
 * finished week; award_weekly_xp pays a week only once, so every run after the
 * first is a no-op. Running hourly is deliberate: GitHub's cron starts late or
 * not at all here, and any one run that gets through is enough.
 */

const { createClient } = require('@supabase/supabase-js');
const { fetchGroupGained } = require('../comp-polls/wom.cjs');

// The first week to pay: the poll week the feature went live in. Earlier
// weeks were never announced, so they are never paid out retroactively.
const FIRST_WEEK_START = new Date('2026-11-09T19:00:00Z');

// src/ is ES modules; a dynamic import loads it from CommonJS.
const loadXpWeek = () => import('../../src/utils/xpWeek.js');

/**
 * @param {{
 *   supabase: import('@supabase/supabase-js').SupabaseClient,
 *   fetchGains: (start: Date, end: Date) => Promise<object[]>,
 *   now?: Date,
 *   log?: (msg: string) => void,
 * }} deps
 * @returns {Promise<{ status: string, week?: { start: Date, end: Date }, paid?: number, awards?: object[] }>}
 */
async function runWeeklyXpAwards({ supabase, fetchGains, now = new Date(), log = console.log }) {
  const { lastCompletedXpWeek, rankXpGains } = await loadXpWeek();
  const week = lastCompletedXpWeek(now);
  const label = `${week.start.toISOString()} to ${week.end.toISOString()}`;

  if (week.start < FIRST_WEEK_START) {
    log(`Week ${label} is before the award started; nothing to pay.`);
    return { status: 'before_start', week };
  }

  const { data: existing, error: existingError } = await supabase
    .from('xp_awards')
    .select('id')
    .eq('week_start', week.start.toISOString())
    .limit(1);
  if (existingError) throw new Error(`Could not read xp_awards: ${existingError.message}`);
  if (existing.length > 0) {
    log(`Week ${label} is already paid.`);
    return { status: 'already_paid', week };
  }

  const { data: members, error: membersError } = await supabase.from('members').select('wom_id');
  if (membersError) throw new Error(`Could not read members: ${membersError.message}`);
  const memberIds = new Set(members.map((m) => Number(m.wom_id)));

  const gains = await fetchGains(week.start, week.end);
  const ranked = rankXpGains(gains, { isEligible: (row) => memberIds.has(Number(row.player.id)) });

  if (ranked.length === 0) {
    // Leave the week unpaid rather than record an empty one: if WOM was
    // simply behind, a later run can still pay it.
    log(`Week ${label}: no member gained XP according to WOM; will try again next run.`);
    return { status: 'no_gains', week };
  }

  const awards = ranked.map((r) => ({
    wom_id: r.womId,
    player_name: r.name,
    placement: r.place,
    xp_gained: r.gained,
    points_awarded: r.points,
  }));

  const { data: paid, error: rpcError } = await supabase.rpc('award_weekly_xp', {
    p_week_start: week.start.toISOString(),
    p_week_end: week.end.toISOString(),
    p_awards: awards,
  });
  if (rpcError) throw new Error(`award_weekly_xp failed: ${rpcError.message}`);

  for (const a of awards) {
    log(`  #${a.placement} ${a.player_name}: ${a.xp_gained.toLocaleString('en-GB')} XP, +${a.points_awarded} Siege Score`);
  }
  log(`Week ${label}: paid ${paid} member(s).`);
  return { status: 'paid', week, paid, awards };
}

if (require.main === module) {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  runWeeklyXpAwards({ supabase, fetchGains: fetchGroupGained })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Weekly XP award failed:', err);
      process.exit(1);
    });
}

module.exports = { runWeeklyXpAwards, FIRST_WEEK_START };
