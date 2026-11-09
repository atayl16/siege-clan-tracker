/**
 * Friday job: close every poll past its closing time, create the winners' WOM
 * competitions, and post the winners. Safe to re-run; it resumes.
 *
 *   node scripts/comp-polls/close-polls.cjs
 *   node scripts/comp-polls/close-polls.cjs --dry-run       show winners, change nothing
 *
 * WOM competitions are created only when COMP_POLLS_CREATE_WOM is "true".
 * Otherwise winners are chosen and shown, the competitions are just logged,
 * and the polls wait; setting it later creates them if they have not started.
 * Test polls never create competitions.
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DISCORD_BOT_TOKEN;
 *      WOM_GROUP_ID and WOM_VERIFICATION_CODE when creating; optional WOM_API_KEY.
 */

const { parseArgs, requireEnv, realDeps, run } = require('./cli.cjs');
const { closePolls } = require('./jobs.cjs');

run(async () => {
  const args = parseArgs(process.argv.slice(2));
  const createInWom = process.env.COMP_POLLS_CREATE_WOM === 'true';
  if (createInWom) requireEnv(['WOM_GROUP_ID', 'WOM_VERIFICATION_CODE']);

  const { closed, created, announced, errors } = await closePolls({
    now: args.at || new Date(),
    deps: realDeps(),
    createInWom,
    dryRun: args.dryRun,
  });

  console.log(`Closed ${closed}, created competitions for ${created}, announced ${announced} batch(es).`);
  if (errors.length) {
    console.error(`${errors.length} problem(s):\n- ${errors.join('\n- ')}`);
    return 1;
  }
  return 0;
});
