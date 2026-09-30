import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import App from "./App";
import { encodeStage } from "./lib/share";
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

  it("offers a link to the finished stage", async () => {
    saveState(
      seededState({
        stage: {
          number: 1,
          words: STAGE_WORDS,
          cursor: 9,
          guesses: ["dross"],
          results: STAGE_WORDS.map((answer) => ({
            answer,
            guesses: 1,
            points: 60,
            gaveUp: false,
          })),
        },
      }),
    );
    render(<App />);
    const link = screen.getByRole<HTMLInputElement>("textbox", {
      name: /Challenge a friend/,
    });
    expect(link.value).toContain(`?stage=${encodeStage(STAGE_WORDS)}`);
  });
});

describe("App with a shared stage link", () => {
  const SHARED = [...STAGE_WORDS].reverse();
  const visit = (code: string) =>
    window.history.replaceState(null, "", `/?stage=${code}`);

  beforeEach(() => window.localStorage.clear());
  afterEach(() => window.history.replaceState(null, "", "/"));

  it("starts the shared stage for a new player and cleans the address", () => {
    visit(encodeStage(SHARED));
    render(<App />);
    expect(screen.getByText(/Stage 1 · Word 1 of 10/)).toBeVisible();
    expect(stored().stage.words).toEqual(SHARED);
    expect(window.location.search).toBe("");
  });

  it("replaces an untouched stage without asking", () => {
    saveState(seededState());
    visit(encodeStage(SHARED));
    render(<App />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(stored().stage).toMatchObject({ number: 1, words: SHARED });
  });

  it("doesn't replay a finished stage when its own link is opened", () => {
    const results = SHARED.map((answer) => ({
      answer,
      guesses: 1,
      points: 60,
      gaveUp: false,
    }));
    saveState(
      seededState({
        stage: { number: 3, words: SHARED, cursor: 9, guesses: [], results },
      }),
    );
    visit(encodeStage(SHARED));
    render(<App />);
    expect(
      screen.getByRole("heading", { name: "Stage 3 complete" }),
    ).toBeVisible();
    expect(stored().stage.results).toHaveLength(10);
  });

  it("asks before abandoning a stage in progress", async () => {
    saveState(
      seededState({
        stage: { ...seededState().stage!, guesses: ["crane"] },
      }),
    );
    visit(encodeStage(SHARED));
    const user = userEvent.setup();
    render(<App />);

    expect(
      screen.getByRole("heading", { name: "Play a shared stage?" }),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Keep my stage" }));
    expect(stored().stage.words).toEqual(STAGE_WORDS);
    expect(stored().stage.guesses).toEqual(["crane"]);
  });

  it("switches to the shared stage when confirmed", async () => {
    saveState(
      seededState({
        stage: { ...seededState().stage!, guesses: ["crane"] },
      }),
    );
    visit(encodeStage(SHARED));
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Play shared stage" }));
    expect(stored().stage).toMatchObject({
      number: 1,
      words: SHARED,
      guesses: [],
    });
  });

  it("reports an invalid link and keeps the current stage", () => {
    saveState(seededState());
    visit("garbage");
    render(<App />);
    expect(
      screen.getByText("That stage link isn't valid", { selector: ".message" }),
    ).toBeVisible();
    expect(stored().stage.words).toEqual(STAGE_WORDS);
  });
});
