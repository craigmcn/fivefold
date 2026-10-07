import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  emptyDaily,
  emptyState,
  emptyStats,
  loadState,
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

  it("skips writing a save that hasn't changed", () => {
    const state = { ...emptyState(), served: ["stand"] };
    saveState(state);
    const setItem = vi.spyOn(window.localStorage, "setItem");
    saveState({ ...state });
    expect(setItem).not.toHaveBeenCalled();
    saveState({ ...state, served: ["party"] });
    expect(setItem).toHaveBeenCalledOnce();
    setItem.mockRestore();
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

  it("drops a stage whose result is missing or mistypes a field", () => {
    const words =
      "stand party crane flock shock early adorn guild taper dross".split(" ");
    const good = {
      answer: "stand",
      guesses: 2,
      points: 50,
      gaveUp: false,
      hints: 0,
    };
    const load = (result: object) => {
      window.localStorage.setItem(
        "fivefold",
        JSON.stringify({
          ...emptyState(),
          stage: {
            number: 1,
            words,
            cursor: 0,
            results: [result],
            guesses: [],
          },
        }),
      );
      return loadState().stage;
    };
    expect(load(good)).not.toBeNull();
    for (const bad of [
      { ...good, answer: undefined },
      { ...good, answer: "party" },
      { ...good, guesses: "2" },
      { ...good, points: -50 },
      { ...good, points: 12.5 },
      { ...good, gaveUp: "no" },
    ]) {
      expect(load(bad)).toBeNull();
    }
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
