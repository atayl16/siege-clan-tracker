/**
 * Post a sample of each staff-channel alert to the bot-test channel, so a
 * change to how they look can be checked in Discord before it goes live:
 *
 *   - a claim request (netlify/functions/utils/claimRequestAlert.cjs)
 *   - a RuneWatch alert (scripts/sync-tasks/runewatch-check.cjs)
 *
 * Made-up names only. Touches no database.
 *
 * Env: DISCORD_BOT_TOKEN, DISCORD_TEST_CHANNEL_ID.
 * Run by the Staff Alerts Test workflow.
 */

const { postMessage } = require('../comp-polls/discord.cjs');
const { renderClaimRequestAlert } = require('../../netlify/functions/utils/claimRequestAlert.cjs');
const { renderRunewatchAlert } = require('./runewatch-check.cjs');

async function main() {
  const channelId = process.env.DISCORD_TEST_CHANNEL_ID;
  if (!channelId) throw new Error('DISCORD_TEST_CHANNEL_ID is not set');

  await postMessage(
    channelId,
    renderClaimRequestAlert({
      request: { rsn: 'Test Main', message: 'This is my main account.\nMy alt is Test Alt.' },
      username: 'test_user',
    })
  );
  await postMessage(channelId, renderRunewatchAlert(['Test Player', 'big_test']));
  console.log(`Posted a sample claim request alert and RuneWatch alert to ${channelId}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
