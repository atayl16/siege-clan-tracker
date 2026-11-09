/**
 * Race progress sync: runs in the hourly clan sync, after the WOM sync.
 *
 * The logic lives in netlify/functions/utils/raceProgress.cjs, shared with the
 * race-refresh function that the races page calls when it is opened or its
 * Refresh button is pressed. This run is the backstop: it also covers races
 * nobody has looked at, and marks ended races completed.
 *
 * It asks WOM to pull fresh hiscores for each racer first (force), slowly and
 * one at a time, so progress reflects XP gained since WOM last checked them.
 */

const {
  metricValue,
  planRaceUpdates,
  fetchSnapshots,
  applyRaceUpdates,
} = require('../../netlify/functions/utils/raceProgress.cjs');

async function main() {
  const { createClient } = require('@supabase/supabase-js');
  require('dotenv').config();

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: races, error } = await supabase
    .from('races')
    .select('id, end_date, status, participants:race_participants(*)')
    .eq('status', 'active');
  if (error) throw error;
  console.log(`Active races: ${races.length}`);

  // One WOM lookup per player, however many races they are in.
  const womIds = races.flatMap((r) => (r.participants ?? []).map((p) => Number(p.wom_id)));
  const snapshots = await fetchSnapshots(womIds, {
    force: true,
    apiKey: process.env.WOM_API_KEY,
    concurrency: 1,
    delayMs: 500, // stay well inside WOM's rate limit
    timeoutMs: 15000,
    log: console.warn,
  });

  const now = new Date();
  let updated = 0;
  let failures = 0;
  for (const race of races) {
    const result = await applyRaceUpdates(supabase, race, snapshots, now, console.error);
    updated += result.updated;
    failures += result.failures;
    if (result.completed) console.log(`Race ${race.id} has ended; marked completed`);
  }

  console.log(`Participant rows updated: ${updated}, failures: ${failures}`);
  if (failures) process.exitCode = 1;
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Race progress sync failed:', err);
    process.exit(1);
  });
}

// Re-exported for the existing tests.
module.exports = { metricValue, planRaceUpdates };
