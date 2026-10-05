import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "./ErrorBoundary";

function Broken(): never {
  throw new Error("bad save");
}

describe("ErrorBoundary", () => {
  afterEach(() => vi.restoreAllMocks());

  it("shows its children when nothing goes wrong", () => {
    render(
      <ErrorBoundary>
        <p>All good</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText("All good")).toBeVisible();
  });

  it("offers a reset that clears the saved game and reloads", async () => {
    // React logs caught render errors; keep the test output readable.
    vi.spyOn(console, "error").mockImplementation(() => {});
    const reload = vi
      .spyOn(window.location, "reload")
      .mockImplementation(() => {});
    window.localStorage.setItem("fivefold", "{}");
    const user = userEvent.setup();
    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong");
    await user.click(screen.getByRole("button", { name: "Reset game data" }));
    expect(window.localStorage.getItem("fivefold")).toBeNull();
    expect(reload).toHaveBeenCalledOnce();
  });

  it("can retry without touching the saved game", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const reload = vi
      .spyOn(window.location, "reload")
      .mockImplementation(() => {});
    window.localStorage.setItem("fivefold", "{}");
    const user = userEvent.setup();
    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>,
    );

    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(window.localStorage.getItem("fivefold")).toBe("{}");
    expect(reload).toHaveBeenCalledOnce();
  });
});
