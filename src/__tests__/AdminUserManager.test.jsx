import React from "react";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const toggleAdminStatus = vi.fn();
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: { id: "me", username: "alisha" }, toggleAdminStatus }),
}));

const refresh = vi.fn();
let data;
vi.mock("../context/DataContext", () => ({ useData: () => data }));

vi.mock("../supabaseClient", () => ({
  supabase: {
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: "tok" } } }) },
  },
}));

import AdminUserManager from "../components/admin/AdminUserManager";

const users = [
  { id: "a-1", username: "admin", is_admin: true, created_at: "2025-01-01T00:00:00Z" },
  { id: "me", username: "alisha", is_admin: true, created_at: "2026-11-09T00:00:00Z" },
  { id: "u-2", username: "dan", is_admin: false, created_at: "2026-01-01T00:00:00Z" },
  { id: "u-3", username: "zed", is_admin: true, created_at: "2026-02-01T00:00:00Z" },
];

const row = (name) => screen.getByText(name, { selector: ".user-name" }).closest("tr");

describe("AdminUserManager", () => {
  const realFetch = globalThis.fetch;
  beforeEach(() => {
    data = { users, loading: false, error: null, refresh };
    toggleAdminStatus.mockReset().mockResolvedValue({ success: true });
    refresh.mockReset();
    globalThis.fetch = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
    vi.restoreAllMocks();
  });

  it("lists every account in one table, admins first", () => {
    render(<AdminUserManager />);
    const names = screen.getAllByText(/^(admin|alisha|dan|zed)$/, { selector: ".user-name" }).map((el) => el.textContent);
    expect(names).toEqual(["admin", "alisha", "zed", "dan"]);
  });

  it("asks before making someone an admin, and does it on yes", async () => {
    render(<AdminUserManager />);
    await userEvent.click(within(row("dan")).getByRole("button", { name: "Make Admin" }));

    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("Make dan an admin?"));
    expect(toggleAdminStatus).toHaveBeenCalledWith("u-2", true);
    expect(await screen.findByText("dan is now an admin.")).toBeInTheDocument();
    expect(refresh).toHaveBeenCalled();
  });

  it("does nothing when the confirmation is declined", async () => {
    window.confirm.mockReturnValue(false);
    render(<AdminUserManager />);
    await userEvent.click(within(row("zed")).getByRole("button", { name: "Remove Admin" }));
    expect(toggleAdminStatus).not.toHaveBeenCalled();
  });

  it("offers no admin or password actions on the built-in admin account", () => {
    render(<AdminUserManager />);
    const admin = within(row("admin"));
    expect(admin.queryByRole("button")).toBeNull();
    expect(admin.getByText("Built-in admin")).toBeInTheDocument();
  });

  it("does not let you remove your own admin access", () => {
    render(<AdminUserManager />);
    expect(within(row("alisha")).queryByRole("button", { name: "Remove Admin" })).toBeNull();
  });

  it("resets a password after confirming and shows the temporary password once", async () => {
    globalThis.fetch.mockResolvedValue(
      new Response(JSON.stringify({ username: "dan", temporaryPassword: "k7mq-x2dp-9rtw-hb4e" }), { status: 200 })
    );
    render(<AdminUserManager />);
    await userEvent.click(within(row("dan")).getByRole("button", { name: "Reset Password" }));

    expect(await screen.findByText("k7mq-x2dp-9rtw-hb4e")).toBeInTheDocument();
    const [url, init] = globalThis.fetch.mock.calls[0];
    expect(url).toBe("/.netlify/functions/admin-reset-password");
    expect(init.headers.Authorization).toBe("Bearer tok");
    expect(JSON.parse(init.body)).toEqual({ userId: "u-2" });

    await userEvent.click(screen.getByRole("button", { name: "Done" }));
    await waitFor(() => expect(screen.queryByText("k7mq-x2dp-9rtw-hb4e")).toBeNull());
  });

  it("shows the server's error", async () => {
    globalThis.fetch.mockResolvedValue(new Response(JSON.stringify({ error: "Forbidden: Admin access required" }), { status: 403 }));
    render(<AdminUserManager />);
    await userEvent.click(within(row("dan")).getByRole("button", { name: "Reset Password" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Admin access required");
  });

  it("filters by search", async () => {
    render(<AdminUserManager />);
    await userEvent.type(screen.getByRole("textbox", { name: "Search users" }), "da");
    expect(screen.getAllByText(/./, { selector: ".user-name" }).map((el) => el.textContent)).toEqual(["dan"]);
  });

  it("shows a loading error", () => {
    data = { users: [], loading: false, error: "Failed to load users (401)", refresh };
    render(<AdminUserManager />);
    expect(screen.getByRole("alert")).toHaveTextContent("Failed to load users (401)");
  });
});
