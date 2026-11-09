/**
 * Race progress sync: runs hourly after the WOM sync.
 *
 * A race participant's target is an amount to GAIN in their metric after the
 * race starts (as with WOM competitions), so:
 *
 *   start_value     = the metric's value when tracking began (the baseline)
 *   current_value   = gained since then (latest value - start_value)
 *   baseline_set_at = when the baseline was recorded; NULL means "not yet"
 *
 * New participants are inserted with zeros and no baseline_set_at; the first
 * run that sees them records their baseline. A participant whose character or
 * metric is changed on the edit page has baseline_set_at cleared, so it is
 * re-baselined here.
 *
 * The first participant to reach their target is marked is_winner. Everyone
 * keeps being tracked until the race's end date, after which the race is
 * marked completed and left alone.
 *
 * The calculation is in pure functions (exported) so it can be tested without
 * the network; main() only fetches and writes.
 */

const WOM_API_BASE = 'https://api.wiseoldman.net/v2';

/**
 * The value of `metric` in a WOM snapshot's data: XP for skills, kills for
 * bosses, score for activities, value for computed metrics (ehp, ehb).
 * WOM reports -1 for unranked, which counts as 0.
 * @returns {number|null} null if the snapshot does not carry the metric
 */
function metricValue(snapshotData, metric) {
  if (!snapshotData || !metric) return null;
  const pick = (entry, field) =>
    entry && typeof entry[field] === 'number' ? Math.max(0, entry[field]) : null;
  return (
    pick(snapshotData.skills?.[metric], 'experience') ??
    pick(snapshotData.bosses?.[metric], 'kills') ??
    pick(snapshotData.activities?.[metric], 'score') ??
    pick(snapshotData.computed?.[metric], 'value')
  );
}

/**
 * Work out the writes for one race.
 *
 * @param {object} race - { id, end_date, participants: [...] }
 * @param {Map<number, object>} snapshots - wom_id -> latestSnapshot.data
 * @param {Date} now
 * @returns {{ participantUpdates: Array<{id, changes}>, completeRace: boolean }}
 */
function planRaceUpdates(race, snapshots, now = new Date()) {
  const ended = race.end_date && new Date(race.end_date) < now;
  const participantUpdates = [];
  const participants = race.participants ?? [];
  const alreadyWon = participants.some((p) => p.is_winner);
  const finishers = [];

  for (const p of participants) {
    const value = metricValue(snapshots.get(Number(p.wom_id)), p.metric);
    if (value === null) continue; // no data for this player or metric yet

    if (!p.baseline_set_at) {
      participantUpdates.push({
        id: p.id,
        changes: { start_value: value, current_value: 0, baseline_set_at: now.toISOString() },
      });
      continue;
    }

    const gained = Math.max(0, value - (p.start_value ?? 0));
    if (gained !== p.current_value) {
      participantUpdates.push({ id: p.id, changes: { current_value: gained } });
    }
    if (p.target_value > 0 && gained >= p.target_value) {
      finishers.push({ id: p.id, ratio: gained / p.target_value });
    }
  }

  // First to finish wins. If several crossed the line since the last run,
  // the one furthest past their target takes it.
  if (!alreadyWon && finishers.length) {
    finishers.sort((a, b) => b.ratio - a.ratio);
    const winnerId = finishers[0].id;
    const existing = participantUpdates.find((u) => u.id === winnerId);
    if (existing) existing.changes.is_winner = true;
    else participantUpdates.push({ id: winnerId, changes: { is_winner: true } });
  }

  return { participantUpdates, completeRace: Boolean(ended) };
}

async function main() {
  const { createClient } = require('@supabase/supabase-js');
  const fetch = require('node-fetch');
  require('dotenv').config();

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const headers = { 'User-Agent': 'Siege-Clan-Tracker/1.0' };
  if (process.env.WOM_API_KEY) headers['x-api-key'] = process.env.WOM_API_KEY;

  const { data: races, error } = await supabase
    .from('races')
    .select('id, end_date, status, participants:race_participants(*)')
    .eq('status', 'active');
  if (error) throw error;
  console.log(`Active races: ${races.length}`);

  // One WOM lookup per player, however many races they are in.
  const womIds = [...new Set(races.flatMap((r) => (r.participants ?? []).map((p) => Number(p.wom_id))))];
  const snapshots = new Map();
  for (const womId of womIds) {
    try {
      const res = await fetch(`${WOM_API_BASE}/players/id/${womId}`, { headers });
      if (!res.ok) {
        console.warn(`WOM ${res.status} for player ${womId}; skipping them this run`);
        continue;
      }
      const player = await res.json();
      if (player.latestSnapshot?.data) snapshots.set(womId, player.latestSnapshot.data);
    } catch (err) {
      console.warn(`WOM lookup failed for player ${womId}: ${err.message}`);
    }
    await new Promise((r) => setTimeout(r, 500)); // stay well inside WOM's rate limit
  }

  let updated = 0;
  let failures = 0;
  for (const race of races) {
    const { participantUpdates, completeRace } = planRaceUpdates(race, snapshots);
    for (const { id, changes } of participantUpdates) {
      const { error: updateError } = await supabase
        .from('race_participants')
        .update(changes)
        .eq('id', id);
      if (updateError) {
        failures++;
        console.error(`Failed to update participant ${id}:`, updateError.message);
      } else {
        updated++;
      }
    }
    if (completeRace) {
      const { error: raceError } = await supabase
        .from('races')
        .update({ status: 'completed' })
        .eq('id', race.id);
      if (raceError) {
        failures++;
        console.error(`Failed to complete race ${race.id}:`, raceError.message);
      } else {
        console.log(`Race ${race.id} has ended; marked completed`);
      }
    }
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

module.exports = { metricValue, planRaceUpdates };
