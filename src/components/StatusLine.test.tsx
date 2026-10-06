import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { WordResult } from "../lib/scoring";
import { StatusLine } from "./StatusLine";

const RESULT: WordResult = {
  answer: "crane",
  guesses: 2,
  points: 50,
  gaveUp: false,
  hints: 0,
};

const renderLine = (props: Partial<Parameters<typeof StatusLine>[0]> = {}) => {
  const onNext = vi.fn();
  const onGiveUp = vi.fn();
  render(
    <StatusLine
      message={null}
      result={undefined}
      guessNumber={2}
      worth={50}
      nextLabel="Next word"
      onNext={onNext}
      onGiveUp={onGiveUp}
      {...props}
    />,
  );
  return { onNext, onGiveUp };
};

describe("StatusLine", () => {
  it("says what the next guess is worth", () => {
    renderLine();
    expect(screen.getByText("Guess 2 is worth 50 points")).toBeVisible();
  });

  it("offers to reveal the word once guesses stop scoring", async () => {
    const { onGiveUp } = renderLine({ guessNumber: 7, worth: 0 });
    expect(screen.getByText(/Free guesses/)).toBeVisible();
    await userEvent.click(
      screen.getByRole("button", { name: "Reveal the word" }),
    );
    expect(onGiveUp).toHaveBeenCalledOnce();
  });

  it("shows a message in place of the guess value", () => {
    renderLine({ message: "Not in word list" });
    expect(screen.getByText("Not in word list")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(screen.queryByText(/is worth/)).not.toBeInTheDocument();
  });

  it("keeps the next-word button alongside a message", async () => {
    const { onNext } = renderLine({ message: "Hint used", result: RESULT });
    expect(screen.getByText("Hint used")).toBeInTheDocument();
    expect(screen.getByText("CRANE in 2. +50 points")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Next word" }));
    expect(onNext).toHaveBeenCalledOnce();
  });
});
