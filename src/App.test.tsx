import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import App from "./App";
import { dailyWords } from "./lib/daily";
import { encodeStage } from "./lib/share";
import { emptyDaily, saveState } from "./lib/storage";
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
    expect(
      screen.getByRole("heading", { name: "Endless statistics" }),
    ).toBeVisible();
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

    expect(
      screen.getByRole("button", { name: "Play shared stage" }),
    ).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Play shared stage" }));
    expect(stored().stage).toMatchObject({
      number: 1,
      words: SHARED,
      guesses: [],
    });
  });

  it("keeps the next-stage button when an invalid link opens on a finished stage", async () => {
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
    visit("garbage");
    const user = userEvent.setup();
    render(<App />);

    expect(
      screen.getByText("That stage link isn't valid", { selector: ".message" }),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Start stage 2" }));
    expect(screen.getByText(/Stage 2 · Word 1 of 10/)).toBeVisible();
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

describe("App in daily mode", () => {
  // Only Date is faked, so userEvent's timers still run.
  const setToday = (day: number) => vi.setSystemTime(new Date(2026, 9, day, 9));
  const finished = (number: number, words: string[]) => ({
    number,
    words,
    cursor: 9,
    guesses: [words[9]],
    results: words.map((answer) => ({
      answer,
      guesses: 1,
      points: 60,
      gaveUp: false,
    })),
  });

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    setToday(3);
    window.localStorage.clear();
    saveState(seededState());
  });
  afterEach(() => vi.useRealTimers());

  it("switches to today's daily and back without losing endless progress", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.keyboard("crane{Enter}");

    await user.click(screen.getByRole("button", { name: "Daily" }));
    expect(screen.getByText(/Daily #3 · Word 1 of 10/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Daily" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(stored().daily.stage.words).toEqual(dailyWords(3));

    await user.click(screen.getByRole("button", { name: "Endless" }));
    expect(screen.getByText(/Stage 1 · Word 1 of 10/)).toBeVisible();
    expect(stored().stage.guesses).toEqual(["crane"]);
  });

  it("has no detectable accessibility violations on a finished daily", async () => {
    saveState(
      seededState({
        mode: "daily",
        daily: { ...emptyDaily(), stage: finished(3, dailyWords(3)) },
      }),
    );
    const { container } = render(<App />);
    expect(
      screen.getByRole("button", { name: "Back to endless" }),
    ).toBeVisible();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("moves on to the new day's stage when reopened tomorrow", () => {
    saveState(
      seededState({
        mode: "daily",
        daily: { ...emptyDaily(), stage: finished(3, dailyWords(3)) },
      }),
    );
    setToday(4);
    render(<App />);
    expect(screen.getByText(/Daily #4 · Word 1 of 10/)).toBeVisible();
  });

  it("finishes a daily without a share link and heads back to endless", async () => {
    saveState(
      seededState({
        mode: "daily",
        daily: { ...emptyDaily(), stage: finished(3, dailyWords(3)) },
      }),
    );
    const user = userEvent.setup();
    render(<App />);

    expect(
      screen.getByRole("heading", { name: "Daily #3 complete" }),
    ).toBeVisible();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Back to endless" }));
    expect(screen.getByText(/Stage 1 · Word 1 of 10/)).toBeVisible();
  });

  it("shows the daily streak in daily statistics", async () => {
    saveState(
      seededState({
        mode: "daily",
        daily: {
          ...emptyDaily(),
          stage: finished(3, dailyWords(3)),
          streak: 4,
          maxStreak: 6,
          lastCompleted: 3,
        },
      }),
    );
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Stats" }));

    const dialog = screen.getByRole("dialog", { name: "Daily statistics" });
    expect(
      within(dialog).getByText("Current streak").nextSibling,
    ).toHaveTextContent("4");
    expect(
      within(dialog).getByText("Best streak").nextSibling,
    ).toHaveTextContent("6");
    expect(within(dialog).getByText("Dailies completed")).toBeVisible();
    expect(within(dialog).getByText("Best daily")).toBeVisible();
    expect(within(dialog).queryByText("Stages")).not.toBeInTheDocument();
  });

  it("sends a shared link to endless play even from daily mode", () => {
    saveState(seededState({ mode: "daily" }));
    window.history.replaceState(
      null,
      "",
      `/?stage=${encodeStage([...STAGE_WORDS].reverse())}`,
    );
    render(<App />);
    expect(screen.getByText(/Stage 1 · Word 1 of 10/)).toBeVisible();
    expect(stored().stage.words).toEqual([...STAGE_WORDS].reverse());
    window.history.replaceState(null, "", "/");
  });
});
