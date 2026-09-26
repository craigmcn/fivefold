import { describe, expect, it } from "vitest";
import { ANSWERS } from "../data/answers";
import { pickStage, STAGE_TIERS } from "./stage";

describe("pickStage", () => {
  it("picks ten distinct words from the matching tiers", () => {
    const stage = pickStage(new Set());
    expect(stage).toHaveLength(10);
    expect(new Set(stage).size).toBe(10);
    stage.forEach((word, i) => {
      expect(ANSWERS[STAGE_TIERS[i]]).toContain(word);
    });
  });

  it("skips words that have already been served", () => {
    const served = new Set(ANSWERS.easy.slice(1));
    const stage = pickStage(served, () => 0);
    expect(stage[0]).toBe(ANSWERS.easy[0]);
  });

  it("reuses words once a tier is exhausted", () => {
    const served = new Set(Object.values(ANSWERS).flat());
    const stage = pickStage(served);
    expect(new Set(stage).size).toBe(10);
  });
});
