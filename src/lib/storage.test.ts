import { beforeEach, describe, expect, it } from "vitest";
import {
  emptyState,
  emptyStats,
  loadState,
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
    });
    stats = recordWord(stats, {
      answer: "dross",
      guesses: 9,
      points: 0,
      gaveUp: true,
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
});
