import { renderHook, act, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { normaliseUsername, usernameProblem, signupUsernameProblem } from "../utils/username";
import { displayUsername } from "../utils/stringUtils";

// Every users query and auth call the provider makes, for the tests to read.
const calls = { usernameLookups: [], inserts: [], signUps: [], signIns: [] };
let usersTable = [];

vi.mock("crypto-hash", () => ({ sha256: async (s) => `hash:${s}` }));

vi.mock("../supabaseClient", () => {
  const from = (table) => {
    const q = { table, filters: [] };
    const builder = new Proxy(
      {},
      {
        get(_, prop) {
          if (prop === "eq") {
            return (col, val) => {
              q.filters.push([col, val]);
              if (table === "users" && col === "username") calls.usernameLookups.push(val);
              return builder;
            };
          }
          if (prop === "insert") {
            return (rows) => {
              calls.inserts.push(...rows);
              return builder;
            };
          }
          if (prop === "single") {
            return async () => {
              const row = usersTable.find((u) => q.filters.every(([c, v]) => u[c] === v));
              return row ? { data: row, error: null } : { data: null, error: { message: "not found" } };
            };
          }
          if (prop === "then") {
            return (resolve) => resolve({ data: [], error: null });
          }
          return () => builder;
        },
      }
    );
    return builder;
  };
  return {
    supabase: {
      from,
      auth: {
        getSession: async () => ({ data: { session: null } }),
        signUp: async (args) => {
          calls.signUps.push(args);
          return { data: { user: { id: "auth-new" } }, error: null };
        },
        signInWithPassword: async (args) => {
          calls.signIns.push(args);
          return { error: null };
        },
        signOut: async () => {
          calls.signOuts = (calls.signOuts || 0) + 1;
          return { error: null };
        },
      },
    },
  };
});

// Not a real password: the fake client accepts anything.
const PW = "pw";

// Imported after the mocks.
const { AuthProvider, useAuth } = await import("../context/AuthContext");

const renderAuth = async () => {
  const hook = renderHook(() => useAuth(), { wrapper: AuthProvider });
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook;
};

beforeEach(() => {
  localStorage.clear();
  usersTable = [];
  for (const key of Object.keys(calls)) calls[key] = [];
});

describe("normaliseUsername", () => {
  it("stores spaces as underscores, trimmed and lowercase", () => {
    expect(normaliseUsername("  Test user ")).toBe("test_user");
    expect(normaliseUsername("Big   Dave")).toBe("big_dave");
    expect(normaliseUsername("test_user")).toBe("test_user");
    expect(normaliseUsername(undefined)).toBe("");
  });

  it("shows the stored name with its spaces again", () => {
    expect(displayUsername(normaliseUsername("Test user"))).toBe("Test user");
  });
});

describe("username checks", () => {
  it("lets a rename use a name typed with a space", () => {
    expect(usernameProblem(normaliseUsername("Test user"))).toBeNull();
  });

  it("lets signup keep short names, and rejects what an email cannot hold", () => {
    expect(signupUsernameProblem("b")).toBeNull();
    expect(signupUsernameProblem("test_user")).toBeNull();
    expect(signupUsernameProblem("")).not.toBeNull();
    expect(signupUsernameProblem("semi;colon")).not.toBeNull();
    expect(signupUsernameProblem("ümlaut")).not.toBeNull();
  });

  it("rejects dots the auth email cannot hold", () => {
    expect(signupUsernameProblem(normaliseUsername("Test.. User"))).toMatch(/two dots/);
    expect(signupUsernameProblem(".test")).toMatch(/start or end/);
    expect(signupUsernameProblem("test.")).toMatch(/start or end/);
    expect(signupUsernameProblem("test.user")).toBeNull();
    expect(usernameProblem("test..user")).not.toBeNull();
  });
});

describe("signing up and in with a space in the name", () => {
  it("signs up 'Test user' as test_user", async () => {
    const { result } = await renderAuth();
    let outcome;
    await act(async () => {
      outcome = await result.current.register("Test user", PW);
    });

    expect(outcome).toEqual({ success: true });
    expect(calls.usernameLookups).toEqual(["test_user"]);
    expect(calls.signUps).toEqual([{ email: "test_user@example.com", password: PW }]);
    expect(calls.inserts).toMatchObject([{ id: "auth-new", username: "test_user" }]);
    expect(result.current.user.username).toBe("test_user");
  });

  it("refuses a name the auth email cannot hold before creating anything", async () => {
    const { result } = await renderAuth();
    let outcome;
    await act(async () => {
      outcome = await result.current.register("test;user", PW);
    });

    expect(outcome.error).toMatch(/letters, numbers, spaces/);
    expect(calls.signUps).toEqual([]);
    expect(calls.inserts).toEqual([]);
  });

  it("signs 'Test user' in to the test_user account", async () => {
    usersTable = [{ id: "u-1", username: "test_user", password_hash: `hash:${PW}`, is_admin: false }];
    const { result } = await renderAuth();
    let outcome;
    await act(async () => {
      outcome = await result.current.login("Test user", PW);
    });

    expect(outcome).toEqual({ success: true, isAdmin: false });
    expect(calls.signIns).toEqual([{ email: "test_user@example.com", password: PW }]);
  });
});

describe("signing out", () => {
  it("ends the Supabase session as well as the site's own sign-in", async () => {
    usersTable = [{ id: "u-1", username: "test_user", password_hash: `hash:${PW}`, is_admin: false }];
    const { result } = await renderAuth();
    await act(async () => {
      await result.current.login("Test user", PW);
    });
    calls.signOuts = 0;
    act(() => result.current.logout());
    expect(calls.signOuts).toBe(1);
    expect(result.current.user).toBeNull();
  });
});
