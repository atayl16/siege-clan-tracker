/**
 * Weekly titles: live standings and awards.
 *
 * The titles, their WOM metrics, minimums and points are defined once, in
 * src/utils/weeklyTitles.js. Each hourly run:
 *
 * 1. Awards every finished week not yet awarded (oldest first, looking back
 *    LOOKBACK_WEEKS weeks, never before FIRST_WEEK_START): the top 3 at or
 *    over each title's minimum earn its points, through award_weekly_titles,
 *    which does a week only once. A week where WOM shows nothing at all is
 *    left for a later run and fails this one, so it is noticed.
 * 2. Replaces the live standings for the week in progress
 *    (weekly_title_standings), which the Leaderboard reads. The Boss Hunter
 *    adds up every boss WOM tracks, about 70 metrics, which is why this runs
 *    here and not on each page view.
 *
 * Only members count (a row in members), as for the weekly XP award.
 *
 * About 90 WOM calls a run, spaced to stay inside the API key's 100 a minute.
 * To award a week that has aged out of reach, run it by hand as if it were a
 * time inside the following week:
 *
 *   node scripts/sync-tasks/weekly-titles.cjs --now 2026-11-17T12:00:00Z
 */

const { createClient } = require('@supabase/supabase-js');
const { fetchGroupGained, fetchBossMetrics } = require('../comp-polls/wom.cjs');

// The first week awarded: the week before the feature shipped, whose winners
// are on the page from day one (owner's decision, 2026-11-17).
const FIRST_WEEK_START = new Date('2026-11-09T19:00:00Z');
const LOOKBACK_WEEKS = 4;

const HOUR_MS = 60 * 60 * 1000;
const WEEK_MS = 7 * 24 * HOUR_MS;

// src/ is ES modules; a dynamic import loads it from CommonJS.
const loadModules = async () => ({
  xpWeek: await import('../../src/utils/xpWeek.js'),
  titles: await import('../../src/utils/weeklyTitles.js'),
});

const realSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * WOM access for one run: each (metric, window) is fetched once, calls are
 * spaced by gapMs, and a 429 waits and retries.
 */
function makeWom({ fetchGains, fetchBosses, gapMs, sleep }) {
  const cache = new Map();
  let bosses = null;

  async function call(fn) {
    for (let attempt = 0; ; attempt++) {
      try {
        const result = await fn();
        if (gapMs) await sleep(gapMs);
        return result;
      } catch (err) {
        if (!/\b429\b/.test(err.message) || attempt >= 3) throw err;
        await sleep(20000);
      }
    }
  }

  return {
    async gains(metric, start, end) {
      const key = `${metric}|${start.toISOString()}|${end.toISOString()}`;
      if (!cache.has(key)) cache.set(key, await call(() => fetchGains(start, end, metric)));
      return cache.get(key);
    },
    async bossMetrics() {
      if (!bosses) bosses = await call(() => fetchBosses());
      return bosses;
    },
  };
}

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

/**
 * Every title's rows for a week: { [titleId]: [{ womId, name, value }] },
 * members only, value > 0 (the minimum is applied when ranking).
 */
async function computeStandings({ week, wom, memberIds, titles }) {
  const byTitle = {};
  for (const title of titles.WEEKLY_TITLES) {
    const metrics = title.metrics === titles.ALL_BOSSES ? await wom.bossMetrics() : title.metrics;
    const totals = new Map();
    for (const metric of metrics) {
      for (const row of await wom.gains(metric, week.start, week.end)) {
        const gained = row?.data?.gained ?? 0;
        const id = Number(row?.player?.id);
        if (!(gained > 0) || !memberIds.has(id)) continue;
        const entry = totals.get(id) || {
          womId: id,
          name: row.player.displayName || row.player.username,
          value: 0,
        };
        entry.value += gained;
        totals.set(id, entry);
      }
    }

    let rows = [...totals.values()].map((r) => ({ ...r, value: Math.round(r.value * 100) / 100 }));

    if (title.idleWeeks) {
      // Back after a quiet spell: no Overall XP at all in the weeks before.
      // Someone WOM has no row for in that window is not counted as idle.
      const before = await wom.gains(
        'overall',
        new Date(week.start.getTime() - title.idleWeeks * WEEK_MS),
        week.start
      );
      const idle = new Set(
        before.filter((r) => (r?.data?.gained ?? 0) === 0).map((r) => Number(r.player.id))
      );
      rows = rows.filter((r) => idle.has(r.womId));
    }

    byTitle[title.id] = rows;
  }
  return byTitle;
}

/**
 * @param {{
 *   supabase: import('@supabase/supabase-js').SupabaseClient,
 *   fetchGains: (start: Date, end: Date, metric: string) => Promise<object[]>,
 *   fetchBosses: () => Promise<string[]>,
 *   now?: Date,
 *   log?: (msg: string) => void,
 *   gapMs?: number,
 *   sleep?: (ms: number) => Promise<void>,
 * }} deps
 * @returns {Promise<{ awarded: object[], standings: number }>} Throws, after
 *   doing everything it can, if any week could not be awarded or the live
 *   standings could not be written, so the job exits non-zero.
 */
async function runWeeklyTitles({
  supabase,
  fetchGains,
  fetchBosses,
  now = new Date(),
  log = console.log,
  gapMs = 650,
  sleep = realSleep,
}) {
  const { xpWeek, titles } = await loadModules();
  const wom = makeWom({ fetchGains, fetchBosses, gapMs, sleep });
  const failures = [];
  const awarded = [];

  const { data: members, error: membersError } = await supabase.from('members').select('wom_id');
  if (membersError) throw new Error(`Could not read members: ${membersError.message}`);
  const memberIds = new Set(members.map((m) => Number(m.wom_id)));

  // 1. Award finished weeks.
  const weeks = candidateWeeks(xpWeek, now);
  if (weeks.length) {
    const { data: done, error: doneError } = await supabase
      .from('weekly_title_weeks')
      .select('week_start')
      .gte('week_start', weeks[0].start.toISOString());
    if (doneError) throw new Error(`Could not read weekly_title_weeks: ${doneError.message}`);
    const doneWeeks = new Set(done.map((r) => new Date(r.week_start).getTime()));

    for (const week of weeks.filter((w) => !doneWeeks.has(w.start.getTime()))) {
      const label = `${week.start.toISOString()} to ${week.end.toISOString()}`;
      try {
        const standings = await computeStandings({ week, wom, memberIds, titles });
        if (Object.values(standings).every((rows) => rows.length === 0)) {
          throw new Error(`WOM showed no member gaining anything in week ${label}; will try again`);
        }

        const awards = titles.WEEKLY_TITLES.flatMap((title) =>
          titles.rankTitle(title, standings[title.id]).map((r) => ({
            title: title.id,
            wom_id: r.womId,
            player_name: r.name,
            placement: r.place,
            value: r.value,
            points_awarded: r.points,
          }))
        );

        const { data: paid, error } = await supabase.rpc('award_weekly_titles', {
          p_week_start: week.start.toISOString(),
          p_week_end: week.end.toISOString(),
          p_awards: awards,
        });
        if (error) throw new Error(`award_weekly_titles failed for week ${label}: ${error.message}`);

        for (const a of awards) {
          log(`  ${a.title} #${a.placement} ${a.player_name}: ${a.value}, +${a.points_awarded}`);
        }
        log(`Week ${label}: ${awards.length} placing(s), ${paid} member(s) awarded.`);
        awarded.push({ week, awards, paid });
      } catch (err) {
        log(`Week ${label}: ${err.message}`);
        failures.push(err);
      }
    }
  }

  // 2. Live standings for the week in progress.
  let standingsRows = 0;
  const current = xpWeek.xpWeekContaining(now);
  try {
    const standings = await computeStandings({ week: current, wom, memberIds, titles });
    const rows = titles.WEEKLY_TITLES.flatMap((title) =>
      standings[title.id].map((r) => ({
        title: title.id,
        wom_id: r.womId,
        player_name: r.name,
        value: r.value,
      }))
    );
    const { data, error } = await supabase.rpc('set_weekly_title_standings', {
      p_week_start: current.start.toISOString(),
      p_rows: rows,
    });
    if (error) throw new Error(`set_weekly_title_standings failed: ${error.message}`);
    standingsRows = data ?? rows.length;
    log(`Live standings for the week of ${current.start.toISOString()}: ${standingsRows} row(s).`);
  } catch (err) {
    log(`Live standings: ${err.message}`);
    failures.push(err);
  }

  if (failures.length) {
    throw new Error(`${failures.length} step(s) failed: ${failures.map((e) => e.message).join('; ')}`);
  }
  return { awarded, standings: standingsRows };
}

/** `--now <ISO time>` from the command line, for awarding an aged-out week by hand. */
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
      return runWeeklyTitles({ supabase, fetchGains: fetchGroupGained, fetchBosses: fetchBossMetrics, now });
    })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Weekly titles failed:', err);
      process.exit(1);
    });
}

module.exports = { runWeeklyTitles, parseNow, FIRST_WEEK_START, LOOKBACK_WEEKS };
