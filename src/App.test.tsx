import { act, render, screen, within } from "@testing-library/react";
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
  afterEach(() => vi.unstubAllGlobals());

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
          revealed: [],
          eliminated: [],
          eliminations: 0,
          hintsFor: 0,
          hard: false,
          guesses: [],
          results: STAGE_WORDS.slice(0, 9).map((answer) => ({
            answer,
            guesses: 7,
            points: 0,
            gaveUp: false,
            hints: 0,
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

  it("reveals a letter on the board and lowers the guess's worth", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(
      screen.getByRole("button", { name: "Reveal a letter (−20 pts)" }),
    );

    expect(
      screen.getByText("Letter 1 is S", { selector: ".message" }),
    ).toBeVisible();
    expect(
      screen.getByRole("img", { name: /Guess 1: empty; hints: letter 1 is S/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "s, correct" })).toBeVisible();

    await user.keyboard("c");
    expect(screen.getByText("Guess 1 is worth 40 points")).toBeVisible();
    await user.keyboard("{Backspace}stand{Enter}");
    expect(screen.getByText("STAND in one! +40 points")).toBeVisible();
    expect(
      screen.queryByRole("group", { name: "Hints" }),
    ).not.toBeInTheDocument();
  });

  it("rules out letters on the keyboard", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(
      screen.getByRole("button", { name: "Rule out 3 letters (−10 pts)" }),
    );
    const ruledOut = stored().stage.eliminated as string[];
    expect(ruledOut).toHaveLength(3);
    for (const letter of ruledOut) {
      expect(
        screen.getByRole("button", { name: `${letter}, not in the word` }),
      ).toBeVisible();
    }
  });

  it("shows hints as free once guesses stop scoring", async () => {
    const user = userEvent.setup();
    render(<App />);
    for (let i = 0; i < 6; i++) await user.keyboard("crump{Enter}");
    expect(
      screen.getByRole("button", { name: "Reveal a letter (free)" }),
    ).toBeVisible();
  });

  it("shows endless streaks without a days row", async () => {
    saveState(
      seededState({
        stats: {
          ...seededState().stats,
          cleanStreak: 2,
          maxCleanStreak: 3,
          wordStreak: 17,
          maxWordStreak: 25,
        },
      }),
    );
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Stats" }));

    const dialog = screen.getByRole("dialog", { name: "Endless statistics" });
    const row = (name: RegExp) =>
      within(within(dialog).getByRole("row", { name }))
        .getAllByRole("cell")
        .map((c) => c.textContent);
    expect(row(/Clean stages/)).toEqual(["2", "3"]);
    expect(row(/Words in 6 or fewer/)).toEqual(["17", "25"]);
    expect(
      within(dialog).queryByRole("row", { name: /Days completed/ }),
    ).not.toBeInTheDocument();
  });

  it("defines the word once it's solved", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.keyboard("stand{Enter}");
    expect(await screen.findByText("Be upright on one's feet")).toBeVisible();
  });

  it("toasts a new achievement", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.keyboard("stand{Enter}");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Achievement unlocked: First try",
    );
  });

  it("lists achievements in the stats dialog", async () => {
    saveState(seededState({ achievements: ["clean-stage"] }));
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Stats" }));

    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByRole("heading", { name: "Achievements (1 of 10)" }),
    ).toBeVisible();
    expect(
      within(dialog).getByText("Spotless").closest("li"),
    ).toHaveTextContent("Spotless, earned");
    expect(
      within(dialog).getByText("First try").closest("li"),
    ).toHaveTextContent("First try, not yet earned");
    expect(await axe(dialog)).toHaveNoViolations();
  });

  it("turns on hard mode at once for an untouched stage", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("switch", { name: "Hard mode" }));

    expect(screen.getByText("Hard", { selector: ".hard-badge" })).toBeVisible();
    expect(screen.getByText("Guess 1 is worth 90 points")).toBeVisible();
    await user.keyboard("slate{Enter}shank{Enter}");
    expect(
      screen.getByText("Guess must contain T", { selector: ".message" }),
    ).toBeVisible();
    expect(stored()).toMatchObject({ hardMode: true, stage: { hard: true } });
  });

  it("defers hard mode until the next stage once play has started", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.keyboard("crane{Enter}");
    await user.click(screen.getByRole("switch", { name: "Hard mode" }));

    expect(screen.getByText(/from your next stage/)).toBeVisible();
    expect(screen.queryByText("Hard", { selector: ".hard-badge" })).toBeNull();
    expect(screen.getByText("Guess 2 is worth 50 points")).toBeVisible();
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

  it("shares endless results with the stage link via Web Share", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, share });
    saveState(
      seededState({
        stage: {
          number: 4,
          words: STAGE_WORDS,
          cursor: 9,
          revealed: [],
          eliminated: [],
          eliminations: 0,
          hintsFor: 0,
          hard: false,
          guesses: ["dross"],
          results: STAGE_WORDS.map((answer) => ({
            answer,
            guesses: 2,
            points: 50,
            gaveUp: false,
            hints: 0,
          })),
        },
      }),
    );
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Share results" }));

    const { text } = share.mock.calls[0][0] as { text: string };
    expect(text.split("\n")[0]).toBe("Fivefold Stage 4 · 600 pts");
    expect(text).toContain(`?stage=${encodeStage(STAGE_WORDS)}`);
  });

  it("stays quiet when the share sheet is dismissed", async () => {
    const share = vi
      .fn()
      .mockRejectedValue(new DOMException("cancelled", "AbortError"));
    vi.stubGlobal("navigator", { ...navigator, share });
    saveState(
      seededState({
        stage: {
          number: 1,
          words: STAGE_WORDS,
          cursor: 9,
          revealed: [],
          eliminated: [],
          eliminations: 0,
          hintsFor: 0,
          hard: false,
          guesses: ["dross"],
          results: STAGE_WORDS.map((answer) => ({
            answer,
            guesses: 1,
            points: 60,
            gaveUp: false,
            hints: 0,
          })),
        },
      }),
    );
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Share results" }));

    expect(share).toHaveBeenCalled();
    expect(screen.queryByText(/copied|Couldn't share/)).not.toBeInTheDocument();
  });

  it("shows the summary when a saved stage has a word no longer in the answers", () => {
    // "mammy" left the answer list after some players had it in a stage;
    // building its share link used to throw and blank the app on every load.
    const words = ["mammy", ...STAGE_WORDS.slice(1)];
    saveState(
      seededState({
        stage: {
          ...seededState().stage!,
          words,
          cursor: 9,
          guesses: [words[9]],
          results: words.map((answer) => ({
            answer,
            guesses: 1,
            points: 60,
            gaveUp: false,
            hints: 0,
          })),
        },
      }),
    );
    render(<App />);

    expect(
      screen.getByRole("heading", { name: "Stage 1 complete" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Share results" })).toBeVisible();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start stage 2" })).toBeVisible();
  });

  it("starts a fresh stage when a saved result is malformed", () => {
    // A result without its answer crashed WordComplete on every load, leaving
    // only the error screen's full reset.
    const state = seededState();
    window.localStorage.setItem(
      "fivefold",
      JSON.stringify({
        ...state,
        stage: {
          ...state.stage,
          guesses: [STAGE_WORDS[0]],
          results: [{ guesses: 1, points: 60, gaveUp: false, hints: 0 }],
        },
      }),
    );
    render(<App />);

    expect(screen.getByText("Stage 1 · Word 1 of 10")).toBeVisible();
    expect(screen.getByText("Guess 1 is worth 60 points")).toBeVisible();
  });

  it("offers a link to the finished stage", async () => {
    saveState(
      seededState({
        stage: {
          number: 1,
          words: STAGE_WORDS,
          cursor: 9,
          revealed: [],
          eliminated: [],
          eliminations: 0,
          hintsFor: 0,
          hard: false,
          guesses: ["dross"],
          results: STAGE_WORDS.map((answer) => ({
            answer,
            guesses: 1,
            points: 60,
            gaveUp: false,
            hints: 0,
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

  describe("another tab", () => {
    // What the browser fires here after another tab writes the save.
    const otherTabSaves = (
      key: string | null = "fivefold",
      storageArea: Storage = window.localStorage,
    ) =>
      act(() => {
        window.dispatchEvent(new StorageEvent("storage", { key, storageArea }));
      });

    it("shows a guess made in another tab", () => {
      render(<App />);
      const saved = stored();
      saved.stage.guesses = ["crane"];
      window.localStorage.setItem("fivefold", JSON.stringify(saved));
      otherTabSaves();
      expect(
        screen.getByRole("img", { name: /Guess 1: C not in the word/ }),
      ).toBeInTheDocument();
      expect(screen.getByText("Guess 2 is worth 50 points")).toBeVisible();
    });

    it("starts afresh, rather than crashing, when another tab resets", () => {
      render(<App />);
      window.localStorage.clear();
      otherTabSaves(null);
      expect(screen.getByText(/Stage 1 · Word 1 of 10/)).toBeInTheDocument();
      expect(stored().stage.words).toHaveLength(10);
    });

    it("ignores changes to other keys", () => {
      render(<App />);
      const saved = stored();
      saved.stage.guesses = ["crane"];
      window.localStorage.setItem("fivefold", JSON.stringify(saved));
      otherTabSaves("something-else");
      expect(
        screen.queryByRole("img", { name: /Guess 1: C not in the word/ }),
      ).toBeNull();
    });

    it("ignores session storage, even under the same key", () => {
      render(<App />);
      const saved = stored();
      saved.stage.guesses = ["crane"];
      window.localStorage.setItem("fivefold", JSON.stringify(saved));
      otherTabSaves("fivefold", window.sessionStorage);
      expect(
        screen.queryByRole("img", { name: /Guess 1: C not in the word/ }),
      ).toBeNull();
    });
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
      hints: 0,
    }));
    saveState(
      seededState({
        stage: {
          ...seededState().stage!,
          number: 3,
          words: SHARED,
          cursor: 9,
          results,
        },
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
          revealed: [],
          eliminated: [],
          eliminations: 0,
          hintsFor: 0,
          hard: false,
          guesses: ["dross"],
          results: STAGE_WORDS.map((answer) => ({
            answer,
            guesses: 1,
            points: 60,
            gaveUp: false,
            hints: 0,
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
    revealed: [],
    eliminated: [],
    eliminations: 0,
    hintsFor: 0,
    hard: false,
    guesses: [words[9]],
    results: words.map((answer) => ({
      answer,
      guesses: 1,
      points: 60,
      gaveUp: false,
      hints: 0,
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

  it("copies spoiler-free daily results where Web Share is missing", async () => {
    saveState(
      seededState({
        mode: "daily",
        daily: { ...emptyDaily(), stage: finished(3, dailyWords(3)) },
      }),
    );
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Share results" }));

    expect(screen.getByText("Results copied to the clipboard.")).toBeVisible();
    const text = await navigator.clipboard.readText();
    expect(text.split("\n")[0]).toBe("Fivefold Daily #3 · 700 pts");
    expect(text).not.toContain("?stage=");
    for (const word of dailyWords(3)) expect(text).not.toContain(word);
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
    const cells = (name: string) =>
      within(within(dialog).getByRole("row", { name: new RegExp(name) }))
        .getAllByRole("cell")
        .map((c) => c.textContent);
    expect(cells("Days completed")).toEqual(["4", "6"]);
    expect(cells("Clean dailies")).toEqual(["0", "0"]);
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
