// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'child_process';
import { createRequire } from 'module';

/**
 * award_competition_points against a real database, with the fractional
 * progress WOM reports for EHB and EHP competitions.
 *
 * The production function cast progress to int, so competition 158975
 * (progress 19.75566) failed with "invalid input syntax for type integer" on
 * every hourly sync, and none of its 44 participants got points. The sync's
 * unit tests mock Supabase, so only a real Postgres shows the cast failing.
 *
 * Requires the local Supabase stack (`supabase start`). Skips when it is not
 * running so `npm test` still works without Docker; the smoke workflow is
 * where this gets a stack in CI.
 */

const require = createRequire(import.meta.url);

/** Read local stack credentials, or null when the stack is down. */
function localStack() {
  try {
    const out = execFileSync('supabase', ['status', '-o', 'env'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const env = Object.fromEntries(
      out
        .split('\n')
        .map((line) => line.match(/^([A-Z_]+)="?([^"]*)"?$/))
        .filter(Boolean)
        .map((m) => [m[1], m[2]])
    );
    if (!env.API_URL || !env.SERVICE_ROLE_KEY) return null;
    return env;
  } catch {
    return null;
  }
}

const stack = localStack();
// Seeded members (supabase/seed.sql). A WOM id far from the seeded events.
const WINNER = 900002;
const RUNNER_UP = 900003;
const COMPETITION = 990001;

describe.skipIf(!stack)('award_competition_points against a real database', () => {
  let supabase;
  let eventId;
  const scoresBefore = {};

  beforeAll(async () => {
    const { createClient } = require('@supabase/supabase-js');
    supabase = createClient(stack.API_URL, stack.SERVICE_ROLE_KEY);

    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('wom_id, siege_score')
      .in('wom_id', [WINNER, RUNNER_UP]);
    expect(membersError).toBeNull();
    for (const m of members) scoresBefore[m.wom_id] = m.siege_score ?? 0;

    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert({ name: 'Integration EHB Champions', wom_id: COMPETITION, is_wom: true, points_processed: false })
      .select('id')
      .single();
    expect(eventError).toBeNull();
    eventId = event.id;
  }, 30_000);

  afterAll(async () => {
    if (!supabase) return;
    if (eventId) {
      await supabase.from('event_results').delete().eq('event_id', eventId);
      await supabase.from('events').delete().eq('id', eventId);
    }
    for (const [womId, score] of Object.entries(scoresBefore)) {
      await supabase.from('members').update({ siege_score: score }).eq('wom_id', Number(womId));
    }
  });

  // The payload has the shape wom-events.cjs sends.
  it('awards points when progress is fractional, and stores it unrounded', async () => {
    const pointsData = [
      { event_id: eventId, wom_id: WINNER, player_name: 'winner', placement: 1, points_awarded: 15, progress: 19.75566 },
      { event_id: eventId, wom_id: RUNNER_UP, player_name: 'runner up', placement: 2, points_awarded: 10, progress: 0.00704 },
    ];
    const memberUpdates = [
      { wom_id: WINNER, oldScore: scoresBefore[WINNER], pointsToAward: 15, newScore: scoresBefore[WINNER] + 15 },
      { wom_id: RUNNER_UP, oldScore: scoresBefore[RUNNER_UP], pointsToAward: 10, newScore: scoresBefore[RUNNER_UP] + 10 },
    ];

    const { data, error } = await supabase.rpc('award_competition_points', {
      competition_id: COMPETITION,
      points_data: pointsData,
      member_updates: memberUpdates,
    });
    expect(error).toBeNull();
    expect(data).toMatchObject({ status: 'success', updated_members: 2 });

    const { data: results } = await supabase
      .from('event_results')
      .select('placement, progress')
      .eq('event_id', eventId)
      .order('placement');
    expect(results.map((r) => Number(r.progress))).toEqual([19.75566, 0.00704]);

    const { data: members } = await supabase
      .from('members')
      .select('wom_id, siege_score')
      .in('wom_id', [WINNER, RUNNER_UP]);
    const score = Object.fromEntries(members.map((m) => [m.wom_id, m.siege_score]));
    expect(score[WINNER]).toBe(scoresBefore[WINNER] + 15);
    expect(score[RUNNER_UP]).toBe(scoresBefore[RUNNER_UP] + 10);

    const { data: event } = await supabase
      .from('events')
      .select('points_processed, status')
      .eq('id', eventId)
      .single();
    expect(event).toEqual({ points_processed: true, status: 'completed' });
  });

  // The sync reads scores, then awards. A change made in between must survive.
  it('adds points to the current score, not the score the sync read earlier', async () => {
    const { data: second, error: insertError } = await supabase
      .from('events')
      .insert({ name: 'Integration second comp', wom_id: COMPETITION + 1, is_wom: true, points_processed: false })
      .select('id')
      .single();
    expect(insertError).toBeNull();

    try {
      const { data: read } = await supabase.from('members').select('siege_score').eq('wom_id', WINNER).single();
      // An admin adds 5 points after the sync read the score.
      await supabase.from('members').update({ siege_score: read.siege_score + 5 }).eq('wom_id', WINNER);

      const { error } = await supabase.rpc('award_competition_points', {
        competition_id: COMPETITION + 1,
        points_data: [{ event_id: second.id, wom_id: WINNER, player_name: 'winner', placement: 1, points_awarded: 2, progress: 1.5 }],
        member_updates: [{ wom_id: WINNER, oldScore: read.siege_score, pointsToAward: 2, newScore: read.siege_score + 2 }],
      });
      expect(error).toBeNull();

      const { data: after } = await supabase.from('members').select('siege_score').eq('wom_id', WINNER).single();
      expect(after.siege_score).toBe(read.siege_score + 5 + 2);
    } finally {
      await supabase.from('event_results').delete().eq('event_id', second.id);
      await supabase.from('events').delete().eq('id', second.id);
    }
  });

  it('refuses to award the same competition twice', async () => {
    const { data, error } = await supabase.rpc('award_competition_points', {
      competition_id: COMPETITION,
      points_data: [],
      member_updates: [],
    });
    expect(error).toBeNull();
    expect(data).toEqual({ status: 'already_processed' });
  });
});
