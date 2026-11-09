/**
 * The handful of Discord REST calls the poll bot makes, as the bot user.
 *
 * Used by the GitHub Actions jobs and by the Netlify interactions function.
 * The bot never opens a gateway connection; everything is plain HTTPS.
 */

const DISCORD_API = 'https://discord.com/api/v10';

// Discord requires this exact User-Agent shape for bot requests.
const USER_AGENT = 'DiscordBot (https://siege-clan.com, 1.0)';

class DiscordError extends Error {
  constructor(status, method, path, body) {
    super(`Discord ${method} ${path} returned ${status}: ${String(body).slice(0, 300)}`);
    this.status = status;
    this.body = body;
  }
}

/**
 * @param {object} opts
 * @param {string} [opts.token]       bot token; defaults to DISCORD_BOT_TOKEN
 * @param {number} [opts.timeoutMs]   abort after this long (the interactions
 *                                    function has a 3 s budget)
 * @param {number} [opts.retries]     how many 429s to wait out; the function
 *                                    passes 0 and simply skips the edit
 */
async function discordRequest(method, path, body, { token = process.env.DISCORD_BOT_TOKEN, timeoutMs = 15000, retries = 3 } = {}) {
  if (!token) throw new Error('DISCORD_BOT_TOKEN is not set');

  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${DISCORD_API}${path}`, {
      method,
      headers: {
        Authorization: `Bot ${token}`,
        'User-Agent': USER_AGENT,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (res.status === 429 && attempt < retries) {
      const info = await res.json().catch(() => ({}));
      const waitMs = Math.ceil((Number(info.retry_after) || 1) * 1000) + 250;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      continue;
    }

    const text = await res.text();
    if (!res.ok) throw new DiscordError(res.status, method, path, text);
    return text ? JSON.parse(text) : null;
  }
}

const getCurrentUser = (opts) => discordRequest('GET', '/users/@me', undefined, opts);
const getChannel = (channelId, opts) => discordRequest('GET', `/channels/${channelId}`, undefined, opts);
const getGuildEmojis = (guildId, opts) => discordRequest('GET', `/guilds/${guildId}/emojis`, undefined, opts);
const postMessage = (channelId, message, opts) => discordRequest('POST', `/channels/${channelId}/messages`, message, opts);
const editMessage = (channelId, messageId, message, opts) =>
  discordRequest('PATCH', `/channels/${channelId}/messages/${messageId}`, message, opts);

const normalise = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * The server's custom emoji for each option, matched by name ignoring case and
 * punctuation, so an emoji called "Farming" or "farming" lands on Farming.
 * Options with no match are returned unchanged.
 */
function attachEmojis(options, guildEmojis) {
  const byName = new Map();
  for (const emoji of guildEmojis || []) {
    if (emoji.available === false || !emoji.id || !emoji.name) continue;
    byName.set(normalise(emoji.name), { id: emoji.id, name: emoji.name, animated: Boolean(emoji.animated) });
  }
  return options.map((option) => {
    const emoji = byName.get(normalise(option.name));
    return emoji ? { ...option, emoji } : option;
  });
}

module.exports = {
  DiscordError,
  discordRequest,
  getCurrentUser,
  getChannel,
  getGuildEmojis,
  postMessage,
  editMessage,
  attachEmojis,
};
