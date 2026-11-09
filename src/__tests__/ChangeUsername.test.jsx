import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: "tok" } } }),
    },
  },
}));

import ChangeUsername, { usernameProblem } from "../components/ChangeUsername";

const open = async () => {
  await userEvent.click(screen.getByRole("button", { name: "Change username" }));
  return screen.getByLabelText("New username");
};

describe("ChangeUsername", () => {
  const realFetch = globalThis.fetch;
  let onRenamed;
  beforeEach(() => {
    onRenamed = vi.fn();
    globalThis.fetch = vi.fn();
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it("sends the new name with the session token and reports it back", async () => {
    globalThis.fetch.mockResolvedValue(
      new Response(JSON.stringify({ username: "clan_main" }), { status: 200 })
    );
    render(<ChangeUsername currentUsername="roin" onRenamed={onRenamed} />);
    await userEvent.type(await open(), " Clan_Main ");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onRenamed).toHaveBeenCalledWith("clan_main"));
    const [url, init] = globalThis.fetch.mock.calls[0];
    expect(url).toBe("/.netlify/functions/user-rename");
    expect(init.headers.Authorization).toBe("Bearer tok");
    expect(JSON.parse(init.body)).toEqual({ username: "clan_main" });
  });

  it("shows the server's reason when the rename is refused", async () => {
    globalThis.fetch.mockResolvedValue(
      new Response(JSON.stringify({ error: "That username is taken." }), { status: 409 })
    );
    render(<ChangeUsername currentUsername="roin" onRenamed={onRenamed} />);
    await userEvent.type(await open(), "dan");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("That username is taken.");
    expect(onRenamed).not.toHaveBeenCalled();
  });

  it.each([
    ["an invalid name", "has space", /letters, numbers/],
    ["the current name", "roin", /already your username/],
  ])("catches %s before sending anything", async (_label, typed, message) => {
    render(<ChangeUsername currentUsername="roin" onRenamed={onRenamed} />);
    await userEvent.type(await open(), typed);
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByRole("alert")).toHaveTextContent(message);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});

describe("usernameProblem", () => {
  it("matches the server's rule", () => {
    expect(usernameProblem("roin_rin")).toBeNull();
    expect(usernameProblem("ab")).not.toBeNull();
    expect(usernameProblem("trail-")).not.toBeNull();
  });
});
