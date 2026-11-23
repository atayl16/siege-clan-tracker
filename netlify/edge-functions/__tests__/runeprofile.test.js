import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

globalThis.Deno = { env: { get: (k) => (k === 'ALLOWED_ORIGIN' ? 'https://www.siege-clan.com' : undefined) } };

const { default: accountHandler } = await import('../runeprofile-activity.js');
const { default: clanHandler } = await import('../runeprofile-clan-activity.js');

const req = (path) => new Request(`https://www.siege-clan.com${path}`, { headers: { Origin: 'https://www.siege-clan.com' } });
const activity = {
  type: 'new_item_obtained',
  data: { itemId: 1 },
  enriched: { itemName: 'Test item' },
  createdAt: '2026-11-23 14:53:40.772003',
  account: { username: 'Test Main', accountType: { id: 0 } },
  somethingElse: 'not passed on',
};

describe('runeprofile edge functions', () => {
  const realFetch = globalThis.fetch;
  beforeEach(() => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ activities: [activity] }), { status: 200 }));
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it("asks RuneProfile's public API for the clan feed, names the site, and caches a slim copy", async () => {
    const res = await clanHandler(req('/api/runeprofile-clan-activity'));
    const [url, init] = globalThis.fetch.mock.calls[0];
    expect(url).toBe('https://www.runeprofile.com/api/v1/clans/Siege/activities?limit=20');
    expect(init.headers['User-Agent']).toMatch(/siege-clan\.com/);
    expect(res.headers.get('Netlify-CDN-Cache-Control')).toMatch(/max-age=600/);
    expect(await res.json()).toEqual({
      activities: [{ type: 'new_item_obtained', data: { itemId: 1 }, enriched: { itemName: 'Test item' }, createdAt: activity.createdAt, username: 'Test Main' }],
    });
  });

  it("serves the Achievements page's longer list without level-ups, cached apart from the home feed", async () => {
    const res = await clanHandler(req('/api/runeprofile-clan-activity?view=page'));
    const url = globalThis.fetch.mock.calls[0][0];
    expect(url).toMatch(/limit=50/);
    expect(url).toMatch(/activityTypes=new_item_obtained,valuable_drop,quest_completed/);
    expect(url).not.toMatch(/level_up|xp_milestone/);
    expect(res.headers.get('Netlify-Vary')).toBe('query=view');
  });

  it('refuses an unknown view', async () => {
    const res = await clanHandler(req('/api/runeprofile-clan-activity?view=everything'));
    expect(res.status).toBe(400);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('looks a character up by name, cached per name', async () => {
    const res = await accountHandler(req('/api/runeprofile-activity?username=Test%20Main'));
    expect(globalThis.fetch.mock.calls[0][0]).toBe('https://www.runeprofile.com/api/v1/accounts/Test%20Main/activities?limit=20');
    expect(res.headers.get('Netlify-Vary')).toBe('query=username');
    expect((await res.json()).found).toBe(true);
  });

  it('answers found: false, cached, for a character without RuneProfile', async () => {
    globalThis.fetch.mockResolvedValue(new Response('{}', { status: 404 }));
    const res = await accountHandler(req('/api/runeprofile-activity?username=Test%20Alt'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ found: false, activities: [] });
    expect(res.headers.get('Netlify-CDN-Cache-Control')).toMatch(/max-age=600/);
  });

  it('refuses a name that is not an OSRS name, without calling RuneProfile', async () => {
    const res = await accountHandler(req('/api/runeprofile-activity?username=../../clans'));
    expect(res.status).toBe(400);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('refuses a padded name, so one account cannot take two cache entries', async () => {
    const res = await accountHandler(req('/api/runeprofile-activity?username=Test%20Main%20'));
    expect(res.status).toBe(400);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('does not cache an upstream failure', async () => {
    globalThis.fetch.mockResolvedValue(new Response('oops', { status: 503 }));
    const res = await clanHandler(req('/api/runeprofile-clan-activity'));
    expect(res.status).toBe(502);
    expect(res.headers.get('Netlify-CDN-Cache-Control')).toBeNull();
  });
});
