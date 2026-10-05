import { beforeEach, describe, expect, it } from "vitest";
import {
  currentStreak,
  emptyDaily,
  emptyState,
  emptyStats,
  loadState,
  recordDailyStreak,
  recordStage,
  recordWord,
  saveState,
  type Stats,
} from "./storage";

describe("storage", () => {
  beforeEach(() => window.localStorage.clear());

  it("round-trips saved state", () => {
    const state = { ...emptyState(), served: ["stand"] };
    saveState(state);
    expect(loadState()).toEqual(state);
  });

  it("starts fresh on corrupt or unknown-version data", () => {
    window.localStorage.setItem("fivefold", "{not json");
    expect(loadState()).toEqual(emptyState());
    window.localStorage.setItem("fivefold", JSON.stringify({ version: 99 }));
    expect(loadState()).toEqual(emptyState());
  });

  it("drops a malformed stage but keeps stats", () => {
    const state = emptyState();
    window.localStorage.setItem(
      "fivefold",
      JSON.stringify({
        ...state,
        stats: { ...state.stats, totalPoints: 90 },
        stage: { number: 1, words: ["stand"], cursor: 3, guesses: "nope" },
      }),
    );
    const loaded = loadState();
    expect(loaded.stage).toBeNull();
    expect(loaded.stats.totalPoints).toBe(90);
  });

  it("records solved and given-up words", () => {
    let stats = recordWord(emptyStats(), {
      answer: "stand",
      guesses: 3,
      points: 40,
      gaveUp: false,
      hints: 0,
    });
    stats = recordWord(stats, {
      answer: "dross",
      guesses: 9,
      points: 0,
      gaveUp: true,
      hints: 0,
    });
    expect(stats).toMatchObject({
      wordsPlayed: 2,
      wordsGivenUp: 1,
      totalPoints: 40,
      guessHistogram: { 3: 1 },
    });
  });

  it("records completed stages and the best score", () => {
    let stats = recordStage(emptyStats(), 500, true, 100);
    stats = recordStage(stats, 300, false, 0);
    expect(stats).toMatchObject({
      stagesCompleted: 2,
      cleanStages: 1,
      totalPoints: 100,
      bestStageScore: 500,
    });
  });

  it("migrates version 1 saves to endless play with empty daily state", () => {
    const stage = {
      number: 4,
      words: ["stand", "party", "crane", "flock", "shock"].concat([
        "early",
        "adorn",
        "guild",
        "taper",
        "dross",
      ]),
      cursor: 0,
      results: [],
      guesses: ["crane"],
    };
    window.localStorage.setItem(
      "fivefold",
      JSON.stringify({
        version: 1,
        stats: { ...emptyStats(), totalPoints: 120 },
        served: ["stand"],
        stage,
      }),
    );
    expect(loadState()).toEqual({
      ...emptyState(),
      stats: { ...emptyStats(), totalPoints: 120 },
      served: ["stand"],
      // Saves from before hints get the hint fields defaulted.
      stage: {
        ...stage,
        revealed: [],
        eliminated: [],
        eliminations: 0,
        hintsFor: 0,
        hard: false,
      },
    });
  });

  it("drops a stage with a malformed result but keeps stats", () => {
    const state = emptyState();
    window.localStorage.setItem(
      "fivefold",
      JSON.stringify({
        ...state,
        stats: { ...state.stats, totalPoints: 90 },
        stage: {
          number: 1,
          words:
            "stand party crane flock shock early adorn guild taper dross".split(
              " ",
            ),
          cursor: 1,
          results: [null],
          guesses: [],
        },
      }),
    );
    const loaded = loadState();
    expect(loaded.stage).toBeNull();
    expect(loaded.stats.totalPoints).toBe(90);
  });

  it("loads real, fully populated stats unchanged", () => {
    // Guards the field-by-field loadStats: valid data must never be reset.
    const stats = {
      ...emptyStats(),
      wordsPlayed: 231,
      wordsGivenUp: 4,
      stagesCompleted: 23,
      cleanStages: 6,
      totalPoints: 10875,
      bestStageScore: 1395,
      hintsUsed: 12,
      cleanStreak: 2,
      maxCleanStreak: 4,
      wordStreak: 17,
      maxWordStreak: 41,
      guessHistogram: { 1: 3, 2: 40, 3: 88, 4: 61, 5: 22, 6: 9, 7: 3, 9: 1 },
    };
    const daily = { ...emptyDaily(), stats: { ...stats, totalPoints: 4321 } };
    saveState({ ...emptyState(), stats, daily });
    const loaded = loadState();
    expect(loaded.stats).toEqual(stats);
    expect(loaded.daily.stats).toEqual(daily.stats);
  });

  it("defaults corrupt stats fields instead of trusting them", () => {
    window.localStorage.setItem(
      "fivefold",
      JSON.stringify({
        ...emptyState(),
        stats: {
          ...emptyStats(),
          totalPoints: 120,
          wordStreak: "7",
          cleanStages: -2,
          guessHistogram: { 1: 3, 2: "x", 0: 4, nope: 1 },
        },
        daily: { ...emptyDaily(), stats: { guessHistogram: null } },
      }),
    );
    const loaded = loadState();
    expect(loaded.stats).toMatchObject({
      totalPoints: 120,
      wordStreak: 0,
      cleanStages: 0,
      guessHistogram: { 1: 3 },
    });
    expect(loaded.daily.stats.guessHistogram).toEqual({});
  });

  it("drops malformed hint fields without losing the stage", () => {
    const stage = {
      ...emptyState(),
      stage: {
        number: 1,
        words:
          "stand party crane flock shock early adorn guild taper dross".split(
            " ",
          ),
        cursor: 0,
        results: [],
        guesses: [],
        revealed: [0, 9, "x"],
        eliminated: ["e", "EE", 3],
        eliminations: -1,
        hintsFor: 0,
      },
    };
    window.localStorage.setItem("fivefold", JSON.stringify(stage));
    expect(loadState().stage).toMatchObject({
      revealed: [0],
      eliminated: ["e"],
      eliminations: 0,
    });
  });

  it("clears hints left over from an earlier word", () => {
    // What a pre-hints build leaves behind: cursor moved on, hints didn't.
    window.localStorage.setItem(
      "fivefold",
      JSON.stringify({
        ...emptyState(),
        stage: {
          number: 1,
          words:
            "stand party crane flock shock early adorn guild taper dross".split(
              " ",
            ),
          cursor: 1,
          results: [
            {
              answer: "stand",
              guesses: 1,
              points: 40,
              gaveUp: false,
              hints: 1,
            },
          ],
          guesses: [],
          revealed: [0],
          eliminated: ["e", "o", "r"],
          eliminations: 1,
          hintsFor: 0,
        },
      }),
    );
    expect(loadState().stage).toMatchObject({
      cursor: 1,
      revealed: [],
      eliminated: [],
      eliminations: 0,
      hintsFor: 1,
    });
  });

  it("loads achievements, dropping junk and duplicates", () => {
    window.localStorage.setItem(
      "fivefold",
      JSON.stringify({
        ...emptyState(),
        achievements: ["first-try", 3, "first-try", null, "future-badge"],
      }),
    );
    // Unknown ids survive, so a newer build's badges outlive an older one.
    expect(loadState().achievements).toEqual(["first-try", "future-badge"]);
  });

  it("resets malformed daily fields individually", () => {
    window.localStorage.setItem(
      "fivefold",
      JSON.stringify({
        ...emptyState(),
        mode: "sideways",
        daily: { stage: "nope", streak: -2, maxStreak: 5, lastCompleted: 3 },
      }),
    );
    const loaded = loadState();
    expect(loaded.mode).toBe("endless");
    expect(loaded.daily).toEqual({
      ...emptyDaily(),
      maxStreak: 5,
      lastCompleted: 3,
    });
  });
});

describe("stage and word streaks", () => {
  const word = (guesses: number, gaveUp = false) => ({
    answer: "stand",
    guesses,
    points: 0,
    gaveUp,
    hints: 0,
  });

  it("counts words solved within six guesses, hints allowed", () => {
    let stats = emptyStats();
    stats = recordWord(stats, word(1));
    stats = recordWord(stats, { ...word(6), hints: 2 });
    expect(stats).toMatchObject({ wordStreak: 2, maxWordStreak: 2 });
  });

  it("breaks the word streak on a reveal or a seventh guess", () => {
    let stats = recordWord(recordWord(emptyStats(), word(2)), word(3));
    stats = recordWord(stats, word(7));
    expect(stats).toMatchObject({ wordStreak: 0, maxWordStreak: 2 });
    stats = recordWord(recordWord(stats, word(1)), word(4, true));
    expect(stats).toMatchObject({ wordStreak: 0, maxWordStreak: 2 });
  });

  it("counts consecutive clean stages and keeps the best", () => {
    let stats = recordStage(emptyStats(), 700, true, 100);
    stats = recordStage(stats, 700, true, 100);
    expect(stats).toMatchObject({ cleanStreak: 2, maxCleanStreak: 2 });
    stats = recordStage(stats, 400, false, 0);
    expect(stats).toMatchObject({ cleanStreak: 0, maxCleanStreak: 2 });
  });

  it("defaults streaks for saves made before they existed", () => {
    const older: Partial<Stats> = emptyStats();
    delete older.cleanStreak;
    delete older.wordStreak;
    window.localStorage.setItem(
      "fivefold",
      JSON.stringify({ ...emptyState(), stats: { ...older, totalPoints: 5 } }),
    );
    expect(loadState().stats).toMatchObject({
      totalPoints: 5,
      cleanStreak: 0,
      wordStreak: 0,
    });
  });
});

describe("daily streaks", () => {
  it("extends on consecutive days and restarts after a gap", () => {
    let daily = recordDailyStreak(emptyDaily(), 5);
    daily = recordDailyStreak(daily, 6);
    expect(daily).toMatchObject({ streak: 2, maxStreak: 2, lastCompleted: 6 });
    daily = recordDailyStreak(daily, 9);
    expect(daily).toMatchObject({ streak: 1, maxStreak: 2, lastCompleted: 9 });
  });

  it("ignores a day that's already counted", () => {
    const daily = recordDailyStreak(emptyDaily(), 5);
    expect(recordDailyStreak(daily, 5)).toBe(daily);
    expect(recordDailyStreak(daily, 4)).toBe(daily);
  });

  it("reads as zero once a day has been missed", () => {
    const daily = recordDailyStreak(recordDailyStreak(emptyDaily(), 5), 6);
    expect(currentStreak(daily, 6)).toBe(2);
    expect(currentStreak(daily, 7)).toBe(2);
    expect(currentStreak(daily, 8)).toBe(0);
    expect(currentStreak(emptyDaily(), 8)).toBe(0);
  });
});
