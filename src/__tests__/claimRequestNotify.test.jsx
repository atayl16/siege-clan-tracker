import { renderHook, act, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

const saved = { id: 42, rsn: "Test Main", status: "pending" };

vi.mock("../supabaseClient", () => {
  const builder = {
    insert: () => builder,
    select: () => builder,
    order: () => Promise.resolve({ data: [], error: null }),
    single: () => Promise.resolve({ data: saved, error: null }),
  };
  return {
    supabase: {
      from: () => builder,
      auth: { getSession: async () => ({ data: { session: { access_token: "tok" } } }) },
    },
  };
});

import { useClaimRequests } from "../hooks/useClaimRequests";

describe("raising a claim request", () => {
  const realFetch = globalThis.fetch;
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it("asks the server to alert the staff channel about the saved request", async () => {
    globalThis.fetch.mockResolvedValue(new Response("{}", { status: 200 }));
    const { result } = renderHook(() => useClaimRequests());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let returned;
    await act(async () => {
      returned = await result.current.createClaimRequest({ user_id: "auth-1", rsn: "Test Main" });
    });

    expect(returned).toEqual(saved);
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    const [url, init] = globalThis.fetch.mock.calls[0];
    expect(url).toBe("/.netlify/functions/user-claim-request-notify");
    expect(init.headers.Authorization).toBe("Bearer tok");
    expect(JSON.parse(init.body)).toEqual({ requestId: 42 });
  });

  it("still saves the request when the alert fails", async () => {
    globalThis.fetch.mockRejectedValue(new Error("offline"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { result } = renderHook(() => useClaimRequests());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let returned;
    await act(async () => {
      returned = await result.current.createClaimRequest({ user_id: "auth-1", rsn: "Test Main" });
    });

    expect(returned).toEqual(saved);
    await waitFor(() => expect(warn).toHaveBeenCalled());
    warn.mockRestore();
  });
});
