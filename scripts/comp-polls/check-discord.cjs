/**
 * Checks the bot's Discord setup without posting anything:
 *   - the token works (and which bot it belongs to)
 *   - the bot can see the polls channel, and which server it is in
 *   - which custom emojis the poll buttons will pick up
 *
 *   node scripts/comp-polls/check-discord.cjs
 *
 * Env: DISCORD_BOT_TOKEN, DISCORD_POLLS_CHANNEL_ID. The token is never printed.
 */

const { requireEnv, run } = require('./cli.cjs');
const { getCurrentUser, getChannel, getGuildEmojis, attachEmojis } = require('./discord.cjs');
const { SKILL_OPTIONS, BOSS_OPTIONS, RAID_OPTIONS } = require('./pools.cjs');

run(async () => {
  requireEnv(['DISCORD_BOT_TOKEN', 'DISCORD_POLLS_CHANNEL_ID']);

  const bot = await getCurrentUser().catch((err) => {
    throw new Error(`The bot token was rejected (${err.status || err.message}). Reset it in the developer portal and set it again.`);
  });
  console.log(`Token OK: bot "${bot.username}" (${bot.id}).`);

  const channelId = process.env.DISCORD_POLLS_CHANNEL_ID;
  const channel = await getChannel(channelId).catch((err) => {
    throw new Error(
      `The bot cannot see channel ${channelId} (${err.status || err.message}). ` +
      'Check it was added to the server and has View Channel there.'
    );
  });
  console.log(`Channel OK: #${channel.name} in server ${channel.guild_id}.`);

  const emojis = await getGuildEmojis(channel.guild_id);
  const all = [...SKILL_OPTIONS, ...BOSS_OPTIONS, ...RAID_OPTIONS];
  const matched = attachEmojis(all, emojis).filter((o) => o.emoji).map((o) => o.name);
  console.log(`Server has ${emojis.length} custom emojis; ${matched.length} match a poll option.`);
  if (matched.length) console.log(`  ${matched.join(', ')}`);

  console.log('Posting permission is only proven by posting; run open-polls.cjs --test for that.');
  return 0;
});
