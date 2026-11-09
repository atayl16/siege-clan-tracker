/**
 * comp_polls / comp_poll_votes access for the GitHub Actions jobs, using the
 * service role. See supabase/migrations/20261109000007_comp_polls.sql.
 *
 * The jobs only ever read vote counts; they never see who voted (the table
 * holds hashes only).
 */

const UNIQUE_VIOLATION = '23505';

function createStore(supabase) {
  const fail = (what, error) => {
    throw new Error(`${what}: ${error.message}`);
  };

  return {
    /** The real (non-test) polls for one week. */
    async pollsForWeek(weekStart) {
      const { data, error } = await supabase
        .from('comp_polls')
        .select('*')
        .eq('week_start', weekStart)
        .eq('is_test', false);
      if (error) fail('Reading this week\'s polls', error);
      return data;
    },

    /** Insert a poll. Returns null if another run already created this week's poll. */
    async insertPoll(row) {
      const { data, error } = await supabase.from('comp_polls').insert(row).select().single();
      if (error?.code === UNIQUE_VIOLATION) return null;
      if (error) fail(`Saving the ${row.category} poll`, error);
      return data;
    },

    async updatePoll(id, patch) {
      const { data, error } = await supabase.from('comp_polls').update(patch).eq('id', id).select().single();
      if (error) fail(`Updating poll ${id}`, error);
      return data;
    },

    /** Polls past their closing time that still have work left (closing, WOM, announcing). */
    async unfinishedPolls(now) {
      const { data, error } = await supabase
        .from('comp_polls')
        .select('*')
        .in('status', ['open', 'closed', 'created'])
        .lte('closes_at', now.toISOString())
        .order('closes_at', { ascending: true })
        .order('id', { ascending: true });
      if (error) fail('Reading polls to close', error);
      return data;
    },

    /** Every poll posted in the same run, which share one winners announcement. */
    async pollBatch({ week_start, is_test, opens_at }) {
      const { data, error } = await supabase
        .from('comp_polls')
        .select('*')
        .eq('week_start', week_start)
        .eq('is_test', is_test)
        .eq('opens_at', opens_at)
        .order('id', { ascending: true });
      if (error) fail('Reading the poll batch', error);
      return data;
    },

    /** Votes per option, in option order. */
    async voteCounts(pollId, optionCount) {
      const { data, error } = await supabase
        .from('comp_poll_votes')
        .select('option_index')
        .eq('poll_id', pollId);
      if (error) fail(`Counting votes for poll ${pollId}`, error);
      const counts = new Array(optionCount).fill(0);
      for (const { option_index: i } of data) if (i >= 0 && i < optionCount) counts[i]++;
      return counts;
    },
  };
}

module.exports = { createStore };
