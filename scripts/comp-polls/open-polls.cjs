/**
 * Monday job: post this week's SotW / BotW / RotW polls.
 *
 *   node scripts/comp-polls/open-polls.cjs                  real polls, only Mon 19:00 - Fri 19:00 UK
 *   node scripts/comp-polls/open-polls.cjs --dry-run        show the options, post and save nothing
 *   node scripts/comp-polls/open-polls.cjs --test --closes-in 15
 *        three test polls that close in 15 minutes; they never create WOM competitions
 *   node scripts/comp-polls/open-polls.cjs --at 2026-11-16T19:05:00Z   pretend it is then
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DISCORD_BOT_TOKEN,
 *      DISCORD_POLLS_CHANNEL_ID; optional WOM_API_KEY, WOM_GROUP_ID.
 */

const { parseArgs, requireEnv, realDeps, run } = require('./cli.cjs');
const { openPolls } = require('./jobs.cjs');

run(async () => {
  const args = parseArgs(process.argv.slice(2));
  requireEnv(['DISCORD_POLLS_CHANNEL_ID']);

  const { posted, errors } = await openPolls({
    now: args.at || new Date(),
    deps: realDeps(),
    channelId: process.env.DISCORD_POLLS_CHANNEL_ID,
    test: args.test,
    closesInMinutes: args.closesInMinutes,
    dryRun: args.dryRun,
  });

  console.log(`Posted ${posted} poll(s).`);
  if (errors.length) {
    console.error(`${errors.length} problem(s):\n- ${errors.join('\n- ')}`);
    return 1;
  }
  return 0;
});
