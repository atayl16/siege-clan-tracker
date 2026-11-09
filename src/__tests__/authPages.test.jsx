import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";

const login = vi.fn();
const navigate = vi.fn();
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ login }) }));
vi.mock("react-router-dom", async (orig) => ({ ...(await orig()), useNavigate: () => navigate }));

import Login from "../components/Login";
import ForgotPassword from "../components/ForgotPassword";

const inRouter = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe("Login", () => {
  beforeEach(() => {
    login.mockReset();
    navigate.mockReset();
  });

  it("signs in and goes to the profile", async () => {
    login.mockResolvedValue({ success: true, isAdmin: false });
    inRouter(<Login />);
    await userEvent.type(screen.getByLabelText(/username/i), "roinrin");
    await userEvent.type(screen.getByLabelText(/password/i), "secret-pass");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(login).toHaveBeenCalledWith("roinrin", "secret-pass");
    expect(navigate).toHaveBeenCalledWith("/profile");
  });

  // A failed attempt must leave the form usable so the user can retry, and
  // must not redirect. Covers both ways login can fail: a returned error and a
  // thrown one (network down).
  it.each([
    ["a returned error", () => login.mockResolvedValue({ error: "Invalid credentials" }), "Invalid credentials"],
    ["a rejected call", () => login.mockRejectedValue(new Error("offline")), "Connection failed"],
  ])("shows a failed sign-in from %s and leaves the form usable", async (_label, arrange, message) => {
    arrange();
    inRouter(<Login />);
    await userEvent.type(screen.getByLabelText(/username/i), "x");
    await userEvent.type(screen.getByLabelText(/password/i), "y");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(screen.getByLabelText(/username/i)).toBeEnabled();
    expect(screen.getByLabelText(/password/i)).toBeEnabled();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeEnabled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("links to Register and to the forgot-password help", () => {
    inRouter(<Login />);
    expect(screen.getByRole("link", { name: "Register here" })).toHaveAttribute("href", "/register");
    expect(screen.getByRole("link", { name: "Forgot your password?" })).toHaveAttribute("href", "/forgot-password");
  });
});

test("Forgot Password explains the admin reset instead of a form that sends nothing", () => {
  inRouter(<ForgotPassword />);
  expect(screen.getByText(/an admin can reset it for you/i)).toBeInTheDocument();
  expect(screen.queryByRole("textbox")).toBeNull();
  expect(screen.queryByRole("button", { name: /submit/i })).toBeNull();
  expect(screen.getByRole("link", { name: /ask on discord/i })).toHaveAttribute("href", expect.stringContaining("discord.com"));
  expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
});
