import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

const members = [
  { wom_id: 1, name: "Moonfern", wom_name: "moonfern", current_lvl: 2100, ehb: 120.7 },
  { wom_id: 2, name: "Ash ko", wom_name: "ash ko", current_lvl: 1900, ehb: 40 },
  { wom_id: 3, name: "TobyTheBold", wom_name: "tobythebold", current_lvl: 2376, ehb: 110 },
  { wom_id: 4, name: "TobyTheIron", wom_name: "tobytheiron", current_lvl: 1614, ehb: 15 },
  { wom_id: 5, name: "Mrtobypants", wom_name: "mrtobypants", current_lvl: 1500, ehb: 0 },
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
    expect(searchMembers(members, "toby").map((m) => m.name)).toEqual([
      "TobyTheBold",
      "TobyTheIron",
      "Mrtobypants",
    ]);
  });

  it("caps the number of results", () => {
    expect(searchMembers(members, "toby", 2)).toHaveLength(2);
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
    expect(screen.queryByText("Moonfern")).toBeNull();
  });

  it("shows matches as you type and picks one on click", async () => {
    render(<MemberSelector onMemberSelect={onMemberSelect} />);
    await userEvent.type(screen.getByRole("combobox"), "toby");

    const options = screen.getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual([
      expect.stringContaining("TobyTheBold"),
      expect.stringContaining("TobyTheIron"),
      expect.stringContaining("Mrtobypants"),
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
    await userEvent.type(input, "toby");
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
    expect(screen.getByText("Moonfern")).toBeInTheDocument();
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
