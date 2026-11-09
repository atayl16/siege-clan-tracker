import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../supabaseClient", () => ({
  supabase: {
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: "tok" } } }) },
  },
}));
import ChangePassword from "../components/ChangePassword";

const json = (status, body) => new Response(JSON.stringify(body), { status });

describe("ChangePassword form", () => {
  const realFetch = globalThis.fetch;
  beforeEach(() => {
    globalThis.fetch = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
    vi.restoreAllMocks();
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
