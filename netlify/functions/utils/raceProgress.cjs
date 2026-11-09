/**
 * Race progress: shared by the hourly sync (scripts/sync-tasks/race-progress.cjs)
 * and the on-demand refresh (netlify/functions/race-refresh.cjs).
 *
 * A race participant's target is an amount to GAIN in their metric after the
 * race starts (as with WOM competitions), so:
 *
 *   start_value     = the metric's value when tracking began (the baseline)
 *   current_value   = gained since then (latest value - start_value)
 *   baseline_set_at = when the baseline was recorded; NULL means "not yet"
 *   updated_at      = when this participant was last checked against WOM
 *
 * New participants are inserted with zeros and no baseline_set_at; the first
 * refresh that sees them records their baseline. A participant whose character
 * or metric is changed on the edit page has baseline_set_at cleared, so it is
 * re-baselined.
 *
 * The first participant to reach their target is marked is_winner. Everyone
 * keeps being tracked until the race's end date, after which the race is
 * marked completed and left alone.
 *
 * The calculation (metricValue, planRaceUpdates, refreshDecision) is pure so
 * it can be tested without the network or a database.
 */

const { fetchSnapshots } = require('./womPlayers.cjs');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_RACES_PER_REQUEST = 20;

// How long a race must have gone unchecked before another refresh does any
// work. Opening the page reads WOM's stored stats, so every few minutes is
// plenty. A forced refresh also asks WOM to pull new hiscores, which WOM
// itself only allows about once a minute per player.
const COOLDOWN_MS = { view: 5 * 60_000, force: 60_000 };

class RaceRefreshError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

/**
 * The value of `metric` in a WOM snapshot's data: XP for skills, kills for
 * bosses, score for activities, value for computed metrics (ehp, ehb).
 *
 * @returns {number|null} null if the snapshot does not carry the metric
 */
function metricValue(snapshotData, metric) {
  if (!snapshotData || !metric) return null;
  // WOM reports -1 for "not ranked on the hiscores"; that is zero progress.
  const pick = (entry, key) => (entry && typeof entry[key] === 'number' ? Math.max(0, entry[key]) : null);
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

/**
 * Whether an on-demand refresh of this race should do any work now.
 *
 * Always yes while someone has no baseline, so a race starts tracking as soon
 * as it is created or edited, whatever the cooldown says.
 *
 * @returns {{ due: true } | { due: false, retryAfterSeconds: number }}
 */
function refreshDecision(race, now, force) {
  const participants = race.participants ?? [];
  if (participants.some((p) => !p.baseline_set_at)) return { due: true };
  const lastChecked = Math.max(0, ...participants.map((p) => Date.parse(p.updated_at) || 0));
  const wait = (force ? COOLDOWN_MS.force : COOLDOWN_MS.view) - (now.getTime() - lastChecked);
  return wait > 0 ? { due: false, retryAfterSeconds: Math.ceil(wait / 1000) } : { due: true };
}

/**
 * Write one race's progress. Every participant gets updated_at stamped,
 * changed or not: it means "last checked", and both the refresh cooldown and
 * the card's "Updated ... ago" read it. That includes players WOM had no data
 * for, so a race whose lookups fail backs off for the cooldown instead of
 * retrying WOM on every page view.
 *
 * @returns {Promise<{ updated: number, failures: number, completed: boolean }>}
 */
async function applyRaceUpdates(supabase, race, snapshots, now = new Date(), log = () => {}) {
  const { participantUpdates, completeRace } = planRaceUpdates(race, snapshots, now);
  const stamp = now.toISOString();
  let updated = 0;
  let failures = 0;
  const written = new Set();

  for (const { id, changes } of participantUpdates) {
    const { error } = await supabase
      .from('race_participants')
      .update({ ...changes, updated_at: stamp })
      .eq('id', id);
    if (error) {
      failures++;
      log(`Failed to update participant ${id}: ${error.message}`);
    } else {
      updated++;
      written.add(id);
    }
  }

  const checked = (race.participants ?? []).filter((p) => !written.has(p.id)).map((p) => p.id);
  if (checked.length) {
    const { error } = await supabase.from('race_participants').update({ updated_at: stamp }).in('id', checked);
    if (error) {
      failures++;
      log(`Failed to stamp participants of race ${race.id}: ${error.message}`);
    }
  }

  let completed = false;
  if (completeRace) {
    const { error } = await supabase.from('races').update({ status: 'completed' }).eq('id', race.id);
    if (error) {
      failures++;
      log(`Failed to complete race ${race.id}: ${error.message}`);
    } else {
      completed = true;
    }
  }

  return { updated, failures, completed };
}

/**
 * Refresh the given races on demand (the race page, or its Refresh button).
 *
 * Only active races are touched, and only when refreshDecision says so, so
 * repeated calls cost at most one WOM lookup per player per cooldown. The
 * result says what happened to each race but returns no race data: the
 * caller re-reads races through its own RLS-checked query.
 *
 * @param {object} args
 * @param {object} args.supabase - service-role client
 * @param {string[]} args.raceIds
 * @param {boolean} [args.force] - ask WOM to pull fresh hiscores first
 * @returns {Promise<{ results: Array<{ raceId, status, retryAfterSeconds?, updated?, completed? }> }>}
 */
async function refreshRaces({ supabase, raceIds, force = false, now = new Date(), apiKey, fetchImpl, log = () => {} }) {
  if (!Array.isArray(raceIds) || raceIds.length === 0) {
    throw new RaceRefreshError('raceIds must be a non-empty list');
  }
  if (raceIds.length > MAX_RACES_PER_REQUEST) {
    throw new RaceRefreshError(`At most ${MAX_RACES_PER_REQUEST} races per request`);
  }
  if (!raceIds.every((id) => typeof id === 'string' && UUID.test(id))) {
    throw new RaceRefreshError('Invalid race id');
  }
  const ids = [...new Set(raceIds)];

  const { data: races, error } = await supabase
    .from('races')
    .select('id, end_date, status, participants:race_participants(*)')
    .in('id', ids)
    .eq('status', 'active');
  if (error) throw error;

  const byId = new Map((races ?? []).map((r) => [r.id, r]));
  const results = [];
  const due = [];
  for (const id of ids) {
    const race = byId.get(id);
    if (!race) {
      results.push({ raceId: id, status: 'not_active' });
      continue;
    }
    const decision = refreshDecision(race, now, force);
    if (decision.due) due.push(race);
    else results.push({ raceId: id, status: 'recently_refreshed', retryAfterSeconds: decision.retryAfterSeconds });
  }
  if (!due.length) return { results };

  const womIds = [...new Set(due.flatMap((r) => (r.participants ?? []).map((p) => Number(p.wom_id))))];
  const snapshots = await fetchSnapshots(womIds, {
    force,
    apiKey,
    fetchImpl,
    // A Netlify function has about ten seconds. Look everyone up at once
    // (races are a handful of players, well inside WOM's 100 a minute) and
    // keep each call short, so even a forced refresh finishes in time.
    concurrency: Math.min(womIds.length, 12),
    timeoutMs: force ? 4000 : 3000,
    log,
  });

  for (const race of due) {
    const { updated, completed } = await applyRaceUpdates(supabase, race, snapshots, now, log);
    results.push({ raceId: race.id, status: 'refreshed', updated, completed });
  }
  return { results };
}

module.exports = {
  COOLDOWN_MS,
  RaceRefreshError,
  metricValue,
  planRaceUpdates,
  refreshDecision,
  fetchSnapshots,
  applyRaceUpdates,
  refreshRaces,
};
