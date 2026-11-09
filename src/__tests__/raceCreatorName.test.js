import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

let usersQuery;
let usersResult;
vi.mock("../supabaseClient", () => ({
  supabase: {
    from: (table) => {
      const q = { table };
      const builder = {
        select(cols) { q.select = cols; return builder; },
        order() { return builder; },
        or(expr) { q.or = expr; return builder; },
        then(resolve) {
          if (table === "users") {
            usersQuery = q;
            return Promise.resolve(usersResult).then(resolve);
          }
          return Promise.resolve({
            data: [
              { id: "r1", creator_id: A, status: "completed", participants: [] },
              { id: "r2", creator_id: B, status: "completed", participants: [] },
              { id: "r3", creator_id: null, status: "completed", participants: [] },
            ],
            error: null,
          }).then(resolve);
        },
      };
      return builder;
    },
  },
}));

import { useRaces } from "../hooks/useRaces";

describe("race creator names", () => {
  beforeEach(() => {
    usersQuery = null;
  });

  it("names each race's creator, matching either users.id or supabase_auth_id", async () => {
    usersResult = {
      data: [
        { id: A, supabase_auth_id: A, username: "roinrin" },
        // e.g. the built-in admin, whose row id is not its auth id
        { id: "admin-row", supabase_auth_id: B, username: "admin" },
      ],
      error: null,
    };
    const { result } = renderHook(() => useRaces("u1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.races.map((r) => r.creator_name)).toEqual(["roinrin", "admin", null]);
    // Only the username is read from users, never the rest of the row.
    expect(usersQuery.select).toBe("id, supabase_auth_id, username");
    expect(usersQuery.or).toBe(`id.in.(${A},${B}),supabase_auth_id.in.(${A},${B})`);
  });

  it("still loads the races when the lookup fails, just without names", async () => {
    usersResult = { data: null, error: { message: "denied" } };
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { result } = renderHook(() => useRaces("u1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.races).toHaveLength(3);
    expect(result.current.races.every((r) => r.creator_name === null)).toBe(true);
    expect(result.current.error).toBeNull();
    warn.mockRestore();
  });
});
