import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import SiteFooter from "../components/SiteFooter";
import PrivacyPage from "../pages/PrivacyPage";

describe("SiteFooter", () => {
  it("shows Jagex's fan content disclaimer and links to Privacy", () => {
    render(<MemoryRouter><SiteFooter /></MemoryRouter>);
    expect(screen.getByText(/under the terms of Jagex's Fan Content Policy/)).toBeInTheDocument();
    expect(screen.getByText(/not endorsed by or affiliated with Jagex/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/privacy");
  });
});

describe("PrivacyPage", () => {
  it("covers what we keep, who sees it and how to delete it", () => {
    render(<MemoryRouter><PrivacyPage /></MemoryRouter>);
    for (const heading of ["What we keep", "What other people can see", "Services the site uses", "Changing or deleting your data"]) {
      expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
    }
    expect(screen.getByText(/don't sell your data/)).toBeInTheDocument();
  });
});
