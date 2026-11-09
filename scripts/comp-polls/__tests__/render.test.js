// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { renderPoll, voteCustomId, parseVoteCustomId, tallyBar } = require('../render.cjs');

const closesAt = new Date('2026-11-20T19:00:00Z');
const options = [
  { name: 'Farming', emoji: { id: '123456789012345678', name: 'Farming' } },
  { name: 'Sailing' },
  { name: 'Crafting' },
];

const base = { pollId: 42, question: 'What should our next skill of the week be?', options, closesAt };

describe('vote button ids', () => {
  it('round-trips', () => {
    expect(parseVoteCustomId(voteCustomId(42, 3))).toEqual({ pollId: '42', optionIndex: 3 });
    expect(parseVoteCustomId(voteCustomId('9f1c-77', 0))).toEqual({ pollId: '9f1c-77', optionIndex: 0 });
  });

  it('rejects anything else', () => {
    for (const junk of [undefined, '', 'poll:42', 'poll:42:x', 'other:42:1', 'poll:a b:1', 'poll:42:1:extra']) {
      expect(parseVoteCustomId(junk), String(junk)).toBeNull();
    }
  });
});

const G = '\u{1F7E9}'; // filled segment
const B = '⬛'; // empty segment

describe('tallyBar', () => {
  it('is 8 segments, scaled to the leading option like Subo', () => {
    // Subo's own example: 3 / 2 / 1 votes drew 8 / 5 / 3 segments.
    expect(tallyBar(3, 3)).toBe(G.repeat(8));
    expect(tallyBar(2, 3)).toBe(G.repeat(5) + B.repeat(3));
    expect(tallyBar(1, 3)).toBe(G.repeat(3) + B.repeat(5));
  });

  it('is empty with no votes, and never empty for an option that has one', () => {
    expect(tallyBar(0, 0)).toBe(B.repeat(8));
    expect(tallyBar(0, 40)).toBe(B.repeat(8));
    expect(tallyBar(1, 40)).toBe(G + B.repeat(7));
  });
});

describe('renderPoll', () => {
  it('open poll: live tally, closing time, clickable buttons', () => {
    const msg = renderPoll({ ...base, counts: [3, 1, 0] });
    const [embed] = msg.embeds;
    expect(embed.title).toBe(base.question);
    expect(embed.description).toContain('<:Farming:123456789012345678> **Farming**');
    expect(embed.description).toContain(`${G.repeat(8)}  3 · 75%`);
    expect(embed.description).toContain(`${G.repeat(3)}${B.repeat(5)}  1 · 25%`);
    expect(embed.description).toContain('4 votes so far');
    // Emoji inside code formatting render as plain glyphs, not coloured squares.
    expect(embed.description).not.toContain('`');
    expect(embed.description).toContain(`<t:${closesAt.getTime() / 1000}:R>`);
    expect(embed.footer.text).toMatch(/anonymous/);

    const buttons = msg.components[0].components;
    expect(buttons.map((b) => b.custom_id)).toEqual(['poll:42:0', 'poll:42:1', 'poll:42:2']);
    expect(buttons.every((b) => b.disabled === false)).toBe(true);
    expect(buttons[0].emoji).toEqual({ id: '123456789012345678', name: 'Farming', animated: false });
    expect(buttons[1].emoji).toBeUndefined();
  });

  it('no votes: no NaN anywhere', () => {
    const msg = renderPoll({ ...base, counts: [0, 0, 0] });
    expect(msg.embeds[0].description).not.toMatch(/NaN/);
    expect(msg.embeds[0].description).toContain(`${B.repeat(8)}  0 · 0%`);
  });

  it('closed poll: buttons disabled, winner marked', () => {
    const msg = renderPoll({ ...base, counts: [3, 5, 0], closed: true, winnerIndex: 1 });
    const [embed] = msg.embeds;
    expect(embed.description).toContain('**Sailing** - winner');
    expect(embed.description).toContain('8 votes in total');
    expect(embed.description).not.toContain(':R>');

    const buttons = msg.components[0].components;
    expect(buttons.every((b) => b.disabled)).toBe(true);
    expect(buttons[1].style).toBe(3);
    expect(buttons[0].style).toBe(2);
  });

  it('never lets the message ping anyone', () => {
    expect(renderPoll({ ...base, counts: [0, 0, 0] }).allowed_mentions).toEqual({ parse: [] });
  });

  it('refuses bad input', () => {
    expect(() => renderPoll({ ...base, counts: [1] })).toThrow(/3 options/);
    expect(() => renderPoll({ ...base, options: [], counts: [] })).toThrow(/1-5 options/);
  });
});
