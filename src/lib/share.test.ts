import { afterEach, describe, expect, it, vi } from "vitest";
import { ANSWERS } from "../data/answers";
import { STAGE_WORDS } from "../test/fixtures";
import {
  clearSharedLink,
  decodeStage,
  encodeStage,
  readSharedLink,
  stageLink,
} from "./share";
import { pickStage } from "./stage";

describe("stage codes", () => {
  it("round-trips a stage's words in order", () => {
    const code = encodeStage(STAGE_WORDS);
    expect(code).toMatch(/^[0-9a-z]+$/);
    expect(decodeStage(code)).toEqual(STAGE_WORDS);
  });

  it("round-trips random stages, including the list's first and last words", () => {
    for (let i = 0; i < 20; i++) {
      const { words } = pickStage([]);
      expect(decodeStage(encodeStage(words))).toEqual(words);
    }
    const all = Object.values(ANSWERS).flat().sort();
    const edges = [...all.slice(0, 5), ...all.slice(-5)];
    expect(decodeStage(encodeStage(edges))).toEqual(edges);
  });

  it("ignores case and surrounding whitespace", () => {
    const code = encodeStage(STAGE_WORDS);
    expect(decodeStage(` ${code.toUpperCase()} `)).toEqual(STAGE_WORDS);
  });

  it("rejects malformed or tampered codes", () => {
    const code = encodeStage(STAGE_WORDS);
    expect(decodeStage("")).toBeNull();
    expect(decodeStage("not a code!")).toBeNull();
    // Wrong checksum, as from a different answer list.
    expect(decodeStage(`zz${code.slice(2)}`)).toBeNull();
    // Too many digits overflows ten words.
    expect(decodeStage(`${code}zzzz`)).toBeNull();
    // Too few digits decodes the tail words as the same (first) answer.
    expect(decodeStage(code.slice(0, 6))).toBeNull();
    expect(decodeStage(code + "0".repeat(100_000))).toBeNull();
  });

  it("refuses words that aren't answers", () => {
    expect(() => encodeStage(["qzxvj", ...STAGE_WORDS.slice(1)])).toThrow();
  });
});

describe("shared links", () => {
  afterEach(() => {
    window.history.replaceState(null, "", "/");
    vi.unstubAllEnvs();
  });

  it("builds a link that reads back to the same words", () => {
    const link = new URL(stageLink(STAGE_WORDS));
    window.history.replaceState(null, "", link.pathname + link.search);
    expect(readSharedLink()).toEqual({ words: STAGE_WORDS });
  });

  it("links to the page the game is served from, minus its query", () => {
    // Production's relative base; Vitest itself serves from "/".
    vi.stubEnv("BASE_URL", "./");
    window.history.replaceState(null, "", "/fivefold/?x=1#top");
    const link = new URL(stageLink(STAGE_WORDS));
    expect(link.pathname).toBe("/fivefold/");
    expect([...link.searchParams.keys()]).toEqual(["stage"]);
    expect(link.hash).toBe("");
  });

  it("flags an unreadable code and returns null with no code", () => {
    window.history.replaceState(null, "", "/?stage=nope");
    expect(readSharedLink()).toEqual({ invalid: true });
    window.history.replaceState(null, "", "/");
    expect(readSharedLink()).toBeNull();
  });

  it("strips only the stage param from the address", () => {
    window.history.replaceState(null, "", "/?stage=abc&x=1#top");
    clearSharedLink();
    expect(window.location.search).toBe("?x=1");
    expect(window.location.hash).toBe("#top");
  });
});
