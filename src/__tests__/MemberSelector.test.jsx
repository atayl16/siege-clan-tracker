import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

const members = [
  { wom_id: 1, name: "Roinrin", wom_name: "roinrin", current_lvl: 2100, ehb: 120.7 },
  { wom_id: 2, name: "Dan xo", wom_name: "dan xo", current_lvl: 1900, ehb: 40 },
  { wom_id: 3, name: "ArtyTheBoog", wom_name: "artytheboog", current_lvl: 2376, ehb: 110 },
  { wom_id: 4, name: "ArtyTheIron", wom_name: "artytheiron", current_lvl: 1614, ehb: 15 },
  { wom_id: 5, name: "Smartypants", wom_name: "smartypants", current_lvl: 1500, ehb: 0 },
];
vi.mock("../hooks/useMembers", () => ({
  useMembers: () => ({ members, loading: false, error: null }),
}));

import MemberSelector, { searchMembers } from "../components/MemberSelector";

describe("searchMembers", () => {
  it("returns nothing for an empty query", () => {
    expect(searchMembers(members, "  ")).toEqual([]);
  });

  it("ranks names starting with the query before names containing it", () => {
    expect(searchMembers(members, "arty").map((m) => m.name)).toEqual([
      "ArtyTheBoog",
      "ArtyTheIron",
      "Smartypants",
    ]);
  });

  it("caps the number of results", () => {
    expect(searchMembers(members, "a", 2)).toHaveLength(2);
  });
});

describe("MemberSelector", () => {
  let onMemberSelect;
  beforeEach(() => {
    onMemberSelect = vi.fn();
  });

  it("lists nobody until you type", () => {
    render(<MemberSelector onMemberSelect={onMemberSelect} />);
    fireEvent.focus(screen.getByRole("combobox"));
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(screen.queryByText("Roinrin")).toBeNull();
  });

  it("shows matches as you type and picks one on click", async () => {
    render(<MemberSelector onMemberSelect={onMemberSelect} />);
    await userEvent.type(screen.getByRole("combobox"), "arty");

    const options = screen.getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual([
      expect.stringContaining("ArtyTheBoog"),
      expect.stringContaining("ArtyTheIron"),
      expect.stringContaining("Smartypants"),
    ]);
    fireEvent.mouseDown(options[1]);
    expect(onMemberSelect).toHaveBeenCalledWith(members[3]);
  });

  it("picks with the keyboard, and Enter never submits the surrounding form", async () => {
    const onSubmit = vi.fn((e) => e.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <MemberSelector onMemberSelect={onMemberSelect} />
      </form>
    );
    const input = screen.getByRole("combobox");
    await userEvent.type(input, "arty");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onMemberSelect).toHaveBeenCalledWith(members[3]);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("says so when nobody matches", async () => {
    render(<MemberSelector onMemberSelect={onMemberSelect} />);
    await userEvent.type(screen.getByRole("combobox"), "zzz");
    expect(screen.getByText(/no members match "zzz"/i)).toBeInTheDocument();
  });

  it("shows the chosen member on one line, and Change reopens the search", async () => {
    render(<MemberSelector onMemberSelect={onMemberSelect} selectedMemberId={1} />);
    expect(screen.getByText("Roinrin")).toBeInTheDocument();
    expect(screen.getByText("Lvl 2100")).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Change" }));
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("falls back to the saved name for a member no longer in the list", () => {
    render(
      <MemberSelector onMemberSelect={onMemberSelect} selectedMemberId={999} selectedMemberName="Left Clan" />
    );
    expect(screen.getByText("Left Clan")).toBeInTheDocument();
  });
});
