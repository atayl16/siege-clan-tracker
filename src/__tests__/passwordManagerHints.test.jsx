import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";

// Password managers decide what to save, and as what, from autocomplete and
// name. Without them a new member's password was often not offered for saving.
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ register: vi.fn(), login: vi.fn() }) }));
vi.mock("../supabaseClient", () => ({ supabase: { auth: { getSession: vi.fn() } } }));

import RegistrationForm from "../pages/RegistrationForm";
import Login from "../components/Login";
import ChangePassword from "../components/ChangePassword";

const attrs = (el) => [el.getAttribute("name"), el.getAttribute("autocomplete")];

describe("password manager hints", () => {
  it("marks the sign-up fields as a username and a new password", () => {
    render(<MemoryRouter><RegistrationForm /></MemoryRouter>);
    expect(attrs(screen.getByLabelText(/^Username/))).toEqual(["username", "username"]);
    expect(attrs(screen.getByLabelText(/^Password/))).toEqual(["password", "new-password"]);
    expect(attrs(screen.getByLabelText(/^Confirm Password/))).toEqual(["confirm-password", "new-password"]);
  });

  it("marks the login fields as a username and the current password", () => {
    render(<MemoryRouter><Login /></MemoryRouter>);
    expect(attrs(screen.getByLabelText(/^Username/))).toEqual(["username", "username"]);
    expect(attrs(screen.getByLabelText(/^Password/))).toEqual(["password", "current-password"]);
  });

  it("tells a password manager whose password is being changed", async () => {
    const { container } = render(<ChangePassword username="test_user" />);
    await userEvent.click(screen.getByRole("button", { name: /Change password/i }));
    const username = container.querySelector('input[autocomplete="username"]');
    expect(username).toHaveValue("test_user");
    expect(username).toHaveAttribute("readonly");
    expect(attrs(screen.getByLabelText("Current password"))).toEqual(["current-password", "current-password"]);
    expect(attrs(screen.getByLabelText("New password"))).toEqual(["new-password", "new-password"]);
  });
});
