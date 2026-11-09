/**
 * The Discord message for a poll: an embed with a live tally, and one button
 * per option.
 *
 * Shared by the Monday job (posting), the Netlify interactions function
 * (re-rendering the tally after each vote) and the Friday job (final results),
 * so keep it free of I/O.
 *
 * Voter identities never reach this module. It only ever sees counts.
 */

const BAR_WIDTH = 10;
const BUTTON_STYLE = { SECONDARY: 2, SUCCESS: 3 };
const CUSTOM_ID_PREFIX = 'poll';

// Discord limits we could plausibly hit.
const MAX_BUTTON_LABEL = 80;
const MAX_BUTTONS_PER_ROW = 5;

/** Button id carrying which poll and option was clicked: "poll:<pollId>:<index>". */
function voteCustomId(pollId, optionIndex) {
  return `${CUSTOM_ID_PREFIX}:${pollId}:${optionIndex}`;
}

/** Inverse of voteCustomId. Null for anything that is not one of ours. */
function parseVoteCustomId(customId) {
  if (typeof customId !== 'string') return null;
  const match = /^poll:([A-Za-z0-9-]{1,64}):(\d{1,2})$/.exec(customId);
  if (!match) return null;
  return { pollId: match[1], optionIndex: Number(match[2]) };
}

function tallyBar(count, total) {
  const filled = total > 0 ? Math.round((count / total) * BAR_WIDTH) : 0;
  return '█'.repeat(filled) + '░'.repeat(BAR_WIDTH - filled);
}

function percent(count, total) {
  return total > 0 ? Math.round((count / total) * 100) : 0;
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Inline form of a custom emoji, or '' when the option has none. */
function emojiText(emoji) {
  if (!emoji?.id || !emoji?.name) return '';
  return `<${emoji.animated ? 'a' : ''}:${emoji.name}:${emoji.id}> `;
}

const unix = (date) => Math.floor(date.getTime() / 1000);

/**
 * @param {object} poll
 * @param {string|number} poll.pollId
 * @param {string} poll.question
 * @param {Array<{name: string, emoji?: {id: string, name: string, animated?: boolean}}>} poll.options
 * @param {number[]} poll.counts votes per option, same order
 * @param {Date} poll.closesAt
 * @param {boolean} [poll.closed]
 * @param {number|null} [poll.winnerIndex] highlighted once closed
 * @returns a Discord message body (create or edit)
 */
function renderPoll({ pollId, question, options, counts, closesAt, closed = false, winnerIndex = null }) {
  if (options.length === 0 || options.length > MAX_BUTTONS_PER_ROW) {
    throw new Error(`A poll needs 1-${MAX_BUTTONS_PER_ROW} options, got ${options.length}`);
  }
  if (counts.length !== options.length) {
    throw new Error(`Got ${counts.length} vote counts for ${options.length} options`);
  }

  const total = counts.reduce((sum, n) => sum + n, 0);
  const isWinner = (i) => closed && i === winnerIndex;

  const lines = options.map((option, i) => {
    const name = isWinner(i) ? `**${option.name}** - winner` : `**${option.name}**`;
    return [
      `${emojiText(option.emoji)}${name}`,
      `\`${tallyBar(counts[i], total)}\` ${plural(counts[i], 'vote')} (${percent(counts[i], total)}%)`,
    ].join('\n');
  });

  // <t:...> renders in each reader's own timezone.
  const status = closed
    ? `${plural(total, 'vote')} in total\nClosed <t:${unix(closesAt)}:F>`
    : `${plural(total, 'vote')} so far\nCloses <t:${unix(closesAt)}:F> (<t:${unix(closesAt)}:R>)`;

  const embed = {
    title: question,
    description: [...lines, status].join('\n\n'),
    footer: {
      text: closed
        ? 'Poll closed. Votes were anonymous.'
        : 'Votes are anonymous. You can change your vote until the poll closes.',
    },
  };

  const buttons = options.map((option, i) => {
    const button = {
      type: 2,
      style: isWinner(i) ? BUTTON_STYLE.SUCCESS : BUTTON_STYLE.SECONDARY,
      label: option.name.slice(0, MAX_BUTTON_LABEL),
      custom_id: voteCustomId(pollId, i),
      disabled: closed,
    };
    if (option.emoji?.id) {
      button.emoji = { id: option.emoji.id, name: option.emoji.name, animated: Boolean(option.emoji.animated) };
    }
    return button;
  });

  return {
    embeds: [embed],
    components: [{ type: 1, components: buttons }],
    // Option names come from our own lists, but never let a message ping anyone.
    allowed_mentions: { parse: [] },
  };
}

module.exports = {
  voteCustomId,
  parseVoteCustomId,
  tallyBar,
  renderPoll,
};
