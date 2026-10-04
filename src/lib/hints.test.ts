import { describe, expect, it } from "vitest";
import { nextEliminations, nextReveal, withHints } from "./hints";

describe("nextReveal", () => {
  it("reveals the leftmost position that isn't already known", () => {
    expect(nextReveal("stand", [], [])).toBe(0);
    // "spare" pins s and a (positions 0 and 2).
    expect(nextReveal("stand", ["spare"], [])).toBe(1);
    expect(nextReveal("stand", ["spare"], [1])).toBe(3);
  });

  it("never gives away the last unknown letter", () => {
    expect(nextReveal("stand", [], [0, 1, 2])).toBe(3);
    expect(nextReveal("stand", [], [0, 1, 2, 3])).toBeNull();
    expect(nextReveal("stand", ["stank"], [])).toBeNull();
  });
});

describe("nextEliminations", () => {
  it("rules out three common letters that aren't in the word", () => {
    const letters = nextEliminations("stand", [], []);
    expect(letters).toHaveLength(3);
    for (const letter of letters) expect("stand").not.toContain(letter);
  });

  it("skips letters already guessed or ruled out", () => {
    const first = nextEliminations("stand", [], []);
    const second = nextEliminations("stand", ["crump"], first);
    for (const letter of second) {
      expect([...first, ..."crump"]).not.toContain(letter);
    }
  });

  it("runs out once every absent letter is known", () => {
    const absent = "bcefghijklmopqruvwxyz".split("");
    expect(nextEliminations("stand", [], absent)).toEqual([]);
    expect(nextEliminations("stand", [], absent.slice(1))).toEqual(["b"]);
  });
});

describe("withHints", () => {
  it("marks revealed letters correct and ruled-out ones absent", () => {
    const merged = withHints(new Map(), "stand", [1], ["e"]);
    expect(merged.get("t")).toBe("correct");
    expect(merged.get("e")).toBe("absent");
  });

  it("never downgrades what the player's guesses showed", () => {
    const merged = withHints(new Map([["e", "present"]]), "stand", [], ["e"]);
    expect(merged.get("e")).toBe("present");
  });
});
