/**
 * The Monday (open) and Friday (close) jobs.
 *
 * Both are safe to run any number of times: each step checks the poll's
 * status first and only moves it forward, so a re-run resumes where a failed
 * run stopped and a duplicate cron fire does nothing. That is what lets the
 * workflow fire at both possible UTC hours and keep a Saturday backup run.
 *
 * All I/O comes in through `deps`, so tests can drive them with fakes:
 *   store   - see store.cjs
 *   discord - { getChannel, getGuildEmojis, postMessage, editMessage }
 *   wom     - { fetchGroupCompetitions, createGroupCompetition }
 */

const { CATEGORIES, CATEGORY_ORDER, competitionPayloads } = require('./pools.cjs');
const { choosePollOptions, withWeeksSince, chooseWinner } = require('./rotation.cjs');
const { weekSchedule, formatLondon } = require('./ukTime.cjs');
const { renderPoll } = require('./render.cjs');
const { attachEmojis } = require('./discord.cjs');

const MINUTE_MS = 60 * 1000;
const SUPPRESS_EMBEDS = 4;

/** What gets stored for an option: no weeksSince, which JSON would mangle. */
const storable = ({ name, metrics, entryLevel, emoji }) => ({
  name,
  metrics,
  ...(entryLevel ? { entryLevel: true } : {}),
  ...(emoji ? { emoji } : {}),
});

async function serverEmojis(discord, channelId, log) {
  try {
    const channel = await discord.getChannel(channelId);
    return await discord.getGuildEmojis(channel.guild_id);
  } catch (err) {
    log(`Could not read the server's emojis, posting without them: ${err.message}`);
    return [];
  }
}

/**
 * Post this week's three polls.
 *
 * Real polls open only between Monday 19:00 and Friday 19:00 UK; outside that
 * window it does nothing. A test run (`test: true`) ignores the window, posts
 * polls that close after `closesInMinutes`, and never touches WOM later.
 *
 * @returns {{posted: number, errors: string[]}}
 */
async function openPolls({ now, deps, channelId, test = false, closesInMinutes = 10, dryRun = false, log = console.log, rng = Math.random }) {
  const { store, discord, wom } = deps;
  const schedule = weekSchedule(now);
  const errors = [];

  if (!test) {
    if (now < schedule.pollOpensAt) {
      log(`Too early: this week's polls open ${formatLondon(schedule.pollOpensAt)}.`);
      return { posted: 0, errors };
    }
    if (now >= schedule.pollClosesAt) {
      log(`This week's polls closed ${formatLondon(schedule.pollClosesAt)}; not opening them late.`);
      return { posted: 0, errors };
    }
  }

  const opensAt = test ? now : schedule.pollOpensAt;
  const closesAt = test ? new Date(now.getTime() + closesInMinutes * MINUTE_MS) : schedule.pollClosesAt;

  const existing = test ? [] : await store.pollsForWeek(schedule.weekStart);
  const isPosted = (category) => existing.some((r) => r.category === category && r.status !== 'draft');
  // The schedule retries all evening; once the polls are up, don't call WOM or Discord.
  if (CATEGORY_ORDER.every(isPosted)) {
    log("This week's polls are already posted.");
    return { posted: 0, errors };
  }

  const competitions = await wom.fetchGroupCompetitions();
  const emojis = await serverEmojis(discord, channelId, log);

  let posted = 0;
  for (const category of CATEGORY_ORDER) {
    try {
      let row = existing.find((r) => r.category === category);
      if (row && row.status !== 'draft') {
        log(`${category}: already posted (status ${row.status}).`);
        continue;
      }

      if (!row) {
        const options = attachEmojis(choosePollOptions(category, competitions, opensAt, rng), emojis);
        log(`${category}: ${options.map((o) => o.name).join(', ')}`);
        if (dryRun) continue;

        row = await store.insertPoll({
          week_start: schedule.weekStart,
          category,
          is_test: test,
          question: CATEGORIES[category].question,
          options: options.map(storable),
          opens_at: opensAt.toISOString(),
          closes_at: closesAt.toISOString(),
          competition_starts_at: schedule.competitionStartsAt.toISOString(),
          competition_ends_at: schedule.competitionEndsAt.toISOString(),
          discord_channel_id: channelId,
        });
        if (!row) {
          log(`${category}: another run created this poll first; leaving it to that run.`);
          continue;
        }
      } else if (dryRun) {
        log(`${category}: would post the saved draft (poll ${row.id}).`);
        continue;
      }

      const message = renderPoll({
        pollId: row.id,
        question: row.question,
        options: row.options,
        counts: row.options.map(() => 0),
        closesAt: new Date(row.closes_at),
      });
      const sent = await discord.postMessage(row.discord_channel_id, message);
      await store.updatePoll(row.id, { discord_message_id: sent.id, status: 'open' });
      posted++;
      log(`${category}: posted poll ${row.id}${test ? ' (test)' : ''}, closes ${formatLondon(closesAt)}.`);
    } catch (err) {
      errors.push(`${category}: ${err.message}`);
      log(`${category}: FAILED - ${err.message}`);
    }
  }

  return { posted, errors };
}

/** Message listing the winners and their WOM links, for one batch of polls. */
function announcementMessage(polls) {
  const isTest = polls.some((p) => p.is_test);
  const first = polls[0];
  const unix = (iso) => Math.floor(new Date(iso).getTime() / 1000);

  const lines = [
    isTest ? '**Test run results** - no competitions were created.' : "**This week's votes are in!**",
    `Competitions run <t:${unix(first.competition_starts_at)}:F> to <t:${unix(first.competition_ends_at)}:F>.`,
  ];

  const ordered = [...polls].sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category));
  for (const poll of ordered) {
    const winner = poll.options[poll.winner_index];
    lines.push('', `**${CATEGORIES[poll.category].label}: ${winner.name}**`);
    for (const comp of poll.wom_competitions) {
      lines.push(`[${comp.title}](https://wiseoldman.net/competitions/${comp.id})`);
    }
  }

  return { content: lines.join('\n'), flags: SUPPRESS_EMBEDS, allowed_mentions: { parse: [] } };
}

/**
 * Close every poll past its closing time, create the winners' WOM
 * competitions, and announce each batch once all its polls are done.
 *
 * @param {boolean} createInWom real group competitions are created only when
 *   true; otherwise the payloads are logged and the polls wait at 'closed'
 *   (so turning it on later still creates them, if they have not started).
 * @returns {{closed: number, created: number, announced: number, errors: string[]}}
 */
async function closePolls({ now, deps, createInWom = false, dryRun = false, log = console.log, rng = Math.random }) {
  const { store, discord, wom } = deps;
  const result = { closed: 0, created: 0, announced: 0, errors: [] };
  const fail = (poll, err) => {
    result.errors.push(`poll ${poll.id} (${poll.category}): ${err.message}`);
    log(`poll ${poll.id} (${poll.category}): FAILED - ${err.message}`);
  };

  const due = await store.unfinishedPolls(now);
  if (due.length === 0) {
    log('Nothing to close.');
    return result;
  }

  let competitions;
  const history = async () => (competitions ??= await wom.fetchGroupCompetitions());

  // 1. Close: final count, winner, final message.
  for (let i = 0; i < due.length; i++) {
    let poll = due[i];
    if (poll.status !== 'open') continue;
    try {
      const counts = await store.voteCounts(poll.id, poll.options.length);
      const options = withWeeksSince(poll.options, await history(), new Date(poll.opens_at));
      const winnerIndex = chooseWinner(options, counts, rng);
      log(`poll ${poll.id} (${poll.category}): ${poll.options[winnerIndex].name} wins with [${counts.join(', ')}].`);
      if (dryRun) continue;

      poll = await store.updatePoll(poll.id, {
        status: 'closed',
        winner_index: winnerIndex,
        vote_counts: counts,
        closed_at: now.toISOString(),
      });
      due[i] = poll;
      result.closed++;

      try {
        await discord.editMessage(poll.discord_channel_id, poll.discord_message_id, renderPoll({
          pollId: poll.id,
          question: poll.question,
          options: poll.options,
          counts,
          closesAt: new Date(poll.closes_at),
          closed: true,
          winnerIndex,
        }));
      } catch (err) {
        // Votes are already refused by the database; only the display is stale.
        log(`poll ${poll.id}: closed, but the Discord message was not updated: ${err.message}`);
      }
    } catch (err) {
      fail(poll, err);
    }
  }

  // 2. Create the winners' competitions.
  for (let i = 0; i < due.length; i++) {
    let poll = due[i];
    if (poll.status !== 'closed') continue;
    try {
      const winner = poll.options[poll.winner_index];
      const payloads = competitionPayloads(
        poll.category, winner, new Date(poll.competition_starts_at), new Date(poll.competition_ends_at)
      );

      if (poll.is_test) {
        log(`poll ${poll.id}: test poll, would create ${payloads.map((p) => p.title).join(', ')}.`);
        if (!dryRun) due[i] = await store.updatePoll(poll.id, { status: 'created' });
        continue;
      }
      if (!createInWom || dryRun) {
        const why = dryRun ? 'dry run' : 'WOM creation is off (COMP_POLLS_CREATE_WOM)';
        log(`poll ${poll.id}: ${why}; would create ${payloads.map((p) => p.title).join(', ')}.`);
        continue;
      }
      if (new Date(poll.competition_starts_at) <= now) {
        throw new Error(`too late to create: the competition was due to start ${formatLondon(new Date(poll.competition_starts_at))}`);
      }

      const made = [...poll.wom_competitions];
      for (const payload of payloads) {
        if (made.some((c) => c.metric === payload.metric)) continue;

        // A previous run may have created it and crashed before saving the id.
        const startsAt = new Date(payload.startsAt).getTime();
        const already = (await history()).find(
          (c) => c.metric === payload.metric && new Date(c.startsAt).getTime() === startsAt
        );
        const comp = already
          ? { id: already.id, title: already.title, metric: already.metric }
          : await wom.createGroupCompetition(payload);
        made.push({ metric: comp.metric, id: comp.id, title: comp.title });
        poll = await store.updatePoll(poll.id, { wom_competitions: made });
        log(`poll ${poll.id}: ${already ? 'found existing' : 'created'} WOM competition ${comp.id} "${comp.title}".`);
      }

      due[i] = await store.updatePoll(poll.id, { status: 'created' });
      result.created++;
    } catch (err) {
      fail(poll, err);
    }
  }

  // 3. Announce each batch whose polls all have their competitions.
  const seen = new Set();
  for (const poll of due) {
    const key = `${poll.week_start}|${poll.is_test}|${new Date(poll.opens_at).toISOString()}`;
    if (seen.has(key) || poll.status !== 'created') continue;
    seen.add(key);
    try {
      const batch = await store.pollBatch(poll);
      if (!batch.every((p) => p.status === 'created' || p.status === 'announced')) continue;
      const pending = batch.filter((p) => p.status === 'created');
      if (pending.length === 0 || dryRun) continue;

      await discord.postMessage(poll.discord_channel_id, announcementMessage(batch));
      for (const p of pending) await store.updatePoll(p.id, { status: 'announced' });
      result.announced++;
      log(`Announced winners for the week of ${poll.week_start}${poll.is_test ? ' (test)' : ''}.`);
    } catch (err) {
      fail(poll, err);
    }
  }

  return result;
}

module.exports = { openPolls, closePolls, announcementMessage };
