import { describe, expect, it } from "vitest";
import {
  activeStage,
  gameReducer,
  isStageDone,
  isWordDone,
  type GameAction,
  type GameState,
} from "./game";
import { emptyState } from "./storage";

const WORDS = [
  "stand",
  "party",
  "crane",
  "flock",
  "shock",
  "early",
  "adorn",
  "guild",
  "taper",
  "dross",
];

const start = (): GameState =>
  gameReducer(
    {
      saved: emptyState(),
      input: "",
      message: null,
      rejections: 0,
      unlocked: [],
    },
    { type: "newStage", words: WORDS, served: [] },
  );

const typeWord = (state: GameState, word: string): GameState =>
  [...word, "\n"].reduce<GameState>(
    (s, c) =>
      gameReducer(
        s,
        c === "\n"
          ? { type: "submit" }
          : ({ type: "letter", letter: c } as GameAction),
      ),
    state,
  );

describe("gameReducer", () => {
  it("starts stage 1 on the first word", () => {
    const { stage } = start().saved;
    expect(stage).toMatchObject({ number: 1, cursor: 0, guesses: [] });
  });

  it("rejects short guesses and unknown words without using a guess", () => {
    let state = typeWord(start(), "sta");
    expect(state.message).toBe("Not enough letters");
    state = gameReducer(
      gameReducer(gameReducer(state, { type: "backspace" }), {
        type: "backspace",
      }),
      { type: "backspace" },
    );
    state = typeWord(state, "zzzzz");
    expect(state.message).toBe("Not in word list");
    expect(state.rejections).toBe(2);
    expect(state.saved.stage?.guesses).toEqual([]);
  });

  it("caps input at five letters", () => {
    const state = [..."standing"].reduce(
      (s, letter) => gameReducer(s, { type: "letter", letter }),
      start(),
    );
    expect(state.input).toBe("stand");
  });

  it("scores a solved word and records stats", () => {
    let state = typeWord(start(), "crane");
    state = typeWord(state, "stand");
    const stage = state.saved.stage!;
    expect(isWordDone(stage)).toBe(true);
    expect(stage.results[0]).toEqual({
      answer: "stand",
      guesses: 2,
      points: 50,
      gaveUp: false,
      hints: 0,
    });
    expect(state.saved.stats).toMatchObject({
      wordsPlayed: 1,
      totalPoints: 50,
      guessHistogram: { 2: 1 },
    });
    expect(state.saved.served).toEqual(["stand"]);
  });

  it("ignores typing once the word is done, until moving on", () => {
    let state = typeWord(start(), "stand");
    state = gameReducer(state, { type: "letter", letter: "a" });
    expect(state.input).toBe("");
    state = gameReducer(state, { type: "nextWord" });
    expect(state.saved.stage).toMatchObject({ cursor: 1, guesses: [] });
  });

  it("doesn't duplicate an answer that was already served", () => {
    let state = start();
    state = { ...state, saved: { ...state.saved, served: ["stand"] } };
    state = typeWord(state, "stand");
    expect(state.saved.served).toEqual(["stand"]);
  });

  it("gives up for zero points", () => {
    let state = typeWord(start(), "crane");
    state = gameReducer(state, { type: "giveUp" });
    expect(state.saved.stage?.results[0]).toMatchObject({
      gaveUp: true,
      hints: 0,
      points: 0,
    });
    expect(state.saved.stats.wordsGivenUp).toBe(1);
  });

  it("completes a stage with the clean bonus", () => {
    let state = start();
    WORDS.forEach((word, i) => {
      state = typeWord(state, word);
      if (i < WORDS.length - 1)
        state = gameReducer(state, { type: "nextWord" });
    });
    const stage = state.saved.stage!;
    expect(isStageDone(stage)).toBe(true);
    // 8 regular words × 60, boss ×2 and ×3, plus the 100-point bonus.
    expect(state.saved.stats).toMatchObject({
      stagesCompleted: 1,
      cleanStages: 1,
      totalPoints: 8 * 60 + 120 + 180 + 100,
      bestStageScore: 8 * 60 + 120 + 180 + 100,
      cleanStreak: 1,
      wordStreak: 10,
      maxWordStreak: 10,
    });

    state = gameReducer(state, { type: "newStage", words: WORDS, served: [] });
    expect(state.saved.stage).toMatchObject({ number: 2, cursor: 0 });
  });

  it("keeps the number when a new stage replaces an unfinished one", () => {
    let state = typeWord(start(), "stand");
    state = gameReducer(state, { type: "newStage", words: WORDS, served: [] });
    expect(state.saved.stage).toMatchObject({
      number: 1,
      cursor: 0,
      results: [],
    });
  });
});

describe("daily mode", () => {
  const DAILY = [...WORDS].reverse();
  const startDaily = (state: GameState, day = 7) =>
    gameReducer(state, { type: "startDaily", day, words: DAILY });

  it("plays the daily stage without touching the endless one", () => {
    let state = typeWord(start(), "crane");
    state = startDaily(state);
    expect(state.saved.mode).toBe("daily");
    expect(activeStage(state.saved)).toMatchObject({ number: 7, words: DAILY });

    state = typeWord(state, "dross");
    expect(state.saved.daily.stats.wordsPlayed).toBe(1);
    expect(state.saved.stats.wordsPlayed).toBe(0);
    expect(state.saved.served).toContain("dross");

    state = gameReducer(state, { type: "setMode", mode: "endless" });
    expect(activeStage(state.saved)!.guesses).toEqual(["crane"]);
  });

  it("doesn't restart a day that's already been started", () => {
    let state = typeWord(startDaily(start()), "dross");
    state = gameReducer(state, { type: "setMode", mode: "endless" });
    state = startDaily(state);
    expect(state.saved.daily.stage!.results).toHaveLength(1);
  });

  it("records the streak when the daily stage is completed", () => {
    let state = startDaily(start());
    DAILY.forEach((word, i) => {
      state = typeWord(state, word);
      if (i < DAILY.length - 1)
        state = gameReducer(state, { type: "nextWord" });
    });
    expect(state.saved.daily).toMatchObject({
      streak: 1,
      lastCompleted: 7,
      stats: { stagesCompleted: 1, cleanStages: 1 },
    });
    expect(state.saved.stats.stagesCompleted).toBe(0);
  });

  it("keeps typed letters when the current mode is picked again", () => {
    let state = startDaily(start());
    state = gameReducer(state, { type: "letter", letter: "d" });
    state = startDaily(state);
    state = gameReducer(state, { type: "setMode", mode: "daily" });
    expect(state.input).toBe("d");
  });

  it("returns to endless mode when a new endless stage starts", () => {
    let state = startDaily(start());
    state = gameReducer(state, { type: "newStage", words: WORDS, served: [] });
    expect(state.saved.mode).toBe("endless");
  });
});

describe("hints", () => {
  it("reveals a letter, costing two guess-steps of points", () => {
    let state = gameReducer(start(), { type: "revealLetter" });
    expect(state.message).toBe("Letter 1 is S");
    expect(state.saved.stage!.revealed).toEqual([0]);

    state = typeWord(state, "stand");
    // Solved on guess 1 + 2 steps scores like guess 3.
    expect(state.saved.stage!.results[0]).toMatchObject({
      points: 40,
      hints: 1,
    });
    expect(state.saved.stats.hintsUsed).toBe(1);
  });

  it("rules out letters, costing one guess-step", () => {
    let state = gameReducer(start(), { type: "eliminateLetters" });
    expect(state.saved.stage!.eliminated).toHaveLength(3);
    expect(state.saved.stage!.eliminations).toBe(1);
    state = typeWord(state, "stand");
    expect(state.saved.stage!.results[0].points).toBe(50);
  });

  it("clears hints for the next word", () => {
    let state = gameReducer(start(), { type: "revealLetter" });
    state = gameReducer(state, { type: "eliminateLetters" });
    state = typeWord(state, "stand");
    state = gameReducer(state, { type: "nextWord" });
    expect(state.saved.stage).toMatchObject({
      revealed: [],
      eliminated: [],
      eliminations: 0,
    });
  });

  it("does nothing once the word is solved", () => {
    const solved = typeWord(start(), "stand");
    expect(gameReducer(solved, { type: "revealLetter" })).toBe(solved);
    expect(gameReducer(solved, { type: "eliminateLetters" })).toBe(solved);
  });

  it("tags hint state with the word it belongs to", () => {
    let state = typeWord(start(), "stand");
    state = gameReducer(state, { type: "nextWord" });
    expect(state.saved.stage!.hintsFor).toBe(1);
  });

  it("counts daily hints in daily stats only", () => {
    let state = gameReducer(start(), {
      type: "startDaily",
      day: 7,
      words: [...WORDS].reverse(),
    });
    state = gameReducer(state, { type: "revealLetter" });
    state = typeWord(state, "dross");
    expect(state.saved.daily.stats.hintsUsed).toBe(1);
    expect(state.saved.stats.hintsUsed).toBe(0);
  });

  it("voids the clean-stage bonus", () => {
    let state = gameReducer(start(), { type: "eliminateLetters" });
    WORDS.forEach((word, i) => {
      state = typeWord(state, word);
      if (i < WORDS.length - 1)
        state = gameReducer(state, { type: "nextWord" });
    });
    expect(state.saved.stats.cleanStages).toBe(0);
    // One step off word 1 (60 → 50); no bonus.
    expect(state.saved.stats.bestStageScore).toBe(8 * 60 - 10 + 120 + 180);
  });
});

describe("achievements", () => {
  it("records and queues a badge when it's earned", () => {
    const state = typeWord(start(), "stand");
    expect(state.saved.achievements).toEqual(["first-try"]);
    expect(state.unlocked).toEqual(["first-try"]);

    const dismissed = gameReducer(state, { type: "dismissUnlocked" });
    expect(dismissed.unlocked).toEqual([]);
    expect(dismissed.saved.achievements).toEqual(["first-try"]);
  });

  it("keeps the same unlocked list when a word earns nothing", () => {
    let state = typeWord(start(), "stand");
    state = gameReducer(state, { type: "nextWord" });
    const before = state.unlocked;
    state = typeWord(typeWord(state, "crane"), "party");
    expect(state.unlocked).toBe(before);
  });

  it("awards stage badges when a clean stage completes", () => {
    let state = start();
    WORDS.forEach((word, i) => {
      state = typeWord(state, word);
      if (i < WORDS.length - 1)
        state = gameReducer(state, { type: "nextWord" });
    });
    // Every word in one guess, so word 10 also earns Brutal efficiency.
    expect(state.saved.achievements).toEqual([
      "first-try",
      "brutal-three",
      "clean-stage",
      "no-reveal-stage",
    ]);
  });
});
