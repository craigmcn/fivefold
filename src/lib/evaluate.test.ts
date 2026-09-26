import { describe, expect, it } from "vitest";
import { evaluateGuess, keyboardStatuses } from "./evaluate";

describe("evaluateGuess", () => {
  it("marks exact, misplaced and missing letters", () => {
    expect(evaluateGuess("crane", "caper")).toEqual([
      "correct",
      "present",
      "present",
      "absent",
      "present",
    ]);
  });

  it("marks every letter correct for the answer", () => {
    expect(evaluateGuess("stand", "stand")).toEqual(Array(5).fill("correct"));
  });

  it("only marks as many duplicates present as the answer has", () => {
    expect(evaluateGuess("speed", "abide")).toEqual([
      "absent",
      "absent",
      "present",
      "absent",
      "present",
    ]);
  });

  it("lets an exact match claim a duplicate before a misplaced copy", () => {
    // "grass" has two s's: index 3 claims one, index 0 the other, so the
    // third s in the guess is absent.
    expect(evaluateGuess("sassy", "grass")).toEqual([
      "present",
      "present",
      "absent",
      "correct",
      "absent",
    ]);
  });
});

describe("keyboardStatuses", () => {
  it("keeps the best status seen for each letter", () => {
    const statuses = keyboardStatuses(["crane", "caper"], "caper");
    expect(statuses.get("c")).toBe("correct");
    expect(statuses.get("a")).toBe("correct");
    expect(statuses.get("n")).toBe("absent");
  });
});
