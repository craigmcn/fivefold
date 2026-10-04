import { describe, expect, it } from "vitest";
import { STAGE_WORDS } from "../test/fixtures";
import { newlyEarned, type AchievementContext } from "./achievements";
import type { WordResult } from "./scoring";
import { emptyState, emptyStats, type SavedState } from "./storage";

const word = (guesses: number, extra: Partial<WordResult> = {}) => ({
  answer: "stand",
  guesses,
  points: 0,
  gaveUp: false,
  hints: 0,
  ...extra,
});

const ctx = (c: Partial<AchievementContext>): AchievementContext => ({
  saved: emptyState(),
  result: word(4),
  index: 0,
  stage: null,
  ...c,
});

const withStats = (endless: object, daily: object = {}): SavedState => ({
  ...emptyState(),
  stats: { ...emptyStats(), ...endless },
  daily: { ...emptyState().daily, stats: { ...emptyStats(), ...daily } },
});

describe("newlyEarned", () => {
  it("awards First try only for an unhinted one-guess solve", () => {
    expect(newlyEarned(ctx({ result: word(1) }))).toEqual(["first-try"]);
    expect(newlyEarned(ctx({ result: word(1, { hints: 1 }) }))).toEqual([]);
    expect(newlyEarned(ctx({ result: word(2) }))).toEqual([]);
  });

  it("awards Brutal efficiency only on the 10th word", () => {
    expect(newlyEarned(ctx({ result: word(3), index: 9 }))).toEqual([
      "brutal-three",
    ]);
    expect(newlyEarned(ctx({ result: word(3), index: 4 }))).toEqual([]);
    expect(
      newlyEarned(ctx({ result: word(3, { gaveUp: true }), index: 9 })),
    ).toEqual([]);
  });

  it("judges stage badges only when a stage completes", () => {
    const clean = STAGE_WORDS.map(() => word(2));
    expect(newlyEarned(ctx({ stage: clean }))).toEqual([
      "clean-stage",
      "no-reveal-stage",
    ]);
    const slow = clean.map((r, i) => (i === 3 ? word(8) : r));
    expect(newlyEarned(ctx({ stage: slow }))).toEqual(["no-reveal-stage"]);
    const revealed = clean.map((r, i) =>
      i === 3 ? word(8, { gaveUp: true }) : r,
    );
    expect(newlyEarned(ctx({ stage: revealed }))).toEqual([]);
  });

  it("sums milestones across endless and daily", () => {
    const saved = withStats(
      { stagesCompleted: 6, wordsPlayed: 60, totalPoints: 6000 },
      { stagesCompleted: 4, wordsPlayed: 40, totalPoints: 4000 },
    );
    expect(newlyEarned(ctx({ saved }))).toEqual([
      "ten-stages",
      "words-100",
      "points-10k",
    ]);
  });

  it("uses the best streak from either mode", () => {
    const saved = withStats(
      { cleanStreak: 1 },
      { cleanStreak: 3, wordStreak: 25 },
    );
    expect(newlyEarned(ctx({ saved }))).toEqual([
      "clean-streak-3",
      "word-streak-25",
    ]);
  });

  it("never awards a badge twice", () => {
    const saved = { ...emptyState(), achievements: ["first-try"] };
    expect(newlyEarned(ctx({ saved, result: word(1) }))).toEqual([]);
  });
});
