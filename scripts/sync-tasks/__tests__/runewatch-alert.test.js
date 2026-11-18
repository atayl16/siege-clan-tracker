// @vitest-environment node
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { renderRunewatchAlert, sendDiscordNotification } = require('../runewatch-check.cjs');

describe('renderRunewatchAlert', () => {
  it('lists the newly reported members and links the admin alerts tab', () => {
    const message = renderRunewatchAlert(['Test Player', 'big_test']);
    expect(message.embeds[0].title).toBe('RuneWatch: members found on the list');
    expect(message.embeds[0].description).toBe(
      'These clan members are newly listed on RuneWatch:\n- Test Player\n- big\\_test\n\nReview them on the admin page.'
    );
    expect(message.components[0].components[0]).toMatchObject({
      style: 5,
      label: 'Review alerts',
      url: 'https://siege-clan.com/admin?tab=alerts',
    });
  });

  it('never pings anyone', () => {
    expect(renderRunewatchAlert(['Test Player']).allowed_mentions).toEqual({ parse: [] });
  });
});

describe('sendDiscordNotification', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it('posts to the staff channel as the bot', async () => {
    process.env.DISCORD_STAFF_CHANNEL_ID = 'staff-channel';
    process.env.DISCORD_BOT_TOKEN = 'token';
    const postMessage = vi.fn().mockResolvedValue({ id: 'm1' });

    await sendDiscordNotification(['Test Player'], { postMessage });
    expect(postMessage).toHaveBeenCalledWith('staff-channel', renderRunewatchAlert(['Test Player']));
  });

  it('posts nothing without a staff channel', async () => {
    delete process.env.DISCORD_STAFF_CHANNEL_ID;
    process.env.DISCORD_BOT_TOKEN = 'token';
    const postMessage = vi.fn();

    await sendDiscordNotification(['Test Player'], { postMessage });
    expect(postMessage).not.toHaveBeenCalled();
  });
});
