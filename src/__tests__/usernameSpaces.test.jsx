import { renderHook, act, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { normaliseUsername, usernameProblem, signupUsernameProblem } from "../utils/username";
import { displayUsername } from "../utils/stringUtils";

// Every users query and auth call the provider makes, for the tests to read.
const calls = { usernameLookups: [], inserts: [], signUps: [], signIns: [] };
let usersTable = [];
// What the fake supabase.auth.signOut returns; tests swap it.
let signOutResult = async () => ({ error: null });

vi.mock("crypto-hash", () => ({ sha256: async (s) => `hash:${s}` }));
const reloads = { count: 0 };
vi.mock("../utils/reloadPage", () => ({ reloadPage: () => (reloads.count += 1) }));

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
        signOut: (opts) => {
          calls.signOuts = (calls.signOuts || 0) + 1;
          calls.signOutOptions = opts;
          return signOutResult();
        },
      },
    },
  };
});

// Not a real password: the fake client accepts anything.
const PW = "pw";

// Imported after the mocks.
const { AuthProvider, useAuth, removeStoredSupabaseSessions } = await import("../context/AuthContext");

const renderAuth = async () => {
  const hook = renderHook(() => useAuth(), { wrapper: AuthProvider });
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook;
};

beforeEach(() => {
  localStorage.clear();
  usersTable = [];
  signOutResult = async () => ({ error: null });
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
  const signedIn = async () => {
    usersTable = [{ id: "u-1", username: "test_user", password_hash: `hash:${PW}`, is_admin: false }];
    const hook = await renderAuth();
    await act(async () => {
      await hook.result.current.login("Test user", PW);
    });
    calls.signOuts = 0;
    return hook;
  };

  it("ends this browser's Supabase session before showing the visitor as signed out", async () => {
    const { result } = await signedIn();
    let finish;
    signOutResult = () => new Promise((resolve) => (finish = resolve));

    let done;
    act(() => {
      done = result.current.logout();
    });
    expect(calls.signOuts).toBe(1);
    // Local scope: this browser's session goes even when offline.
    expect(calls.signOutOptions).toEqual({ scope: "local" });
    expect(result.current.user).not.toBeNull();

    await act(async () => {
      finish({ error: null });
      await done;
    });
    expect(result.current.user).toBeNull();
  });

  it("still signs out, and clears Supabase's stored session, when Supabase fails", async () => {
    const { result } = await signedIn();
    localStorage.setItem("sb-testproject-auth-token", "{}");
    signOutResult = async () => {
      throw new Error("offline");
    };
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    await act(async () => {
      await result.current.logout();
    });
    expect(result.current.user).toBeNull();
    expect(localStorage.getItem("sb-testproject-auth-token")).toBeNull();
    warn.mockRestore();
  });

  it("waits for a sign-out still in progress before signing someone in", async () => {
    const { result } = await signedIn();
    let finish;
    signOutResult = () => new Promise((resolve) => (finish = resolve));
    act(() => {
      result.current.logout();
    });
    calls.signIns = [];

    let signingIn;
    act(() => {
      signingIn = result.current.login("Test user", PW);
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    // The old sign-out has not finished, so the new sign-in has not started.
    expect(calls.signIns).toEqual([]);

    await act(async () => {
      finish({ error: null });
      await signingIn;
    });
    expect(calls.signIns).toHaveLength(1);
    expect(result.current.user?.username).toBe("test_user");
  });

  it("does not reload when Supabase answers", async () => {
    const { result } = await signedIn();
    reloads.count = 0;
    await act(async () => {
      await result.current.logout();
    });
    expect(reloads.count).toBe(0);
  });

  it("removes only Supabase's session keys", () => {
    localStorage.setItem("sb-testproject-auth-token", "{}");
    localStorage.setItem("sb-testproject-auth-token-code-verifier", "x");
    localStorage.setItem("goalsLastUpdated", "1");
    removeStoredSupabaseSessions();
    expect(localStorage.getItem("sb-testproject-auth-token")).toBeNull();
    expect(localStorage.getItem("sb-testproject-auth-token-code-verifier")).toBeNull();
    expect(localStorage.getItem("goalsLastUpdated")).toBe("1");
  });

  // Keep this last: the stuck sign-out it starts stays pending for the rest of
  // the file (a real page reloads), so any later sign-in here would wait on it.
  it("reloads the page when Supabase never answers, so the stuck sign-out cannot touch a later session", async () => {
    const { result } = await signedIn();
    localStorage.setItem("sb-testproject-auth-token", "{}");
    signOutResult = () => new Promise(() => {}); // never settles
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    reloads.count = 0;
    vi.useFakeTimers();
    try {
      let done;
      act(() => {
        done = result.current.logout();
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
        await done;
      });
    } finally {
      vi.useRealTimers();
      warn.mockRestore();
    }
    expect(result.current.user).toBeNull();
    expect(localStorage.getItem("sb-testproject-auth-token")).toBeNull();
    expect(reloads.count).toBe(1);
  });
});
