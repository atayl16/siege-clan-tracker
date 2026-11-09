import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { fetchPlayer } = require('../utils/womPlayers.cjs');

const json = (body, status = 200) => ({ ok: status < 400, status, json: async () => body, body: null });
const snapshot = (xp) => ({ skills: { sailing: { experience: xp } } });

/** WOM stand-in: saved snapshot by id, fresh hiscores by username. */
function fakeWom({ saved, fresh, updateStatus = 200 }) {
  return vi.fn(async (url, { method } = {}) => {
    if (url.endsWith('/players/id/7')) {
      return saved === undefined
        ? json({ message: 'Not found' }, 404)
        : json({ id: 7, username: 'roinrin', latestSnapshot: { data: snapshot(saved) } });
    }
    if (url.endsWith('/players/roinrin') && method === 'POST') {
      return updateStatus === 200
        ? json({ id: 7, username: 'roinrin', latestSnapshot: { data: snapshot(fresh) } })
        : json({ message: 'Failed' }, updateStatus);
    }
    return json({}, 404);
  });
}

describe('fetchPlayer', () => {
  it('returns the saved snapshot without asking WOM to update', async () => {
    const fetchImpl = fakeWom({ saved: 100, fresh: 500 });
    await expect(fetchPlayer(7, { fetchImpl })).resolves.toEqual({ data: snapshot(100), updated: false });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('returns the fresh hiscores when forced, and says so', async () => {
    const fetchImpl = fakeWom({ saved: 100, fresh: 500 });
    await expect(fetchPlayer(7, { fetchImpl, force: true })).resolves.toEqual({ data: snapshot(500), updated: true });
  });

  it('falls back to the saved snapshot when WOM cannot update, and says that too', async () => {
    const fetchImpl = fakeWom({ saved: 100, updateStatus: 500 });
    await expect(fetchPlayer(7, { fetchImpl, force: true })).resolves.toEqual({ data: snapshot(100), updated: false });
  });

  it('returns no data for a player WOM does not know', async () => {
    const fetchImpl = fakeWom({});
    await expect(fetchPlayer(7, { fetchImpl, force: true })).resolves.toEqual({ data: null, updated: false });
  });
});
