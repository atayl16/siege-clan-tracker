// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { openPolls, closePolls, announcementMessage } = require('../jobs.cjs');
const { SKILL_OPTIONS } = require('../pools.cjs');
const { parseVoteCustomId } = require('../render.cjs');

const CHANNEL = '1569364487004364891';
const MON_OPEN = new Date('2026-11-16T19:05:00Z'); // Mon 19:05 GMT, polls open
const FRI_CLOSE = new Date('2026-11-20T19:15:00Z'); // Fri 19:15 GMT, polls closed
const COMP_STARTS = '2026-11-23T19:00:00.000Z';
const COMP_ENDS = '2026-11-30T19:00:00.000Z';
const WEEK = 7 * 24 * 60 * 60 * 1000;

const quiet = () => {};

/** In-memory stand-in for store.cjs, including the one-poll-per-week rule. */
function fakeStore() {
  const rows = [];
  const votes = new Map();
  let nextId = 1;
  const copy = (r) => (r ? JSON.parse(JSON.stringify(r)) : r);
  return {
    rows,
    setVotes: (pollId, counts) => votes.set(pollId, counts),
    async pollsForWeek(weekStart) {
      return rows.filter((r) => r.week_start === weekStart && !r.is_test).map(copy);
    },
    async insertPoll(row) {
      if (!row.is_test && rows.some((r) => !r.is_test && r.week_start === row.week_start && r.category === row.category)) {
        return null;
      }
      const saved = { id: nextId++, status: 'draft', discord_message_id: null, winner_index: null, vote_counts: null, wom_competitions: [], ...row };
      rows.push(saved);
      return copy(saved);
    },
    async updatePoll(id, patch) {
      const row = rows.find((r) => r.id === id);
      Object.assign(row, JSON.parse(JSON.stringify(patch)));
      return copy(row);
    },
    async unfinishedPolls(now) {
      return rows
        .filter((r) => ['open', 'closed', 'created'].includes(r.status) && new Date(r.closes_at) <= now)
        .map(copy);
    },
    async pollBatch({ week_start, is_test, opens_at }) {
      return rows
        .filter((r) => r.week_start === week_start && r.is_test === is_test && r.opens_at === opens_at)
        .map(copy);
    },
    async voteCounts(pollId, n) {
      return votes.get(pollId) || new Array(n).fill(0);
    },
  };
}

function fakeDiscord({ emojis = [] } = {}) {
  let nextMessage = 1000;
  const d = {
    posts: [],
    edits: [],
    failPostsFor: new Set(),
    async getChannel(id) {
      return { id, guild_id: 'guild-1', name: 'bot-test' };
    },
    async getGuildEmojis() {
      return emojis;
    },
    async postMessage(channelId, message) {
      const question = message.embeds?.[0]?.title;
      if (question && [...d.failPostsFor].some((q) => question.includes(q))) {
        d.failPostsFor.clear();
        throw new Error('Discord 500');
      }
      d.posts.push({ channelId, message });
      return { id: String(nextMessage++) };
    },
    async editMessage(channelId, messageId, message) {
      d.edits.push({ channelId, messageId, message });
    },
  };
  return d;
}

function fakeWom(history = []) {
  let nextId = 500;
  const w = {
    history,
    created: [],
    failOn: null,
    async fetchGroupCompetitions() {
      return w.history;
    },
    async createGroupCompetition(payload) {
      if (w.failOn === payload.metric) {
        w.failOn = null;
        throw new Error('WOM 503');
      }
      const comp = { id: nextId++, title: payload.title, metric: payload.metric };
      w.created.push({ ...payload, id: comp.id });
      return comp;
    },
  };
  return w;
}

/** History where every skill but `fresh` ran recently, so SotW is exactly `fresh`. */
function historyOfferingSkills(fresh) {
  return SKILL_OPTIONS.filter((o) => !fresh.includes(o.metrics[0])).map((o) => ({
    metric: o.metrics[0],
    startsAt: new Date(MON_OPEN.getTime() - 2 * WEEK).toISOString(),
    endsAt: new Date(MON_OPEN.getTime() - WEEK).toISOString(),
  }));
}

describe('openPolls', () => {
  let store;
  let discord;
  let wom;
  let deps;
  beforeEach(() => {
    store = fakeStore();
    discord = fakeDiscord({ emojis: [{ id: '42', name: 'Farming' }] });
    wom = fakeWom(historyOfferingSkills(['farming', 'sailing', 'prayer', 'mining', 'hunter']));
    deps = { store, discord, wom };
  });
  const open = (now, extra = {}) => openPolls({ now, deps, channelId: CHANNEL, log: quiet, ...extra });

  it('does nothing before Monday 19:00 UK', async () => {
    const res = await open(new Date('2026-11-16T18:30:00Z'));
    expect(res.posted).toBe(0);
    expect(store.rows).toHaveLength(0);
  });

  it('does nothing once Friday 19:00 UK has passed', async () => {
    const res = await open(new Date('2026-11-21T10:00:00Z'));
    expect(res.posted).toBe(0);
    expect(store.rows).toHaveLength(0);
  });

  it('posts SotW, BotW and RotW with buttons tied to the saved poll', async () => {
    const res = await open(MON_OPEN);
    expect(res).toEqual({ posted: 3, errors: [] });
    expect(store.rows.map((r) => r.category)).toEqual(['sotw', 'botw', 'rotw']);

    for (const row of store.rows) {
      expect(row.status).toBe('open');
      expect(row.week_start).toBe('2026-11-23');
      expect(row.opens_at).toBe('2026-11-16T19:00:00.000Z');
      expect(row.closes_at).toBe('2026-11-20T19:00:00.000Z');
      expect(row.competition_starts_at).toBe(COMP_STARTS);
      expect(row.discord_channel_id).toBe(CHANNEL);
      for (const option of row.options) expect(option).not.toHaveProperty('weeksSince');
    }

    const sotw = store.rows[0];
    expect(sotw.options.map((o) => o.name)).toEqual(['Farming', 'Hunter', 'Mining', 'Prayer', 'Sailing']);
    expect(sotw.options[0].emoji).toEqual({ id: '42', name: 'Farming', animated: false });

    const buttons = discord.posts[0].message.components[0].components;
    expect(buttons.map((b) => parseVoteCustomId(b.custom_id))).toEqual(
      [0, 1, 2, 3, 4].map((i) => ({ pollId: String(sotw.id), optionIndex: i }))
    );
    expect(sotw.discord_message_id).toBe('1000');
  });

  it('a second run the same week posts nothing new', async () => {
    await open(MON_OPEN);
    const res = await open(new Date(MON_OPEN.getTime() + 60 * 60 * 1000));
    expect(res.posted).toBe(0);
    expect(store.rows).toHaveLength(3);
    expect(discord.posts).toHaveLength(3);
  });

  it('once all three are posted, a retry does not call WOM or Discord', async () => {
    await open(MON_OPEN);
    const calls = [];
    const offline = (name) => async () => {
      calls.push(name);
      throw new Error(`${name} should not be called`);
    };
    wom.fetchGroupCompetitions = offline('fetchGroupCompetitions');
    discord.getChannel = offline('getChannel');
    discord.getGuildEmojis = offline('getGuildEmojis');

    const res = await open(new Date(MON_OPEN.getTime() + 15 * 60 * 1000));
    expect(res).toEqual({ posted: 0, errors: [] });
    expect(calls).toEqual([]);
  });

  it('a failed post leaves a draft that the next run posts, without redrawing options', async () => {
    discord.failPostsFor.add('skill');
    const first = await open(MON_OPEN);
    expect(first.posted).toBe(2);
    expect(first.errors[0]).toMatch(/sotw: Discord 500/);
    const draft = store.rows.find((r) => r.category === 'sotw');
    expect(draft.status).toBe('draft');
    const optionsBefore = JSON.stringify(draft.options);

    const second = await open(MON_OPEN);
    expect(second).toEqual({ posted: 1, errors: [] });
    expect(store.rows).toHaveLength(3);
    expect(store.rows.find((r) => r.category === 'sotw').status).toBe('open');
    expect(JSON.stringify(store.rows.find((r) => r.category === 'sotw').options)).toBe(optionsBefore);
  });

  it('dry run saves and posts nothing', async () => {
    await open(MON_OPEN, { dryRun: true });
    expect(store.rows).toHaveLength(0);
    expect(discord.posts).toHaveLength(0);
  });

  it('posts without emojis if the server emoji list cannot be read', async () => {
    discord.getGuildEmojis = async () => { throw new Error('403'); };
    const res = await open(MON_OPEN);
    expect(res.posted).toBe(3);
    expect(store.rows[0].options.some((o) => o.emoji)).toBe(false);
  });

  it('test polls ignore the schedule, close soon, and do not block the real polls', async () => {
    // Saturday: outside the real window, but the same poll week as MON_OPEN.
    const saturday = new Date('2026-11-21T12:00:00Z');
    const res = await open(saturday, { test: true, closesInMinutes: 15 });
    expect(res.posted).toBe(3);
    for (const row of store.rows) {
      expect(row.is_test).toBe(true);
      expect(row.week_start).toBe('2026-11-23');
      expect(new Date(row.closes_at) - saturday).toBe(15 * 60 * 1000);
    }

    const real = await open(MON_OPEN);
    expect(real.posted).toBe(3);
    expect(store.rows.filter((r) => !r.is_test)).toHaveLength(3);
  });
});

/** A poll row as openPolls would have left it. */
function openPoll(store, overrides) {
  const row = {
    id: store.rows.length + 1,
    week_start: '2026-11-23',
    is_test: false,
    question: 'q',
    opens_at: '2026-11-16T19:00:00.000Z',
    closes_at: '2026-11-20T19:00:00.000Z',
    competition_starts_at: COMP_STARTS,
    competition_ends_at: COMP_ENDS,
    discord_channel_id: CHANNEL,
    discord_message_id: `msg-${store.rows.length + 1}`,
    status: 'open',
    winner_index: null,
    vote_counts: null,
    wom_competitions: [],
    ...overrides,
  };
  store.rows.push(row);
  return row;
}

describe('closePolls', () => {
  let store;
  let discord;
  let wom;
  let deps;
  beforeEach(() => {
    store = fakeStore();
    discord = fakeDiscord();
    wom = fakeWom([]);
    deps = { store, discord, wom };
  });
  const close = (now, extra = {}) => closePolls({ now, deps, createInWom: true, log: quiet, ...extra });

  function weekOfPolls() {
    const sotw = openPoll(store, { category: 'sotw', question: 'Skill?', options: [
      { name: 'Farming', metrics: ['farming'] }, { name: 'Sailing', metrics: ['sailing'] },
    ] });
    const botw = openPoll(store, { category: 'botw', question: 'Boss?', options: [
      { name: 'Obor', metrics: ['obor'], entryLevel: true },
      { name: 'Dagannoth Kings', metrics: ['dagannoth_prime', 'dagannoth_rex', 'dagannoth_supreme'] },
    ] });
    const rotw = openPoll(store, { category: 'rotw', question: 'Raid?', options: [
      { name: 'Theatre of Blood', metrics: ['theatre_of_blood', 'theatre_of_blood_hard_mode'] },
      { name: 'The Fractured Archive', metrics: ['the_fractured_archive'] },
    ] });
    store.setVotes(sotw.id, [7, 3]);
    store.setVotes(botw.id, [2, 9]);
    store.setVotes(rotw.id, [1, 4]);
    return { sotw, botw, rotw };
  }

  it('leaves polls alone until they close', async () => {
    weekOfPolls();
    const res = await close(new Date('2026-11-20T18:59:00Z'));
    expect(res.closed).toBe(0);
    expect(store.rows.every((r) => r.status === 'open')).toBe(true);
  });

  it('closes, creates one WOM competition per metric, and announces once', async () => {
    const { sotw, botw } = weekOfPolls();
    const res = await close(FRI_CLOSE);
    expect(res).toEqual({ closed: 3, created: 3, announced: 1, errors: [] });

    expect(store.rows.map((r) => [r.winner_index, r.vote_counts, r.status])).toEqual([
      [0, [7, 3], 'announced'],
      [1, [2, 9], 'announced'],
      [1, [1, 4], 'announced'],
    ]);

    const final = discord.edits.find((e) => e.messageId === sotw.discord_message_id).message;
    expect(final.components[0].components.every((b) => b.disabled)).toBe(true);
    expect(final.embeds[0].description).toContain('**Farming** - winner');

    expect(wom.created.map((c) => c.title)).toEqual([
      'Siege SotW - Farming',
      'Siege BotW - Dagannoth Prime',
      'Siege BotW - Dagannoth Rex',
      'Siege BotW - Dagannoth Supreme',
      'Siege RotW - The Fractured Archive',
    ]);
    for (const c of wom.created) {
      expect(c.startsAt).toBe(COMP_STARTS);
      expect(c.endsAt).toBe(COMP_ENDS);
    }
    expect(store.rows.find((r) => r.id === botw.id).wom_competitions.map((c) => c.metric)).toEqual([
      'dagannoth_prime', 'dagannoth_rex', 'dagannoth_supreme',
    ]);

    expect(discord.posts).toHaveLength(1);
    const { content, flags } = discord.posts[0].message;
    expect(flags).toBe(4);
    expect(content).toContain('**Skill of the Week: Farming**');
    expect(content).toContain('**Boss of the Week: Dagannoth Kings**');
    expect(content).toContain('[Siege BotW - Dagannoth Rex](https://wiseoldman.net/competitions/');

    const again = await close(new Date(FRI_CLOSE.getTime() + 60 * 60 * 1000));
    expect(again).toEqual({ closed: 0, created: 0, announced: 0, errors: [] });
    expect(wom.created).toHaveLength(5);
    expect(discord.posts).toHaveLength(1);
  });

  it('with WOM creation off, picks winners but waits; turning it on finishes the job', async () => {
    weekOfPolls();
    const off = await close(FRI_CLOSE, { createInWom: false });
    expect(off).toEqual({ closed: 3, created: 0, announced: 0, errors: [] });
    expect(store.rows.every((r) => r.status === 'closed')).toBe(true);
    expect(wom.created).toHaveLength(0);

    const on = await close(new Date('2026-11-21T10:00:00Z'));
    expect(on).toEqual({ closed: 0, created: 3, announced: 1, errors: [] });
  });

  it('adopts a competition a crashed run already created instead of duplicating it', async () => {
    const { sotw } = weekOfPolls();
    wom.history.push({ id: 77, title: 'Siege SotW - Farming', metric: 'farming', startsAt: COMP_STARTS, endsAt: COMP_ENDS });
    await close(FRI_CLOSE);
    expect(wom.created.map((c) => c.metric)).not.toContain('farming');
    expect(store.rows.find((r) => r.id === sotw.id).wom_competitions).toEqual([
      { metric: 'farming', id: 77, title: 'Siege SotW - Farming' },
    ]);
  });

  it('resumes a half-created bundle without re-creating what exists', async () => {
    const { botw } = weekOfPolls();
    wom.failOn = 'dagannoth_rex';
    const first = await close(FRI_CLOSE);
    expect(first.errors[0]).toMatch(/botw.*WOM 503/);
    expect(first.announced).toBe(0);
    expect(store.rows.find((r) => r.id === botw.id).wom_competitions.map((c) => c.metric)).toEqual(['dagannoth_prime']);

    const second = await close(new Date(FRI_CLOSE.getTime() + 60 * 60 * 1000));
    expect(second.errors).toEqual([]);
    expect(second.announced).toBe(1);
    expect(wom.created.filter((c) => c.metric.startsWith('dagannoth')).map((c) => c.metric)).toEqual([
      'dagannoth_prime', 'dagannoth_rex', 'dagannoth_supreme',
    ]);
  });

  it('refuses to create a competition that should already have started', async () => {
    weekOfPolls();
    await close(FRI_CLOSE, { createInWom: false });
    const late = await close(new Date('2026-11-24T10:00:00Z'));
    expect(late.created).toBe(0);
    expect(late.errors).toHaveLength(3);
    expect(late.errors[0]).toMatch(/too late/);
    expect(wom.created).toHaveLength(0);
  });

  it('with no votes, the option run least recently wins', async () => {
    const poll = openPoll(store, { category: 'sotw', options: [
      { name: 'Farming', metrics: ['farming'] }, { name: 'Sailing', metrics: ['sailing'] },
    ] });
    wom.history.push({ metric: 'farming', startsAt: '2026-01-01T00:00:00Z', endsAt: '2026-01-08T00:00:00Z' });
    await close(FRI_CLOSE);
    expect(store.rows.find((r) => r.id === poll.id).winner_index).toBe(1); // Sailing never ran
  });

  it('test polls never create WOM competitions, and say so', async () => {
    const t = {
      is_test: true,
      opens_at: '2026-11-15T12:00:00.000Z',
      closes_at: '2026-11-15T12:15:00.000Z',
    };
    openPoll(store, { ...t, category: 'sotw', options: [{ name: 'Farming', metrics: ['farming'] }] });
    openPoll(store, { ...t, category: 'rotw', options: [{ name: 'The Fractured Archive', metrics: ['the_fractured_archive'] }] });
    const res = await close(new Date('2026-11-15T12:20:00Z'));
    expect(res).toEqual({ closed: 2, created: 0, announced: 1, errors: [] });
    expect(wom.created).toHaveLength(0);
    expect(discord.posts[0].message.content).toMatch(/Test run results/);
    expect(store.rows.every((r) => r.status === 'announced')).toBe(true);
  });

  it('dry run changes nothing', async () => {
    weekOfPolls();
    await close(FRI_CLOSE, { dryRun: true });
    expect(store.rows.every((r) => r.status === 'open')).toBe(true);
    expect(discord.posts).toHaveLength(0);
    expect(discord.edits).toHaveLength(0);
    expect(wom.created).toHaveLength(0);
  });
});

describe('announcementMessage', () => {
  it('orders SotW, BotW, RotW and never pings', () => {
    const base = { competition_starts_at: COMP_STARTS, competition_ends_at: COMP_ENDS, is_test: false, winner_index: 0 };
    const msg = announcementMessage([
      { ...base, category: 'rotw', options: [{ name: 'ToB' }], wom_competitions: [] },
      { ...base, category: 'sotw', options: [{ name: 'Farming' }], wom_competitions: [{ id: 1, title: 'Siege SotW - Farming' }] },
    ]);
    expect(msg.content.indexOf('Skill of the Week')).toBeLessThan(msg.content.indexOf('Raid of the Week'));
    expect(msg.allowed_mentions).toEqual({ parse: [] });
  });
});
