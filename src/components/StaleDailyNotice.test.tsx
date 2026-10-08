import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StaleDailyNotice } from "./StaleDailyNotice";

describe("StaleDailyNotice", () => {
  it("names yesterday's daily and today's", () => {
    render(<StaleDailyNotice day={7} today={8} />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "You're finishing yesterday's daily (#7). Today's (#8) starts when you're done.",
    );
  });

  it("names an older daily by number", () => {
    render(<StaleDailyNotice day={5} today={8} />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "You're finishing Daily #5. Today's (#8) starts when you're done.",
    );
  });
});
