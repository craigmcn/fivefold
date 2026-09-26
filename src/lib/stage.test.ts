import { describe, expect, it } from "vitest";
import { ANSWERS } from "../data/answers";
import { pickStage, STAGE_TIERS } from "./stage";

describe("pickStage", () => {
  it("picks ten distinct words from the matching tiers", () => {
    const { words } = pickStage([]);
    expect(words).toHaveLength(10);
    expect(new Set(words).size).toBe(10);
    words.forEach((word, i) => {
      expect(ANSWERS[STAGE_TIERS[i]]).toContain(word);
    });
  });

  it("skips words that have already been served", () => {
    const served = ANSWERS.easy.slice(1);
    const { words } = pickStage(served, () => 0);
    expect(words[0]).toBe(ANSWERS.easy[0]);
  });

  it("starts a new cycle for an exhausted tier only", () => {
    const served = [...ANSWERS.brutal, ...ANSWERS.hard.slice(0, 5)];
    const result = pickStage(served);

    expect(ANSWERS.brutal).toContain(result.words[9]);
    // Brutal history is cleared; hard history is untouched.
    expect(result.served.some((w) => ANSWERS.brutal.includes(w))).toBe(false);
    expect(result.served).toEqual(ANSWERS.hard.slice(0, 5));
    expect(ANSWERS.hard.slice(0, 5)).not.toContain(result.words[4]);
  });

  it("never serves more history than there are answers", () => {
    const everything = Object.values(ANSWERS).flat();
    const { words, served } = pickStage(everything);
    expect(new Set(words).size).toBe(10);
    expect(served).toEqual([]);
  });
});
