import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { StaleDailyNotice } from "./StaleDailyNotice";

describe("StaleDailyNotice", () => {
  it("names yesterday's daily and today's", () => {
    render(<StaleDailyNotice day={7} today={8} onDismiss={() => {}} />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "You're finishing yesterday's daily (#7). Today's (#8) starts when you're done.",
    );
  });

  it("names an older daily by number", () => {
    render(<StaleDailyNotice day={5} today={8} onDismiss={() => {}} />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "You're finishing Daily #5. Today's (#8) starts when you're done.",
    );
  });

  it("can be dismissed", async () => {
    const onDismiss = vi.fn();
    render(<StaleDailyNotice day={7} today={8} onDismiss={onDismiss} />);
    await userEvent.click(
      screen.getByRole("button", { name: "Dismiss notice" }),
    );
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
