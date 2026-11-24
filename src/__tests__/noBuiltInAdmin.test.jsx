import React from "react";
import { render, screen, renderHook, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";

// The built-in admin (a hard-coded login that signed in to a shared Supabase
// account) was removed on 2026-11-24. Admins are ordinary accounts now.

vi.mock("crypto-hash", () => ({ sha256: async (s) => `hash:${s}` }));
vi.mock("../utils/reloadPage", () => ({ reloadPage: () => {} }));

const lookups = [];
vi.mock("../supabaseClient", () => {
  const builder = {
    select: () => builder,
    eq: (col, val) => (lookups.push([col, val]), builder),
    single: async () => ({ data: null, error: { message: "not found" } }),
  };
  return {
    supabase: {
      from: () => builder,
      rpc: vi.fn(async () => ({ error: null })),
      auth: {
        getSession: async () => ({ data: { session: null } }),
        signOut: async () => ({ error: null }),
        signInWithPassword: vi.fn(async () => ({ error: { message: "no" } })),
        signUp: vi.fn(async () => ({ error: { message: "no" } })),
      },
    },
  };
});

const { AuthProvider, useAuth } = await import("../context/AuthContext");
const { supabase } = await import("../supabaseClient");

const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

describe("no built-in admin", () => {
  beforeEach(() => {
    localStorage.clear();
    lookups.length = 0;
    supabase.auth.signInWithPassword.mockClear();
    supabase.rpc.mockClear();
  });

  it("signs out a browser still holding the old built-in admin session", async () => {
    localStorage.setItem("adminAuth", "true");
    localStorage.setItem("useServiceRole", "true");
    localStorage.setItem("user", JSON.stringify({ id: "admin", username: "admin", is_admin: true }));

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.user).toBeNull();
    expect(localStorage.getItem("adminAuth")).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();
    expect(localStorage.getItem("useServiceRole")).toBeNull();
  });

  it("treats the username admin like any other: no shared Supabase account, no admin rights", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const outcome = await result.current.login("admin", "anything");

    expect(outcome).toEqual({ error: "Invalid credentials" });
    expect(lookups).toContainEqual(["username", "admin"]);
    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
    expect(supabase.rpc).not.toHaveBeenCalled();
    expect(localStorage.getItem("adminAuth")).toBeNull();
  });
});

describe("Navbar", () => {
  it("shows every signed-in member a Profile link, an account named admin included", async () => {
    vi.resetModules();
    vi.doMock("../context/AuthContext", () => ({
      useAuth: () => ({
        user: { id: "u1", username: "admin", is_admin: true },
        isLoggedIn: () => true,
        isAdmin: () => true,
        logout: vi.fn(),
      }),
    }));
    const { default: Navbar } = await import("../components/Navbar");
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );
    expect(screen.getByRole("link", { name: "Profile" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Admin" })).toBeInTheDocument();
  });
});
