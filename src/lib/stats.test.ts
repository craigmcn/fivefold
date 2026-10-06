import { describe, expect, it } from "vitest";
import {
  currentStreak,
  recordDailyStreak,
  recordStage,
  recordWord,
} from "./stats";
import { emptyDaily, emptyStats } from "./storage";

describe("recordWord and recordStage", () => {
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
