import { describe, expect, it } from "vitest";
import {
  CLEAN_STAGE_BONUS,
  cleanBonus,
  isCleanStage,
  pointsFor,
  stageScore,
  type WordResult,
} from "./scoring";

const result = (guesses: number, overrides: Partial<WordResult> = {}) => ({
  answer: "stand",
  guesses,
  points: pointsFor(guesses, 0, false),
  gaveUp: false,
  hints: 0,
  ...overrides,
});

describe("pointsFor", () => {
  it("drops by ten points per guess", () => {
    expect([1, 2, 3, 4, 5, 6].map((n) => pointsFor(n, 0, false))).toEqual([
      60, 50, 40, 30, 20, 10,
    ]);
  });

  it("gives nothing after the sixth guess", () => {
    expect(pointsFor(7, 0, false)).toBe(0);
    expect(pointsFor(12, 9, false)).toBe(0);
  });

  it("multiplies the boss words", () => {
    expect(pointsFor(3, 4, false)).toBe(80);
    expect(pointsFor(3, 9, false)).toBe(120);
  });
});

describe("stageScore", () => {
  it("adds a bonus when every word is solved within six guesses", () => {
    const results = Array.from({ length: 10 }, () => result(6));
    expect(isCleanStage(results)).toBe(true);
    expect(stageScore(results, false)).toBe(10 * 10 + CLEAN_STAGE_BONUS);
  });

  it("withholds the bonus if any word took more than six guesses", () => {
    const results = [...Array.from({ length: 9 }, () => result(2)), result(7)];
    expect(isCleanStage(results)).toBe(false);
    expect(stageScore(results, false)).toBe(9 * 50);
  });

  it("withholds the bonus if any word was given up", () => {
    const results = [
      ...Array.from({ length: 9 }, () => result(2)),
      result(3, { gaveUp: true, points: 0 }),
    ];
    expect(isCleanStage(results)).toBe(false);
  });
});

describe("hard mode scoring", () => {
  it("scales points and the clean bonus by 1.5", () => {
    expect(pointsFor(1, 0, true)).toBe(90);
    expect(pointsFor(2, 4, true)).toBe(150);
    expect(pointsFor(7, 0, true)).toBe(0);
    expect(cleanBonus(true)).toBe(150);
    expect(cleanBonus(false)).toBe(CLEAN_STAGE_BONUS);
  });
});
