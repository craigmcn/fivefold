import { describe, expect, it } from "vitest";
import {
  gameReducer,
  isStageDone,
  isWordDone,
  type GameAction,
  type GameState,
} from "./game";
import { emptyState } from "./storage";

const WORDS = [
  "stand",
  "party",
  "crane",
  "flock",
  "shock",
  "early",
  "adorn",
  "guild",
  "taper",
  "dross",
];

const start = (): GameState =>
  gameReducer(
    { saved: emptyState(), input: "", message: null, rejections: 0 },
    { type: "newStage", words: WORDS, served: [] },
  );

const typeWord = (state: GameState, word: string): GameState =>
  [...word, "\n"].reduce<GameState>(
    (s, c) =>
      gameReducer(
        s,
        c === "\n"
          ? { type: "submit" }
          : ({ type: "letter", letter: c } as GameAction),
      ),
    state,
  );

describe("gameReducer", () => {
  it("starts stage 1 on the first word", () => {
    const { stage } = start().saved;
    expect(stage).toMatchObject({ number: 1, cursor: 0, guesses: [] });
  });

  it("rejects short guesses and unknown words without using a guess", () => {
    let state = typeWord(start(), "sta");
    expect(state.message).toBe("Not enough letters");
    state = gameReducer(
      gameReducer(gameReducer(state, { type: "backspace" }), {
        type: "backspace",
      }),
      { type: "backspace" },
    );
    state = typeWord(state, "zzzzz");
    expect(state.message).toBe("Not in word list");
    expect(state.rejections).toBe(2);
    expect(state.saved.stage?.guesses).toEqual([]);
  });

  it("caps input at five letters", () => {
    const state = [..."standing"].reduce(
      (s, letter) => gameReducer(s, { type: "letter", letter }),
      start(),
    );
    expect(state.input).toBe("stand");
  });

  it("scores a solved word and records stats", () => {
    let state = typeWord(start(), "crane");
    state = typeWord(state, "stand");
    const stage = state.saved.stage!;
    expect(isWordDone(stage)).toBe(true);
    expect(stage.results[0]).toEqual({
      answer: "stand",
      guesses: 2,
      points: 50,
      gaveUp: false,
    });
    expect(state.saved.stats).toMatchObject({
      wordsPlayed: 1,
      totalPoints: 50,
      guessHistogram: { 2: 1 },
    });
    expect(state.saved.served).toEqual(["stand"]);
  });

  it("ignores typing once the word is done, until moving on", () => {
    let state = typeWord(start(), "stand");
    state = gameReducer(state, { type: "letter", letter: "a" });
    expect(state.input).toBe("");
    state = gameReducer(state, { type: "nextWord" });
    expect(state.saved.stage).toMatchObject({ cursor: 1, guesses: [] });
  });

  it("doesn't duplicate an answer that was already served", () => {
    let state = start();
    state = { ...state, saved: { ...state.saved, served: ["stand"] } };
    state = typeWord(state, "stand");
    expect(state.saved.served).toEqual(["stand"]);
  });

  it("gives up for zero points", () => {
    let state = typeWord(start(), "crane");
    state = gameReducer(state, { type: "giveUp" });
    expect(state.saved.stage?.results[0]).toMatchObject({
      gaveUp: true,
      points: 0,
    });
    expect(state.saved.stats.wordsGivenUp).toBe(1);
  });

  it("completes a stage with the clean bonus", () => {
    let state = start();
    WORDS.forEach((word, i) => {
      state = typeWord(state, word);
      if (i < WORDS.length - 1)
        state = gameReducer(state, { type: "nextWord" });
    });
    const stage = state.saved.stage!;
    expect(isStageDone(stage)).toBe(true);
    // 8 regular words × 60, boss ×2 and ×3, plus the 100-point bonus.
    expect(state.saved.stats).toMatchObject({
      stagesCompleted: 1,
      cleanStages: 1,
      totalPoints: 8 * 60 + 120 + 180 + 100,
      bestStageScore: 8 * 60 + 120 + 180 + 100,
    });

    state = gameReducer(state, { type: "newStage", words: WORDS, served: [] });
    expect(state.saved.stage).toMatchObject({ number: 2, cursor: 0 });
  });

  it("keeps the number when a new stage replaces an unfinished one", () => {
    let state = typeWord(start(), "stand");
    state = gameReducer(state, { type: "newStage", words: WORDS, served: [] });
    expect(state.saved.stage).toMatchObject({
      number: 1,
      cursor: 0,
      results: [],
    });
  });
});
