/**
 * Choosing poll options, and choosing a winner.
 *
 * "How recently was this run" comes from WOM's own competition list, by
 * metric, so competitions made by hand count too, and so do ones already
 * scheduled for the future. An option covering several metrics (Dagannoth
 * Kings) counts as run when any of its metrics was.
 *
 * Everything here is pure. Pass `rng` to make draws repeatable in tests.
 */

const { CATEGORIES } = require('./pools.cjs');

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// Weight given to an option that has never run, and the cap for very old ones,
// so a boss last done three years ago does not crowd out everything else.
const NEVER_RUN_WEEKS = 104;

/** metric -> latest endsAt (ms) across a WOM competition list. */
function lastEndByMetric(competitions) {
  const lastEnds = new Map();
  for (const comp of competitions) {
    const end = new Date(comp.endsAt).getTime();
    if (Number.isNaN(end)) continue;
    const prev = lastEnds.get(comp.metric);
    if (prev === undefined || end > prev) lastEnds.set(comp.metric, end);
  }
  return lastEnds;
}

/**
 * Weeks from the option's most recent competition ending to `asOf`.
 * Infinity if it has never run; negative if it is still running or scheduled.
 */
function weeksSinceLastRun(option, lastEnds, asOf) {
  let latest;
  for (const metric of option.metrics) {
    const end = lastEnds.get(metric);
    if (end !== undefined && (latest === undefined || end > latest)) latest = end;
  }
  if (latest === undefined) return Infinity;
  return (asOf.getTime() - latest) / WEEK_MS;
}

function drawWeight(weeksSince) {
  return Math.min(NEVER_RUN_WEEKS, Math.max(1, weeksSince));
}

/** Weighted sample of `n` items without replacement. */
function weightedSample(items, n, weightOf, rng) {
  const remaining = [...items];
  const picked = [];
  while (picked.length < n && remaining.length > 0) {
    const total = remaining.reduce((sum, item) => sum + weightOf(item), 0);
    let roll = rng() * total;
    let index = remaining.length - 1;
    for (let i = 0; i < remaining.length; i++) {
      roll -= weightOf(remaining[i]);
      if (roll < 0) {
        index = i;
        break;
      }
    }
    picked.push(remaining.splice(index, 1)[0]);
  }
  return picked;
}

/**
 * Draw `count` options from `pool`, skipping anything whose last competition
 * ended less than `recentWeeks` before `asOf` (or has not ended). Longer since
 * last run means more likely to be drawn.
 *
 * If too few are eligible, the gap is filled with whatever ran longest ago,
 * but never with something running or scheduled right now.
 */
function drawOptions(pool, { count, recentWeeks }, lastEnds, asOf, rng) {
  const annotated = pool.map((option) => ({
    ...option,
    weeksSince: weeksSinceLastRun(option, lastEnds, asOf),
  }));

  const eligible = annotated.filter((o) => o.weeksSince >= recentWeeks);
  const picked = weightedSample(eligible, count, (o) => drawWeight(o.weeksSince), rng);

  // Short only when every eligible option was already picked.
  if (picked.length < count) {
    const fallback = annotated
      .filter((o) => o.weeksSince < recentWeeks && o.weeksSince >= 0)
      .sort((a, b) => b.weeksSince - a.weeksSince);
    picked.push(...fallback.slice(0, count - picked.length));
  }

  return picked;
}

const byName = (a, b) => a.name.localeCompare(b.name);

/**
 * The options for one poll, alphabetical, each annotated with `weeksSince`.
 *
 * @param {'sotw'|'botw'|'rotw'} category
 * @param {Array<{metric: string, endsAt: string}>} competitions WOM group competitions
 * @param {Date} asOf when the poll opens (use the scheduled time, not "now")
 */
function choosePollOptions(category, competitions, asOf, rng = Math.random) {
  const rules = CATEGORIES[category];
  if (!rules) throw new Error(`Unknown poll category: ${category}`);

  const lastEnds = lastEndByMetric(competitions);
  const { pool, optionCount, recentWeeks, entryLevelSlots = 0 } = rules;

  if (!entryLevelSlots) {
    return drawOptions(pool, { count: optionCount, recentWeeks }, lastEnds, asOf, rng).sort(byName);
  }

  const entry = drawOptions(
    pool.filter((o) => o.entryLevel),
    { count: entryLevelSlots, recentWeeks },
    lastEnds, asOf, rng
  );
  const rest = drawOptions(
    pool.filter((o) => !o.entryLevel),
    { count: optionCount - entry.length, recentWeeks },
    lastEnds, asOf, rng
  );
  return [...entry, ...rest].sort(byName);
}

/**
 * Re-annotate stored options with `weeksSince`. Needed before chooseWinner
 * when options come back from the database, because JSON turns Infinity
 * (never run) into null.
 */
function withWeeksSince(options, competitions, asOf) {
  const lastEnds = lastEndByMetric(competitions);
  return options.map((option) => ({
    ...option,
    weeksSince: weeksSinceLastRun(option, lastEnds, asOf),
  }));
}

/**
 * Index of the winning option. Most votes wins; a tie goes to whichever was
 * run least recently (never-run beats everything); a tie on that too is
 * settled by `rng`. With no votes at all, every option is tied.
 *
 * @param {Array<{weeksSince: number}>} options from choosePollOptions or withWeeksSince
 * @param {number[]} counts votes per option, same order
 */
function chooseWinner(options, counts, rng = Math.random) {
  if (options.length === 0) throw new Error('Cannot choose a winner from no options');
  if (counts.length !== options.length) {
    throw new Error(`Got ${counts.length} vote counts for ${options.length} options`);
  }

  const top = Math.max(...counts);
  let tied = options.map((_, i) => i).filter((i) => counts[i] === top);

  const oldest = Math.max(...tied.map((i) => options[i].weeksSince));
  tied = tied.filter((i) => options[i].weeksSince === oldest);

  return tied[Math.floor(rng() * tied.length)];
}

module.exports = {
  NEVER_RUN_WEEKS,
  lastEndByMetric,
  weeksSinceLastRun,
  weightedSample,
  drawOptions,
  choosePollOptions,
  withWeeksSince,
  chooseWinner,
};
