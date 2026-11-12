import { renderHook, waitFor, act } from "@testing-library/react";
import { SWRConfig } from "swr";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// A chainable stand-in for supabase-js: every call is recorded, and awaiting
// the chain resolves to whatever `tables[table](calls)` returns.
const db = vi.hoisted(() => ({ tables: {}, queries: [] }));
vi.mock("../supabaseClient", () => ({
  supabase: {
    from(table) {
      const calls = [];
      db.queries.push({ table, calls });
      const chain = {
        then(resolve, reject) {
          return Promise.resolve()
            .then(() => db.tables[table](calls))
            .then(resolve, reject);
        },
      };
      for (const method of ["select", "order", "limit", "eq"]) {
        chain[method] = (...args) => {
          calls.push([method, ...args]);
          return chain;
        };
      }
      return chain;
    },
  },
}));

import { useWeeklyXp, useCurrentXpWeek, fetchLastAwards } from "../hooks/useWeeklyXp";

const row = (id, gained) => ({ player: { id, username: `p${id}`, displayName: `P${id}` }, data: { gained } });

const wrapper = ({ children }) => (
  <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>{children}</SWRConfig>
);

describe("useWeeklyXp", () => {
  const realFetch = globalThis.fetch;
  beforeEach(() => {
    db.queries = [];
    db.tables = {
      members: () => ({ data: [{ wom_id: 2 }, { wom_id: 3 }, { wom_id: 4 }], error: null }),
      xp_awards: () => ({ data: [], error: null }),
    };
    // Player 1 is in the WOM group but has no members row yet.
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify([row(1, 900), row(2, 800), row(3, 700), row(4, 600)])));
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it("ranks only members, as the payout does, so places and points match", async () => {
    const { result } = renderHook(() => useWeeklyXp(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.ranking.map((r) => [r.womId, r.place, r.points])).toEqual([
      [2, 1, 15],
      [3, 2, 10],
      [4, 3, 5],
    ]);
  });

  it("fetches last week's winners only when asked", async () => {
    const { result } = renderHook(() => useWeeklyXp(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(db.queries.some((q) => q.table === "xp_awards")).toBe(false);
    expect(result.current.lastWeekLoading).toBe(false);

    renderHook(() => useWeeklyXp({ withLastWeek: true }), { wrapper });
    await waitFor(() => expect(db.queries.some((q) => q.table === "xp_awards")).toBe(true));
  });

  it("reports a WOM failure without waiting for the member list", async () => {
    db.tables.members = () => new Promise(() => {}); // never answers
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ error: "rate limited" }), { status: 429 }));
    const { result } = renderHook(() => useWeeklyXp(), { wrapper });
    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.loading).toBe(false);
  });

  it("ranks everyone if the member list cannot be read", async () => {
    db.tables.members = () => ({ data: null, error: new Error("down") });
    const { result } = renderHook(() => useWeeklyXp(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.ranking.map((r) => r.womId)).toEqual([1, 2, 3, 4]);
  });
});

describe("fetchLastAwards", () => {
  it("returns every winner of the latest paid week, however many tied", async () => {
    const winners = Array.from({ length: 22 }, (_, i) => ({
      wom_id: i + 1,
      player_name: `P${i + 1}`,
      placement: 1,
      xp_gained: "1000",
      points_awarded: 15,
    }));
    db.queries = [];
    db.tables.xp_awards = (calls) =>
      calls.some(([m]) => m === "eq")
        ? { data: winners, error: null }
        : { data: [{ week_start: "2026-11-09T19:00:00+00:00", week_end: "2026-11-16T19:00:00+00:00" }], error: null };

    const last = await fetchLastAwards();

    expect(last.winners).toHaveLength(22);
    expect(last.start.toISOString()).toBe("2026-11-09T19:00:00.000Z");
    const winnersQuery = db.queries[1].calls;
    expect(winnersQuery).toContainEqual(["eq", "week_start", "2026-11-09T19:00:00+00:00"]);
    expect(winnersQuery.some(([m]) => m === "limit")).toBe(false);
  });

  it("is null before any week has been paid", async () => {
    db.tables.xp_awards = () => ({ data: [], error: null });
    expect(await fetchLastAwards()).toBeNull();
  });
});

describe("useCurrentXpWeek", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("moves on to the new week at Monday 19:00 UK while the page stays open", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    vi.setSystemTime(new Date("2026-11-16T18:59:00Z"));
    const { result } = renderHook(() => useCurrentXpWeek());
    expect(result.current.start.toISOString()).toBe("2026-11-09T19:00:00.000Z");

    act(() => {
      vi.advanceTimersByTime(2 * 60 * 1000);
    });
    expect(result.current.start.toISOString()).toBe("2026-11-16T19:00:00.000Z");
  });

  it("catches up when a tab that slept through the boundary is shown again", () => {
    vi.useFakeTimers({ toFake: ["Date"] }); // timers that never fire, as in a suspended tab
    vi.setSystemTime(new Date("2026-11-16T18:00:00Z"));
    const { result } = renderHook(() => useCurrentXpWeek());

    vi.setSystemTime(new Date("2026-11-17T08:00:00Z"));
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(result.current.start.toISOString()).toBe("2026-11-16T19:00:00.000Z");
  });
});
