import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import LoadError from "../components/ui/LoadError";

test("explains what failed in plain words, keeps the raw error off screen, and retries", async () => {
  const onRetry = vi.fn();
  const spy = vi.spyOn(console, "error").mockImplementation(() => {});
  render(<LoadError what="the member list" error={new TypeError("Failed to fetch")} onRetry={onRetry} />);

  expect(screen.getByRole("alert")).toHaveTextContent("Couldn't load the member list.");
  expect(screen.queryByText(/TypeError|Failed to fetch/)).toBeNull();
  expect(spy).toHaveBeenCalledWith("Failed to load the member list:", expect.any(TypeError));

  await userEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(onRetry).toHaveBeenCalled();
  spy.mockRestore();
});
