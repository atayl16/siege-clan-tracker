import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const updateMember = vi.fn();
const refreshMembers = vi.fn();
vi.mock("../hooks/useMembers", () => ({
  useMembers: () => ({ updateMember, refreshMembers }),
}));

import MemberEditor from "../components/MemberEditor";

const member = (overrides = {}) => ({
  wom_id: 1234,
  name: "Moonfern",
  womrole: "opal",
  join_date: "2024-01-01",
  alt: true,
  ...overrides,
});

describe("MemberEditor alt flag", () => {
  beforeEach(() => {
    updateMember.mockReset().mockResolvedValue({});
    refreshMembers.mockReset().mockResolvedValue();
  });

  it("reflects the member's current alt flag", () => {
    render(<MemberEditor member={member()} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByLabelText(/Alt account/)).toBeChecked();
  });

  it("treats a missing flag as not an alt", () => {
    render(
      <MemberEditor member={member({ alt: null })} onSave={vi.fn()} onCancel={vi.fn()} />
    );
    expect(screen.getByLabelText(/Alt account/)).not.toBeChecked();
  });

  it("saves alt: false when an alt is unticked", async () => {
    const onSave = vi.fn();
    render(<MemberEditor member={member()} onSave={onSave} onCancel={vi.fn()} />);

    fireEvent.click(screen.getByLabelText(/Alt account/));
    fireEvent.click(screen.getByRole("button", { name: /Update Member/ }));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(updateMember).toHaveBeenCalledWith(
      expect.objectContaining({ wom_id: "1234", alt: false })
    );
  });
});

describe("MemberEditor Siege Score", () => {
  beforeEach(() => {
    updateMember.mockReset().mockResolvedValue({});
    refreshMembers.mockReset().mockResolvedValue();
  });

  it("leaves the score out when it was not changed, so an award since the page loaded survives", async () => {
    const onSave = vi.fn();
    render(<MemberEditor member={member({ siege_score: 150 })} onSave={onSave} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByLabelText(/Alt account/));
    fireEvent.click(screen.getByRole("button", { name: /Update Member/ }));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(updateMember.mock.calls[0][0]).not.toHaveProperty("siege_score");
    expect(onSave.mock.calls[0][0]).not.toHaveProperty("siege_score");
  });

  it("sends the score when it was changed here", async () => {
    const onSave = vi.fn();
    render(<MemberEditor member={member({ siege_score: 150 })} onSave={onSave} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Siege Score/), { target: { name: "siege_score", value: "170" } });
    fireEvent.click(screen.getByRole("button", { name: /Update Member/ }));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(updateMember).toHaveBeenCalledWith(expect.objectContaining({ siege_score: 170 }));
  });
});
