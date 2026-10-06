import { describe, expect, it } from "vitest";
import { announcement } from "./announce";
import type { WordResult } from "./scoring";

const SOLVED: WordResult = {
  answer: "crane",
  guesses: 2,
  points: 50,
  gaveUp: false,
  hints: 0,
};

const base = {
  message: null,
  result: undefined,
  lastGuess: undefined,
  answer: "crane",
};

describe("announcement", () => {
  it("says nothing before the first guess", () => {
    expect(announcement(base)).toBe("");
  });

  it("describes the latest guess", () => {
    expect(announcement({ ...base, lastGuess: "trace" })).toBe(
      "T not in the word, R correct, A correct, C in the word, wrong spot, E correct",
    );
  });

  it("announces a solved or revealed word over the last guess", () => {
    expect(announcement({ ...base, lastGuess: "crane", result: SOLVED })).toBe(
      "Solved: crane, 50 points",
    );
    expect(
      announcement({
        ...base,
        result: { ...SOLVED, points: 0, gaveUp: true },
      }),
    ).toBe("The word was crane");
  });

  it("puts a message first", () => {
    expect(
      announcement({
        ...base,
        message: "Not in word list",
        lastGuess: "trace",
        result: SOLVED,
      }),
    ).toBe("Not in word list");
  });
});
