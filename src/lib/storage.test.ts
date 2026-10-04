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
      stage: { ...stage, revealed: [], eliminated: [], eliminations: 0 },
    });
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
      },
    };
    window.localStorage.setItem("fivefold", JSON.stringify(stage));
    expect(loadState().stage).toMatchObject({
      revealed: [0],
      eliminated: ["e"],
      eliminations: 0,
    });
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
