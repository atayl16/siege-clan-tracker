/**
 * Shows what the next week's polls would offer. Posts nothing, writes nothing.
 *
 *   node scripts/comp-polls/preview.cjs
 *   node scripts/comp-polls/preview.cjs --at 2026-11-16T12:00:00Z   pretend it is then
 *   node scripts/comp-polls/preview.cjs --seed 42                   repeatable draw
 *   node scripts/comp-polls/preview.cjs --json                      also print the Discord message bodies
 *
 * The draw is random, so two runs usually differ. Use --seed to compare.
 */

const { CATEGORIES, CATEGORY_ORDER, competitionPayloads, uncoveredBossMetrics } = require('./pools.cjs');
const { choosePollOptions } = require('./rotation.cjs');
const { nextPollSchedule, formatLondon } = require('./ukTime.cjs');
const { renderPoll } = require('./render.cjs');
const { fetchGroupCompetitions, fetchBossMetrics } = require('./wom.cjs');

function parseArgs(argv) {
  const args = { at: new Date(), seed: null, json: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--at') args.at = new Date(argv[++i]);
    else if (argv[i] === '--seed') args.seed = Number(argv[++i]);
    else if (argv[i] === '--json') args.json = true;
    else throw new Error(`Unknown argument: ${argv[i]}`);
  }
  if (Number.isNaN(args.at.getTime())) throw new Error('--at needs an ISO date, e.g. 2026-11-16T12:00:00Z');
  if (args.seed !== null && !Number.isInteger(args.seed)) throw new Error('--seed needs a whole number');
  return args;
}

/** Small seeded PRNG (mulberry32), only so --seed gives the same draw twice. */
function seededRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function describeAge(weeksSince) {
  if (weeksSince === Infinity) return 'never run';
  const weeks = Math.floor(weeksSince);
  return `last ran ${weeks} week${weeks === 1 ? '' : 's'} ago`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const rng = args.seed === null ? Math.random : seededRng(args.seed);
  const schedule = nextPollSchedule(args.at);

  const [competitions, bossMetrics] = await Promise.all([fetchGroupCompetitions(), fetchBossMetrics()]);

  console.log(`Polls open   ${formatLondon(schedule.pollOpensAt)}`);
  console.log(`Polls close  ${formatLondon(schedule.pollClosesAt)}`);
  console.log(`Winners run  ${formatLondon(schedule.competitionStartsAt)} to ${formatLondon(schedule.competitionEndsAt)}`);
  console.log(`Based on ${competitions.length} WOM competitions${args.seed === null ? '' : `, seed ${args.seed}`}.`);

  for (const category of CATEGORY_ORDER) {
    const { question } = CATEGORIES[category];
    const options = choosePollOptions(category, competitions, schedule.pollOpensAt, rng);

    console.log(`\n${question}`);
    const width = Math.max(...options.map((o) => o.name.length));
    for (const option of options) {
      const label = option.entryLevel ? ' (entry-level)' : '';
      console.log(`  ${option.name.padEnd(width)}  ${describeAge(option.weeksSince)}${label}`);
      const titles = competitionPayloads(category, option, schedule.competitionStartsAt, schedule.competitionEndsAt)
        .map((c) => c.title);
      console.log(`  ${''.padEnd(width)}  creates: ${titles.join(', ')}`);
    }

    if (args.json) {
      const message = renderPoll({
        pollId: `preview-${category}`,
        question,
        options,
        counts: options.map(() => 0),
        closesAt: schedule.pollClosesAt,
      });
      console.log(JSON.stringify(message, null, 2));
    }
  }

  const uncovered = uncoveredBossMetrics(bossMetrics);
  if (uncovered.length) {
    console.log(`\nWARNING: WOM tracks bosses no poll offers: ${uncovered.join(', ')}`);
    console.log('Add them to BOSS_OPTIONS (or EXCLUDED_BOSS_METRICS) in scripts/comp-polls/pools.cjs.');
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
