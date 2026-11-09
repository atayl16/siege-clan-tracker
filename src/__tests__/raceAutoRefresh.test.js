import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Races come back from a supabase-js stand-in; the refresh endpoint is fetch.
let racesRead;
let races;
vi.mock("../supabaseClient", () => {
  const from = () => {
    const builder = {
      select() { return builder; },
      insert() { return builder; },
      order() { return builder; },
      single() { return builder; },
      then(resolve) {
        racesRead++;
        return Promise.resolve({ data: races, error: null }).then(resolve);
      },
    };
    return builder;
  };
  return {
    supabase: {
      from,
      auth: { getSession: async () => ({ data: { session: { access_token: "tok" } } }) },
    },
  };
});

import { useRaces } from "../hooks/useRaces";

const active = (id, participants = [{ id: `${id}-p` }]) => ({ id, status: "active", participants });

describe("useRaces progress refresh", () => {
  const realFetch = globalThis.fetch;
  let refreshed;

  beforeEach(() => {
    racesRead = 0;
    refreshed = "refreshed";
    globalThis.fetch = vi.fn(async (_url, init) => {
      const { raceIds } = JSON.parse(init.body);
      return {
        ok: true,
        json: async () => ({ results: raceIds.map((raceId) => ({ raceId, status: refreshed })) }),
      };
    });
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it("refreshes the active races with racers once on load, then re-reads them", async () => {
    races = [active("a"), active("b", []), { id: "c", status: "completed", participants: [{ id: "c-p" }] }];
    const { result, rerender } = renderHook(() => useRaces("u1"));

    await waitFor(() => expect(racesRead).toBe(2));
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = globalThis.fetch.mock.calls[0];
    expect(url).toBe("/.netlify/functions/race-refresh");
    expect(JSON.parse(init.body)).toEqual({ raceIds: ["a"], force: false });
    expect(init.headers.Authorization).toBeUndefined();

    // Re-renders and the re-read itself must not trigger another refresh.
    rerender();
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("does not re-read when the server had nothing new", async () => {
    races = [active("a")];
    refreshed = "recently_refreshed";
    renderHook(() => useRaces("u1"));
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));
    expect(racesRead).toBe(1);
  });

  it("sends the member's session with a forced refresh", async () => {
    races = [];
    const { result } = renderHook(() => useRaces("u1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await result.current.refreshProgress(["a"], { force: true });
    const [, init] = globalThis.fetch.mock.calls.at(-1);
    expect(JSON.parse(init.body)).toEqual({ raceIds: ["a"], force: true });
    expect(init.headers.Authorization).toBe("Bearer tok");
  });

  it("keeps the page working when the refresh fails", async () => {
    races = [active("a")];
    globalThis.fetch = vi.fn(async () => ({ ok: false, status: 502, json: async () => ({}) }));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { result } = renderHook(() => useRaces("u1"));

    await waitFor(() => expect(warn).toHaveBeenCalled());
    expect(result.current.races).toEqual(races.map((race) => ({ ...race, creator_name: null })));
    expect(result.current.error).toBeNull();
    warn.mockRestore();
  });
});
