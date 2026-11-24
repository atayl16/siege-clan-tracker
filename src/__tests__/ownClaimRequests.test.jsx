import { renderHook, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

// Records the query, so the test can check it asks for one member's requests.
const calls = [];
let session = null;
const rows = [{ id: 1, rsn: "Test Main", user_id: "auth-1", status: "approved" }];

vi.mock("../supabaseClient", () => {
  const builder = {
    select: (...a) => (calls.push(["select", ...a]), builder),
    eq: (...a) => (calls.push(["eq", ...a]), builder),
    order: (...a) => (calls.push(["order", ...a]), Promise.resolve({ data: rows, error: null })),
  };
  return {
    supabase: {
      from: (table) => (calls.push(["from", table]), builder),
      auth: { getSession: async () => ({ data: { session } }) },
    },
  };
});

const { useClaimRequests } = await import("../hooks/useClaimRequests");

describe("Your Requests", () => {
  beforeEach(() => {
    calls.length = 0;
  });

  it("asks only for the signed-in member's requests, even for an admin", async () => {
    session = { access_token: "tok", user: { id: "auth-1" } };
    const { result } = renderHook(() => useClaimRequests());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(calls).toContainEqual(["from", "claim_requests"]);
    expect(calls).toContainEqual(["eq", "user_id", "auth-1"]);
    expect(result.current.requests).toEqual(rows);
  });

  it("asks for nothing when no one is signed in", async () => {
    session = null;
    const { result } = renderHook(() => useClaimRequests());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(calls).toEqual([]);
    expect(result.current.requests).toEqual([]);
  });
});
