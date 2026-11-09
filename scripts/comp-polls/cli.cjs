/**
 * Shared setup for the command-line entry points: arguments, environment, and
 * the real store / Discord / WOM dependencies the jobs take.
 */

const { createClient } = require('@supabase/supabase-js');
const { createStore } = require('./store.cjs');
const discord = require('./discord.cjs');
const wom = require('./wom.cjs');

/** --dry-run, --test, --at <iso>, --closes-in <minutes> */
function parseArgs(argv) {
  const args = { dryRun: false, test: false, at: null, closesInMinutes: 10 };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--test') args.test = true;
    else if (arg === '--at') args.at = new Date(argv[++i]);
    else if (arg === '--closes-in') args.closesInMinutes = Number(argv[++i]);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (args.at && Number.isNaN(args.at.getTime())) throw new Error('--at needs an ISO date, e.g. 2026-11-16T19:05:00Z');
  if (!(args.closesInMinutes >= 2 && args.closesInMinutes <= 7 * 24 * 60)) {
    throw new Error('--closes-in needs a number of minutes, at least 2');
  }
  return args;
}

/** Fail fast, naming every missing variable at once. Never prints values. */
function requireEnv(names) {
  const missing = names.filter((n) => !process.env[n]);
  if (missing.length) throw new Error(`Missing environment variables: ${missing.join(', ')}`);
}

function realDeps() {
  requireEnv(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'DISCORD_BOT_TOKEN']);
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return { store: createStore(supabase), discord, wom };
}

/** Run an async main, print the error and exit non-zero on failure (GitHub then emails). */
function run(main) {
  main()
    .then((code) => process.exit(code || 0))
    .catch((err) => {
      console.error(err.message);
      process.exit(1);
    });
}

module.exports = { parseArgs, requireEnv, realDeps, run };
