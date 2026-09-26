import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import App from "./App";
import { saveState } from "./lib/storage";
import { seededState, STAGE_WORDS } from "./test/fixtures";

const stored = () => JSON.parse(window.localStorage.getItem("fivefold")!);

describe("App", () => {
  beforeEach(() => {
    window.localStorage.clear();
    saveState(seededState());
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(<App />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("starts a fresh stage when nothing is saved", () => {
    window.localStorage.clear();
    render(<App />);
    expect(screen.getByText(/Stage 1 · Word 1 of 10/)).toBeInTheDocument();
    expect(stored().stage.words).toHaveLength(10);
  });

  it("colours a submitted guess and keeps it after a reload", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);
    await user.keyboard("crane{Enter}");

    expect(
      screen.getByRole("img", { name: /Guess 1: C not in the word/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "a, correct" })).toBeVisible();
    expect(screen.getByText("Guess 2 is worth 50 points")).toBeVisible();

    unmount();
    render(<App />);
    expect(
      screen.getByRole("img", { name: /Guess 1: C not in the word/ }),
    ).toBeInTheDocument();
  });

  it("rejects words that aren't in the word list", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.keyboard("qzxvj{Enter}");
    expect(
      screen.getByText("Not in word list", { selector: ".message" }),
    ).toBeVisible();
    expect(stored().stage.guesses).toEqual([]);
  });

  it("accepts input from the on-screen keyboard", async () => {
    const user = userEvent.setup();
    render(<App />);
    const keyboard = screen.getByRole("group", { name: "Keyboard" });
    for (const letter of "stand") {
      await user.click(within(keyboard).getByRole("button", { name: letter }));
    }
    await user.click(within(keyboard).getByRole("button", { name: "Enter" }));
    expect(screen.getByText("STAND in one! +60 points")).toBeVisible();
  });

  it("scores a solved word and moves on to the next", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.keyboard("crane{Enter}stand{Enter}");
    expect(screen.getByText("STAND in 2. +50 points")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Next word" }));
    expect(screen.getByText(/Word 2 of 10/)).toBeVisible();
    expect(screen.getByText("50 pts")).toBeVisible();
  });

  it("offers to reveal the word once guesses stop scoring", async () => {
    const user = userEvent.setup();
    render(<App />);
    for (let i = 0; i < 6; i++) await user.keyboard("crane{Enter}");
    expect(screen.getByText(/Free guesses/)).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Reveal the word" }));
    expect(screen.getByText("The word was STAND")).toBeVisible();
  });

  it("shows a stage summary after the tenth word", async () => {
    saveState(
      seededState({
        stage: {
          number: 1,
          words: STAGE_WORDS,
          cursor: 9,
          guesses: [],
          results: STAGE_WORDS.slice(0, 9).map((answer) => ({
            answer,
            guesses: 7,
            points: 0,
            gaveUp: false,
          })),
        },
      }),
    );
    const user = userEvent.setup();
    render(<App />);
    await user.keyboard("dross{Enter}");

    expect(
      screen.getByRole("heading", { name: "Stage 1 complete" }),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Start stage 2" }));
    expect(screen.getByText(/Stage 2 · Word 1 of 10/)).toBeVisible();
    expect(stored().stats.stagesCompleted).toBe(1);
  });

  it("opens the stats dialog", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Stats" }));
    expect(screen.getByRole("heading", { name: "Statistics" })).toBeVisible();
    expect(screen.getByText("Words played")).toBeVisible();
  });
});
