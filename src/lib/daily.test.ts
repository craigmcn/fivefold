import { describe, expect, it } from "vitest";
import { ANSWERS } from "../data/answers";
import { dailyWords, dayNumber } from "./daily";
import { STAGE_TIERS } from "./stage";

describe("dayNumber", () => {
  it("counts local calendar days from 1 October 2026", () => {
    expect(dayNumber(new Date(2026, 9, 1, 0, 0))).toBe(1);
    expect(dayNumber(new Date(2026, 9, 1, 23, 59))).toBe(1);
    expect(dayNumber(new Date(2026, 9, 3, 12))).toBe(3);
    expect(dayNumber(new Date(2027, 9, 1))).toBe(366);
  });

  it("never drops below Daily #1 on a clock set before launch", () => {
    expect(dayNumber(new Date(2026, 8, 30))).toBe(1);
    expect(dayNumber(new Date(2020, 0, 1))).toBe(1);
  });

  it("stays one day apart across daylight-saving changes", () => {
    for (const [y, m, d] of [
      [2026, 10, 1],
      [2027, 2, 14],
    ]) {
      const before = dayNumber(new Date(y, m, d, 12));
      expect(dayNumber(new Date(y, m, d + 1, 12))).toBe(before + 1);
    }
  });
});

describe("dailyWords", () => {
  it("is the same for everyone on a given day", () => {
    expect(dailyWords(3)).toEqual(dailyWords(3));
  });

  it("follows the stage's tier shape with ten distinct words", () => {
    const words = dailyWords(42);
    expect(new Set(words).size).toBe(10);
    words.forEach((word, i) => {
      expect(ANSWERS[STAGE_TIERS[i]]).toContain(word);
    });
  });

  it("changes from day to day", () => {
    const days = Array.from({ length: 30 }, (_, i) => dailyWords(i + 1).join());
    expect(new Set(days).size).toBe(30);
  });
});
