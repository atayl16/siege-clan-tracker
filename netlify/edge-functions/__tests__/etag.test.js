import { describe, it, expect } from 'vitest';
import {
  contentEtag,
  cacheHeaders,
  etagMatches,
  jsonWithEtag,
} from '../_shared/etag.js';

const request = (ifNoneMatch) =>
  new Request('https://www.siege-clan.com/api/members', {
    headers: ifNoneMatch ? { 'If-None-Match': ifNoneMatch } : {},
  });

describe('contentEtag', () => {
  it('is stable for the same data', () => {
    expect(contentEtag('members', [{ id: 1 }])).toBe(contentEtag('members', [{ id: 1 }]));
  });

  it('changes when the data changes, on the same day', () => {
    // The regression: a date-based tag stayed the same all day, so a member
    // added in the morning was a 304 until midnight.
    const before = contentEtag('users', [{ id: 1, username: 'a' }]);
    const after = contentEtag('users', [{ id: 1, username: 'a' }, { id: 2, username: 'b' }]);
    expect(after).not.toBe(before);
  });

  it('keeps tags distinct across endpoints', () => {
    expect(contentEtag('races', [])).not.toBe(contentEtag('events', []));
  });

  it('hashes a pre-serialised string the same as the value', () => {
    const data = [{ id: 1 }];
    expect(contentEtag('x', JSON.stringify(data))).toBe(contentEtag('x', data));
  });

  it('does not throw on a value JSON cannot serialise', () => {
    expect(() => contentEtag('x', undefined)).not.toThrow();
  });
});

describe('cacheHeaders', () => {
  it('asks for revalidation within a minute by default', () => {
    expect(cacheHeaders('W/"x"')['Cache-Control']).toBe('public, max-age=60, must-revalidate');
  });
});

describe('etagMatches', () => {
  const tag = 'W/"members-abc"';

  it('matches the exact tag', () => {
    expect(etagMatches(tag, tag)).toBe(true);
  });

  it('compares weakly, ignoring the W/ prefix', () => {
    expect(etagMatches('"members-abc"', tag)).toBe(true);
  });

  it('finds the tag in a list', () => {
    expect(etagMatches('W/"other", W/"members-abc"', tag)).toBe(true);
  });

  it('honours *', () => {
    expect(etagMatches('*', tag)).toBe(true);
  });

  it('does not match a missing header or a different tag', () => {
    expect(etagMatches(null, tag)).toBe(false);
    expect(etagMatches('W/"members-2026-10-09"', tag)).toBe(false);
  });
});

describe('jsonWithEtag', () => {
  const data = [{ id: 1, name: 'Zezima' }];

  it('returns the data with its content tag', async () => {
    const res = jsonWithEtag(request(), 'members', data, { cacheTag: 'supabase-members' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(data);
    expect(res.headers.get('ETag')).toBe(contentEtag('members', data));
    expect(res.headers.get('Netlify-Cache-Tag')).toBe('supabase-members');
  });

  it('returns 304 with no body when the client holds the same data', async () => {
    const etag = contentEtag('members', data);
    const res = jsonWithEtag(request(etag), 'members', data);
    expect(res.status).toBe(304);
    expect(await res.text()).toBe('');
    expect(res.headers.get('ETag')).toBe(etag);
  });

  it('returns fresh data when the client holds an old tag', async () => {
    const stale = contentEtag('members', []);
    const res = jsonWithEtag(request(stale), 'members', data);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(data);
  });
});

describe('private responses', () => {
  it('stay out of shared caches and vary on Authorization', () => {
    const res = jsonWithEtag(request(), 'users', [{ id: 1 }], { isPrivate: true });
    expect(res.headers.get('Cache-Control')).toBe('private, no-cache');
    expect(res.headers.get('CDN-Cache-Control')).toBe('no-store');
    expect(res.headers.get('Vary')).toBe('Authorization');
  });

  it('public responses vary on Authorization too', () => {
    expect(cacheHeaders('W/"x"').Vary).toBe('Authorization');
  });
});
