import { describe, expect, it } from "vitest";
import { hardModeViolation } from "./hardMode";

describe("hardModeViolation", () => {
  it("allows anything before the first guess", () => {
    expect(hardModeViolation("qzxvj", [], "stand", [])).toBeNull();
  });

  it("keeps green letters in place", () => {
    // "slate" vs "stand": s green, a green, t yellow.
    expect(hardModeViolation("sweat", ["slate"], "stand", [])).toBe(
      "3rd letter must be A",
    );
    expect(hardModeViolation("stank", ["slate"], "stand", [])).toBeNull();
  });

  it("requires yellow letters somewhere", () => {
    expect(hardModeViolation("shank", ["slate"], "stand", [])).toBe(
      "Guess must contain T",
    );
  });

  it("counts repeated clues", () => {
    // "eerie" vs "geese": Es green at 2nd and 5th, plus one yellow → 3 Es.
    expect(hardModeViolation("levee", ["eerie"], "geese", [])).toBeNull();
    expect(hardModeViolation("fence", ["eerie"], "geese", [])).toBe(
      "Guess must contain 3 Es",
    );
  });

  it("treats hint-revealed letters like greens", () => {
    expect(hardModeViolation("crane", [], "stand", [0])).toBe(
      "1st letter must be S",
    );
    expect(hardModeViolation("spine", [], "stand", [0])).toBeNull();
  });

  it("doesn't enforce grey letters", () => {
    expect(hardModeViolation("stall", ["slate"], "stand", [])).toBeNull();
  });
});
