import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import NotFoundPage from "../pages/NotFoundPage";

test("an unknown URL shows a clear not-found page with ways back", () => {
  render(
    <MemoryRouter initialEntries={["/races/nope"]}>
      <Routes>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </MemoryRouter>
  );
  expect(screen.getByRole("heading", { name: "Page Not Found" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Go Home" })).toHaveAttribute("href", "/");
  expect(screen.getByRole("link", { name: "Members" })).toHaveAttribute("href", "/members");
  expect(screen.getByRole("link", { name: /Races & Goals/ })).toHaveAttribute("href", "/progress");
});
