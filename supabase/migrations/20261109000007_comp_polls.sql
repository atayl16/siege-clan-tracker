-- Migration: weekly SotW / BotW / RotW polls and their anonymous votes
--
-- A GitHub Actions job posts three Discord polls every Monday 19:00 UK
-- (scripts/comp-polls/open-polls.cjs). Members vote with buttons; each click
-- reaches netlify/functions/discord-interactions.cjs, which records it through
-- cast_comp_poll_vote(). On Friday, close-polls.cjs picks the winners and
-- creates next week's WiseOldMan competitions.
--
-- Votes are anonymous. comp_poll_votes never holds a Discord user ID, only
-- HMAC-SHA256(VOTER_HASH_SECRET, poll_id || ':' || discord_user_id), computed
-- in the Netlify function. That is enough to allow one vote per person and to
-- let them change it, but nobody with database access can tell who voted for
-- what, or link one person's votes across polls. There is deliberately no
-- timestamp on a vote either.
--
-- comp_polls.status moves forward only:
--   draft      row exists, Discord message not posted yet (a re-run posts it)
--   open       message posted, accepting votes until closes_at
--   closed     winner chosen, message shows final results
--   created    WOM competitions exist for the winner
--   announced  winners message posted
--
-- is_test rows are short polls for trying the bot in a test channel. They
-- never create WOM competitions, and do not take the (week_start, category)
-- slot a real poll needs.
--
-- Only the service role touches any of this: RLS is on with no policies, and
-- the vote function is revoked from anon and authenticated.
--
-- Idempotent. MUST BE APPLIED TO PRODUCTION BY HAND. Merging does not run
-- migrations.

CREATE TABLE IF NOT EXISTS public.comp_polls (
  id                    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  week_start            date NOT NULL,          -- Monday the winning competitions start
  category              text NOT NULL CHECK (category IN ('sotw', 'botw', 'rotw')),
  is_test               boolean NOT NULL DEFAULT false,
  question              text NOT NULL,
  options               jsonb NOT NULL,         -- [{name, metrics[], entryLevel?, emoji?}]
  opens_at              timestamptz NOT NULL,
  closes_at             timestamptz NOT NULL,
  competition_starts_at timestamptz NOT NULL,
  competition_ends_at   timestamptz NOT NULL,
  discord_channel_id    text NOT NULL,
  discord_message_id    text,
  status                text NOT NULL DEFAULT 'draft'
                          CHECK (status IN ('draft', 'open', 'closed', 'created', 'announced')),
  winner_index          smallint,
  vote_counts           integer[],              -- final tally, set when closed
  wom_competitions      jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{metric, id, title}]
  created_at            timestamptz NOT NULL DEFAULT now(),
  closed_at             timestamptz,
  CHECK (jsonb_typeof(options) = 'array' AND jsonb_array_length(options) BETWEEN 1 AND 5),
  CHECK (closes_at > opens_at)
);

-- One real poll per category per week. Test polls are exempt.
CREATE UNIQUE INDEX IF NOT EXISTS comp_polls_one_per_week
  ON public.comp_polls (week_start, category)
  WHERE NOT is_test;

-- The Friday job looks for polls past closes_at that are not finished.
CREATE INDEX IF NOT EXISTS comp_polls_unfinished
  ON public.comp_polls (closes_at)
  WHERE status IN ('open', 'closed', 'created');

CREATE TABLE IF NOT EXISTS public.comp_poll_votes (
  poll_id      bigint NOT NULL REFERENCES public.comp_polls (id) ON DELETE CASCADE,
  voter_hash   text NOT NULL CHECK (voter_hash ~ '^[0-9a-f]{64}$'),
  option_index smallint NOT NULL CHECK (option_index BETWEEN 0 AND 4),
  PRIMARY KEY (poll_id, voter_hash)
);

ALTER TABLE public.comp_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comp_poll_votes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.comp_polls FROM anon, authenticated;
REVOKE ALL ON public.comp_poll_votes FROM anon, authenticated;

-- Record (or change) one vote and return what the Netlify function needs to
-- reply and to redraw the tally, in a single round trip. Discord gives the
-- function 3 seconds.
--
-- result is one of:
--   voted      first vote in this poll
--   changed    moved from `previous` to the new option
--   unchanged  clicked the option they already had
--   closed     poll is past closes_at or no longer open; nothing recorded
--   not_found  no such poll
--   bad_option option index out of range
CREATE OR REPLACE FUNCTION public.cast_comp_poll_vote(
  p_poll_id bigint,
  p_voter_hash text,
  p_option_index integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_poll     comp_polls%ROWTYPE;
  v_previous smallint;
  v_result   text;
  v_counts   integer[];
BEGIN
  SELECT * INTO v_poll FROM comp_polls WHERE id = p_poll_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('result', 'not_found');
  END IF;

  IF v_poll.status <> 'open' OR now() >= v_poll.closes_at THEN
    RETURN jsonb_build_object('result', 'closed');
  END IF;

  IF p_option_index < 0 OR p_option_index >= jsonb_array_length(v_poll.options) THEN
    RETURN jsonb_build_object('result', 'bad_option');
  END IF;

  SELECT option_index INTO v_previous
    FROM comp_poll_votes
   WHERE poll_id = p_poll_id AND voter_hash = p_voter_hash;

  IF v_previous IS NULL THEN
    v_result := 'voted';
  ELSIF v_previous = p_option_index THEN
    v_result := 'unchanged';
  ELSE
    v_result := 'changed';
  END IF;

  INSERT INTO comp_poll_votes (poll_id, voter_hash, option_index)
  VALUES (p_poll_id, p_voter_hash, p_option_index)
  ON CONFLICT (poll_id, voter_hash) DO UPDATE SET option_index = EXCLUDED.option_index;

  SELECT array_agg(COALESCE(c.n, 0)::integer ORDER BY i)
    INTO v_counts
    FROM generate_series(0, jsonb_array_length(v_poll.options) - 1) AS i
    LEFT JOIN (
      SELECT option_index, count(*) AS n
        FROM comp_poll_votes
       WHERE poll_id = p_poll_id
       GROUP BY option_index
    ) c ON c.option_index = i;

  RETURN jsonb_build_object(
    'result', v_result,
    'previous', v_previous,
    'counts', to_jsonb(v_counts),
    'poll', jsonb_build_object(
      'id', v_poll.id,
      'question', v_poll.question,
      'options', v_poll.options,
      'closes_at', v_poll.closes_at,
      'discord_channel_id', v_poll.discord_channel_id,
      'discord_message_id', v_poll.discord_message_id
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.cast_comp_poll_vote(bigint, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cast_comp_poll_vote(bigint, text, integer) TO service_role;
