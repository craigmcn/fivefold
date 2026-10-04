import { describe, expect, it } from "vitest";
import { STAGE_WORDS } from "../test/fixtures";
import type { WordResult } from "./scoring";
import { shareText } from "./shareText";

const solved = (answer: string, guesses: number, points: number) => ({
  answer,
  guesses,
  points,
  gaveUp: false,
});

describe("shareText", () => {
  it("draws a row per word with points and boss multipliers", () => {
    const results: WordResult[] = STAGE_WORDS.map((w) => solved(w, 1, 60));
    results[1] = solved(STAGE_WORDS[1], 3, 40);
    results[4] = solved(STAGE_WORDS[4], 2, 100);
    results[9] = solved(STAGE_WORDS[9], 9, 0);
    results[6] = { ...solved(STAGE_WORDS[6], 8, 0), gaveUp: true };

    const lines = shareText("Daily #3", results, "https://x.test/").split("\n");
    expect(lines[0]).toBe("Fivefold Daily #3 · 500 pts");
    expect(lines[1]).toBe("🟦 60");
    expect(lines[2]).toBe("⬛⬛🟦 40");
    expect(lines[5]).toBe("⬛🟦 100 ×2");
    expect(lines[7]).toBe("⬛⬛⬛⬛⬛⬛❌ 0");
    expect(lines[10]).toBe("⬛⬛⬛⬛⬛⬛🟧 0 ×3");
    expect(lines.at(-1)).toBe("https://x.test/");
    expect(lines).toHaveLength(12);
  });

  it("adds the clean-stage bonus line when earned", () => {
    const results = STAGE_WORDS.map((w) => solved(w, 1, 60));
    const text = shareText("stage 4", results, "https://x.test/");
    expect(text).toContain("✨ Clean stage +100");
    expect(text.split("\n")[0]).toBe("Fivefold stage 4 · 700 pts");
  });

  it("never contains the answers", () => {
    const results = STAGE_WORDS.map((w) => solved(w, 2, 50));
    const text = shareText(
      "Daily #3",
      results,
      "https://x.test/",
    ).toLowerCase();
    for (const word of STAGE_WORDS) expect(text).not.toContain(word);
  });
});
