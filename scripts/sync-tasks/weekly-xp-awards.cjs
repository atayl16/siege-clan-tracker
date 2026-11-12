/**
 * Weekly Overall XP award.
 *
 * When an XP week closes (Monday 19:00 UK, the same moment SotW and BotW
 * turn over), the clan's top five Overall XP gainers for that week earn Siege
 * Score: 15, 10, 5, 2 and 2 points. See src/utils/xpWeek.js for the window
 * and the ranking, which the site uses too, so the standings members watch
 * during the week are the ones that get paid.
 *
 * Runs every hour from the hourly sync. Each run pays every finished week that
 * is still unpaid, oldest first, looking back LOOKBACK_WEEKS weeks. So a week
 * whose runs all failed (GitHub's cron starts late or not at all here, or WOM
 * was down) is still paid once a run gets through, even after the next week
 * has closed. award_weekly_xp pays a week only once, so offering a paid week
 * again is harmless, and a paid week is skipped before WOM is asked.
 *
 * Every week still unpaid after a run (an error, or WOM showing no gains at
 * all, which never happens for a real week) makes the job exit non-zero, so
 * the hourly workflow goes red and GitHub emails about it, every hour, for
 * the LOOKBACK_WEEKS weeks the week stays in reach.
 *
 * To pay a week that has aged out of reach, run the job by hand as if it were
 * a time inside the following week:
 *
 *   node scripts/sync-tasks/weekly-xp-awards.cjs --now 2026-11-17T12:00:00Z
 *
 * (with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY set). That pays the week
 * that closed before that time, and up to three before it, if still unpaid.
 */

const { createClient } = require('@supabase/supabase-js');
const { fetchGroupGained } = require('../comp-polls/wom.cjs');

// The first week to pay: the poll week the feature went live in. Earlier
// weeks were never announced, so they are never paid out retroactively.
const FIRST_WEEK_START = new Date('2026-11-09T19:00:00Z');

// How far back an unpaid week is still offered. Bounded so a week WOM never
// had gains for is not re-checked every hour forever.
const LOOKBACK_WEEKS = 4;

const HOUR_MS = 60 * 60 * 1000;

// src/ is ES modules; a dynamic import loads it from CommonJS.
const loadXpWeek = () => import('../../src/utils/xpWeek.js');

/** Finished weeks to consider, oldest first, never before FIRST_WEEK_START. */
function candidateWeeks(xpWeek, now) {
  const weeks = [];
  let week = xpWeek.lastCompletedXpWeek(now);
  while (weeks.length < LOOKBACK_WEEKS && week.start >= FIRST_WEEK_START) {
    weeks.unshift(week);
    week = xpWeek.xpWeekContaining(new Date(week.start.getTime() - HOUR_MS));
  }
  return weeks;
}

/** Pay one week. Returns { status, week, paid?, awards? }. */
async function payWeek({ week, supabase, fetchGains, memberIds, rankXpGains, log }) {
  const label = `${week.start.toISOString()} to ${week.end.toISOString()}`;

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
  if (rpcError) throw new Error(`award_weekly_xp failed for week ${label}: ${rpcError.message}`);

  for (const a of awards) {
    log(`  #${a.placement} ${a.player_name}: ${a.xp_gained.toLocaleString('en-GB')} XP, +${a.points_awarded} Siege Score`);
  }
  log(`Week ${label}: paid ${paid} member(s).`);
  return { status: 'paid', week, paid, awards };
}

/**
 * @param {{
 *   supabase: import('@supabase/supabase-js').SupabaseClient,
 *   fetchGains: (start: Date, end: Date) => Promise<object[]>,
 *   now?: Date,
 *   log?: (msg: string) => void,
 * }} deps
 * @returns {Promise<{ weeks: { status: string, week: { start: Date, end: Date }, paid?: number, awards?: object[] }[] }>}
 *   One entry per week considered. Throws, after trying every unpaid week, if
 *   any of them failed, so the job exits non-zero.
 */
async function runWeeklyXpAwards({ supabase, fetchGains, now = new Date(), log = console.log }) {
  const xpWeek = await loadXpWeek();
  const weeks = candidateWeeks(xpWeek, now);

  if (weeks.length === 0) {
    log('No finished week since the award started; nothing to pay.');
    return { weeks: [] };
  }

  const { data: paidRows, error: paidError } = await supabase
    .from('xp_awards')
    .select('week_start')
    .gte('week_start', weeks[0].start.toISOString());
  if (paidError) throw new Error(`Could not read xp_awards: ${paidError.message}`);
  const paidWeeks = new Set(paidRows.map((r) => new Date(r.week_start).getTime()));

  const unpaid = weeks.filter((w) => !paidWeeks.has(w.start.getTime()));
  const results = weeks
    .filter((w) => paidWeeks.has(w.start.getTime()))
    .map((week) => ({ status: 'already_paid', week }));

  if (unpaid.length === 0) {
    log(`All ${weeks.length} recent week(s) are already paid.`);
    return { weeks: results };
  }

  const { data: members, error: membersError } = await supabase.from('members').select('wom_id');
  if (membersError) throw new Error(`Could not read members: ${membersError.message}`);
  const memberIds = new Set(members.map((m) => Number(m.wom_id)));

  const failures = [];
  for (const week of unpaid) {
    try {
      const result = await payWeek({ week, supabase, fetchGains, memberIds, rankXpGains: xpWeek.rankXpGains, log });
      results.push(result);
      if (result.status === 'no_gains') {
        failures.push(new Error(`week ${week.start.toISOString()} is unpaid: WOM showed no member gaining XP`));
      }
    } catch (err) {
      // Carry on to the next week; report every failure at the end.
      log(`Week ${week.start.toISOString()}: ${err.message}`);
      failures.push(err);
      results.push({ status: 'failed', week });
    }
  }

  if (failures.length > 0) {
    throw new Error(`${failures.length} week(s) could not be paid: ${failures.map((e) => e.message).join('; ')}`);
  }
  return { weeks: results };
}

/** `--now <ISO time>` from the command line, for paying an aged-out week by hand. */
function parseNow(argv) {
  const i = argv.indexOf('--now');
  if (i === -1) return new Date();
  const now = new Date(argv[i + 1]);
  if (Number.isNaN(now.getTime())) throw new Error(`--now needs an ISO time, got "${argv[i + 1]}"`);
  return now;
}

if (require.main === module) {
  Promise.resolve()
    .then(() => {
      const now = parseNow(process.argv);
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
      return runWeeklyXpAwards({ supabase, fetchGains: fetchGroupGained, now });
    })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Weekly XP award failed:', err);
      process.exit(1);
    });
}

module.exports = { runWeeklyXpAwards, parseNow, FIRST_WEEK_START, LOOKBACK_WEEKS };
