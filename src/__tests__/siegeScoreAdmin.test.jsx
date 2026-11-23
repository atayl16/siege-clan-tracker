import { renderHook, waitFor, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

vi.mock("../utils/supabaseClient", () => ({
  getAdminSupabaseClient: () => ({
    from: () => ({
      select: () => ({ is: () => ({ order: () => Promise.resolve({ data: [{ wom_id: 7, name: "Test Member", siege_score: 40 }], error: null }) }) }),
    }),
  }),
}));
vi.mock("../supabaseClient", () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: { access_token: "test-token" } } }) } },
}));

const { useMembers } = await import("../hooks/useMembers");

const posts = [];
let reply = {};

beforeEach(() => {
  posts.length = 0;
  reply = {};
  localStorage.setItem("adminAuth", "true");
  vi.stubGlobal("fetch", vi.fn(async (url, init) => {
    posts.push({ url, body: JSON.parse(init.body), auth: init.headers.Authorization });
    return { ok: !reply.error, status: reply.error ? 500 : 200, json: async () => reply };
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

const renderMembers = async () => {
  const hook = renderHook(() => useMembers());
  await waitFor(() => expect(hook.result.current.members).not.toBeNull());
  return hook;
};

describe("Siege Score admin calls", () => {
  it("resets every score in one call, not one update per listed member", async () => {
    reply = { success: true, resetCount: 231 };
    const { result } = await renderMembers();
    let count;
    await act(async () => {
      count = await result.current.resetSiegeScores();
    });
    expect(count).toBe(231);
    expect(posts).toEqual([{ url: "/.netlify/functions/admin-reset-siege-scores", body: {}, auth: "Bearer test-token" }]);
  });

  it("adds points at the database rather than sending this page's score plus the points", async () => {
    reply = { success: true, siegeScore: 160 };
    const { result } = await renderMembers();
    let score;
    await act(async () => {
      score = await result.current.addSiegePoints(7, 20);
    });
    expect(score).toBe(160);
    expect(posts).toEqual([{ url: "/.netlify/functions/admin-add-siege-points", body: { memberId: 7, points: 20 }, auth: "Bearer test-token" }]);
    // No absolute score is sent, so an out-of-date page cannot overwrite one.
    expect(posts[0].body).not.toHaveProperty("siege_score");
  });

  it("passes on the function's error", async () => {
    reply = { error: "points must be a whole number between -1000 and 1000, and not 0" };
    const { result } = await renderMembers();
    await expect(result.current.addSiegePoints(7, 0)).rejects.toThrow(/between -1000 and 1000/);
  });
});
