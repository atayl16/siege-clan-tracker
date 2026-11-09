import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// A minimal stand-in for supabase-js's query builder. Each awaited query is
// recorded as { table, op, filters, payload } and answered by `respond`.
let calls;
let respond;
vi.mock("../supabaseClient", () => {
  const from = (table) => {
    const q = { table, op: "select", filters: [], payload: undefined };
    const builder = {
      select() { if (q.op === "select") q.op = "select"; return builder; },
      update(payload) { q.op = "update"; q.payload = payload; return builder; },
      delete() { q.op = "delete"; return builder; },
      insert(payload) { q.op = "insert"; q.payload = payload; return builder; },
      eq(col, val) { q.filters.push(["eq", col, val]); return builder; },
      in(col, val) { q.filters.push(["in", col, val]); return builder; },
      order() { return builder; },
      then(resolve, reject) {
        calls.push(q);
        return Promise.resolve(respond(q)).then(resolve, reject);
      },
    };
    return builder;
  };
  return { supabase: { from } };
});

import { useRaces } from "../hooks/useRaces";

const RACE = "r1";
const existingRows = [
  { id: "p1", wom_id: 1, metric: "sailing" },
  { id: "p2", wom_id: 2, metric: "sailing" },
];

// Default answers: every write affects the rows it targets.
function defaultRespond(q) {
  if (q.table === "races" && q.op === "select") return { data: [], error: null };
  if (q.table === "races" && q.op === "update") return { data: [{ id: RACE }], error: null };
  if (q.table === "race_participants" && q.op === "select") return { data: existingRows, error: null };
  if (q.op === "delete") {
    const ids = q.filters.find(([k, c]) => k === "in" && c === "id")[2];
    return { data: ids.map((id) => ({ id })), error: null };
  }
  if (q.op === "update") return { data: [{ id: "x" }], error: null };
  return { data: null, error: null };
}

const row = (id, wom_id, metric = "sailing") => ({
  ...(id ? { id } : {}),
  wom_id,
  player_name: `P${wom_id}`,
  metric,
  target_value: 100,
});

async function hook() {
  const { result } = renderHook(() => useRaces("u1"));
  await waitFor(() => expect(result.current.loading).toBe(false));
  calls.length = 0;
  return result.current.updateRace;
}

const writes = (op) => calls.filter((q) => q.table === "race_participants" && q.op === op);

describe("updateRace", () => {
  beforeEach(() => {
    calls = [];
    respond = defaultRespond;
  });

  it("updates kept rows, deletes removed ones and inserts new ones, all scoped to the race", async () => {
    const updateRace = await hook();
    await updateRace(RACE, {
      title: "T",
      participants: [row("p1", 1), row(null, 3)],
      originalParticipantIds: ["p1", "p2"],
    });

    const [del] = writes("delete");
    expect(del.filters).toContainEqual(["eq", "race_id", RACE]);
    expect(del.filters).toContainEqual(["in", "id", ["p2"]]);

    const [upd] = writes("update");
    expect(upd.filters).toContainEqual(["eq", "race_id", RACE]);
    expect(upd.filters).toContainEqual(["eq", "id", "p1"]);
    expect(upd.payload).not.toHaveProperty("start_value"); // same player and metric

    const [ins] = writes("insert");
    expect(ins.payload).toEqual([expect.objectContaining({ race_id: RACE, wom_id: 3, start_value: 0 })]);
  });

  it("does not delete a participant added since the form was opened", async () => {
    const updateRace = await hook();
    // The form opened with p1 only; p2 was added elsewhere afterwards.
    await updateRace(RACE, { participants: [row("p1", 1)], originalParticipantIds: ["p1"] });
    expect(writes("delete")).toHaveLength(0);
  });

  it("resets progress when a row's character or metric changes", async () => {
    const updateRace = await hook();
    await updateRace(RACE, {
      participants: [row("p1", 1, "fishing"), row("p2", 9)],
      originalParticipantIds: ["p1", "p2"],
    });
    for (const upd of writes("update")) {
      expect(upd.payload).toMatchObject({ start_value: 0, current_value: 0, baseline_set_at: null });
    }
  });

  it("removes participants last, so a failed insert loses nobody", async () => {
    respond = (q) =>
      q.op === "insert" ? { data: null, error: new Error("insert failed") } : defaultRespond(q);
    const updateRace = await hook();
    await expect(
      updateRace(RACE, { participants: [row("p1", 1), row(null, 3)], originalParticipantIds: ["p1", "p2"] })
    ).rejects.toThrow("insert failed");
    expect(writes("delete")).toHaveLength(0);
  });

  it("refuses rows that belong to another race", async () => {
    const updateRace = await hook();
    await expect(
      updateRace(RACE, { participants: [row("other-race-row", 1)], originalParticipantIds: [] })
    ).rejects.toThrow(/changed since you opened it/);
    expect(writes("update")).toHaveLength(0);
    expect(writes("delete")).toHaveLength(0);
  });

  it.each([
    ["the race update", (q) => q.table === "races" && q.op === "update", /The race was not saved/],
    ["a participant update", (q) => q.table === "race_participants" && q.op === "update", /P1's entry was not saved/],
    ["a participant delete", (q) => q.op === "delete", /Removing participants was not saved/],
  ])("reports a failed save when RLS lets %s match no rows", async (_label, matches, message) => {
    respond = (q) => (matches(q) ? { data: [], error: null } : defaultRespond(q));
    const updateRace = await hook();
    await expect(
      updateRace(RACE, { participants: [row("p1", 1)], originalParticipantIds: ["p1", "p2"] })
    ).rejects.toThrow(message);
  });
});
