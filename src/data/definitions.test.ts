import { describe, expect, it } from "vitest";
import { ANSWERS } from "./answers";
import { DEFINITIONS } from "./definitions";

// Guards regenerated data: a new answer without a definition, or a broken
// source entry (raw WordNet data lines, Wiktionary templates), fails here.
describe("DEFINITIONS", () => {
  const answers = Object.values(ANSWERS).flat();

  it("defines every answer", () => {
    const missing = answers.filter((w) => !DEFINITIONS[w]);
    expect(missing).toEqual([]);
  });

  it("keeps every definition short, tidy and free of source markup", () => {
    for (const [word, definition] of Object.entries(DEFINITIONS)) {
      expect(definition, word).toMatch(/^[A-Z"]/);
      expect(definition.length, word).toBeLessThanOrEqual(141);
      expect(definition, word).not.toMatch(/\{\{|<|mw-parser|\.$/);
    }
  });
});
