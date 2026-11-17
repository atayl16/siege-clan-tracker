import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// A chainable stand-in for supabase-js, as in useWeeklyXp.test.jsx.
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

import { useTitleRaces, useTitleHolders } from "../hooks/useWeeklyTitles";

const wrapper = ({ children }) => (
  <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>{children}</SWRConfig>
);

const standing = (title, wom_id, player_name, value) => ({ title, wom_id, player_name, value: String(value), updated_at: "2026-11-17T15:17:00Z" });

describe("useTitleRaces", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-17T16:00:00Z"));
    db.queries = [];
  });
  afterEach(() => vi.useRealTimers());

  it("reads this week's standings and ranks each title by its minimum", async () => {
    db.tables.weekly_title_standings = () => ({
      data: [
        standing("clogger", 1, "K aura", 22),
        standing("clogger", 2, "m2giaivar", 16),
        standing("clogger", 3, "tiny", 2), // under the minimum of 5
        standing("warrior", 4, "noon air", "8.47"),
      ],
      error: null,
    });
    const { result } = renderHook(() => useTitleRaces(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const clogger = result.current.races.find((r) => r.title.id === "clogger");
    expect(clogger.top.map((r) => [r.name, r.place, r.points])).toEqual([
      ["K aura", 1, 150],
      ["m2giaivar", 2, 100],
    ]);
    expect(clogger.entrants).toBe(3);
    expect(result.current.races.find((r) => r.title.id === "warrior").top[0].value).toBe(8.47);
    expect(result.current.races).toHaveLength(9);
    expect(result.current.updatedAt.toISOString()).toBe("2026-11-17T15:17:00.000Z");
    // Only this week's rows (the week started Mon 16 Nov 19:00 UK).
    expect(db.queries[0].calls).toContainEqual(["eq", "week_start", "2026-11-16T19:00:00.000Z"]);
  });
});

describe("useTitleHolders", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-17T16:00:00Z"));
    db.queries = [];
    db.tables.weekly_title_weeks = () => ({
      data: [{ week_start: "2026-11-09T19:00:00+00:00", week_end: "2026-11-16T19:00:00+00:00" }],
      error: null,
    });
    db.tables.weekly_title_awards = () => ({
      data: [
        { title: "clogger", wom_id: 1, player_name: "K aura", value: "22" },
        { title: "clue_hunter", wom_id: 1, player_name: "K aura", value: "50" },
        { title: "warrior", wom_id: 4, player_name: "noon air", value: "8.47" },
      ],
      error: null,
    });
    db.tables.xp_awards = (calls) =>
      calls.some(([m]) => m === "eq")
        ? { data: [{ wom_id: 9, player_name: "FinPunisher", placement: 1, xp_gained: "16314915", points_awarded: 150 }], error: null }
        : { data: [{ week_start: "2026-11-09T19:00:00+00:00", week_end: "2026-11-16T19:00:00+00:00" }], error: null };
  });
  afterEach(() => vi.useRealTimers());

  it("puts The Gainer first, then the titles in the config's order, and maps members to their titles", async () => {
    const { result } = renderHook(() => useTitleHolders(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.holders.map((h) => [h.title.name, h.players.map((p) => p.name)])).toEqual([
      ["The Gainer", ["FinPunisher"]],
      ["The Warrior", ["noon air"]],
      ["The Clogger", ["K aura"]],
      ["The Clue Hunter", ["K aura"]],
    ]);
    expect(result.current.byMember.get(1)).toEqual(["The Clogger", "The Clue Hunter"]);
    expect(result.current.byMember.get(9)).toEqual(["The Gainer"]);
    // Only 1st places are holders.
    const awardsQuery = db.queries.find((q) => q.table === "weekly_title_awards").calls;
    expect(awardsQuery).toContainEqual(["eq", "placement", 1]);
  });

  it("is empty, not loading, before anything has been awarded", async () => {
    db.tables.weekly_title_weeks = () => ({ data: [], error: null });
    db.tables.xp_awards = () => ({ data: [], error: null });
    const { result } = renderHook(() => useTitleHolders(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.holders).toEqual([]);
    expect(result.current.byMember.size).toBe(0);
  });
});
