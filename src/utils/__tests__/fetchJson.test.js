import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchJson } from "../fetchJson";

describe("fetchJson", () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it("returns the parsed body of a successful response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ a: 1 }), { status: 200 }));
    await expect(fetchJson("/api/x")).resolves.toEqual({ a: 1 });
  });

  it("throws on an error response instead of returning the error body as data", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "WOM API Error: 429" }), { status: 429 })
    );
    const err = await fetchJson("/api/wom-group-stats").catch((e) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("WOM API Error: 429");
    expect(err.status).toBe(429);
  });
});
