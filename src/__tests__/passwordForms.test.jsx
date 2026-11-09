import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../supabaseClient", () => ({
  supabase: {
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: "tok" } } }) },
  },
}));
// The real picker loads users over the network; here it offers one member.
vi.mock("../components/UserSelector", () => ({
  default: ({ onUserSelect }) => (
    <button type="button" onClick={() => onUserSelect({ id: "u-1", username: "roinrin" })}>
      pick roinrin
    </button>
  ),
}));

import AdminPasswordReset from "../components/admin/AdminPasswordReset";
import ChangePassword from "../components/ChangePassword";

const json = (status, body) => new Response(JSON.stringify(body), { status });

describe("password forms", () => {
  const realFetch = globalThis.fetch;
  beforeEach(() => {
    globalThis.fetch = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
    vi.restoreAllMocks();
  });

  describe("AdminPasswordReset", () => {
    it("resets the chosen member and shows the temporary password once", async () => {
      globalThis.fetch.mockResolvedValue(json(200, { username: "roinrin", temporaryPassword: "k7mq-x2dp-9rtw-hb4e" }));
      render(<AdminPasswordReset />);
      await userEvent.click(screen.getByText("pick roinrin"));
      await userEvent.click(screen.getByRole("button", { name: /reset password for roinrin/i }));

      expect(await screen.findByText("k7mq-x2dp-9rtw-hb4e")).toBeInTheDocument();
      const [url, init] = globalThis.fetch.mock.calls[0];
      expect(url).toBe("/.netlify/functions/admin-reset-password");
      expect(init.headers.Authorization).toBe("Bearer tok");
      expect(JSON.parse(init.body)).toEqual({ userId: "u-1" });
    });

    it("does nothing if the admin cancels the confirmation", async () => {
      window.confirm.mockReturnValue(false);
      render(<AdminPasswordReset />);
      await userEvent.click(screen.getByText("pick roinrin"));
      await userEvent.click(screen.getByRole("button", { name: /reset password for roinrin/i }));
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it("shows the server's error", async () => {
      globalThis.fetch.mockResolvedValue(json(403, { error: "Forbidden: Admin access required" }));
      render(<AdminPasswordReset />);
      await userEvent.click(screen.getByText("pick roinrin"));
      await userEvent.click(screen.getByRole("button", { name: /reset password for roinrin/i }));
      expect(await screen.findByRole("alert")).toHaveTextContent("Admin access required");
    });
  });

  describe("ChangePassword", () => {
    const fill = async (current, next, confirm) => {
      await userEvent.click(screen.getByRole("button", { name: "Change password" }));
      await userEvent.type(screen.getByLabelText("Current password"), current);
      await userEvent.type(screen.getByLabelText("New password"), next);
      await userEvent.type(screen.getByLabelText("Confirm new password"), confirm);
      await userEvent.click(screen.getByRole("button", { name: "Save" }));
    };

    it("sends the current and new password, then confirms", async () => {
      globalThis.fetch.mockResolvedValue(json(200, { ok: true }));
      render(<ChangePassword />);
      await fill("k7mq-x2dp-9rtw-hb4e", "my-new-password", "my-new-password");

      await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Password changed."));
      expect(JSON.parse(globalThis.fetch.mock.calls[0][1].body)).toEqual({
        currentPassword: "k7mq-x2dp-9rtw-hb4e",
        newPassword: "my-new-password",
      });
    });

    it.each([
      ["mismatched new passwords", "my-new-password", "my-new-passwor", /don't match/],
      ["a short password", "short", "short", /at least 8/],
    ])("catches %s before sending", async (_label, next, confirm, message) => {
      render(<ChangePassword />);
      await fill("current-pass", next, confirm);
      expect(screen.getByRole("alert")).toHaveTextContent(message);
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it("shows a wrong current password", async () => {
      globalThis.fetch.mockResolvedValue(json(403, { error: "Your current password is not right." }));
      render(<ChangePassword />);
      await fill("wrong-pass", "my-new-password", "my-new-password");
      expect(await screen.findByRole("alert")).toHaveTextContent("current password is not right");
    });
  });
});
