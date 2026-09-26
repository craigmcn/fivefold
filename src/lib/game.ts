import { GUESSES } from "../data/guesses";
import {
  CLEAN_STAGE_BONUS,
  isCleanStage,
  pointsFor,
  STAGE_LENGTH,
  stageScore,
  type WordResult,
} from "./scoring";
import {
  recordStage,
  recordWord,
  type SavedState,
  type StageProgress,
} from "./storage";

export interface GameState {
  saved: SavedState;
  input: string;
  message: string | null;
  // Bumped on each rejected guess so the UI can replay the shake animation.
  rejections: number;
}

export type GameAction =
  | { type: "letter"; letter: string }
  | { type: "backspace" }
  | { type: "submit" }
  | { type: "giveUp" }
  | { type: "nextWord" }
  | { type: "newStage"; words: string[] };

export const isWordDone = (stage: StageProgress): boolean =>
  stage.results.length > stage.cursor;

export const isStageDone = (stage: StageProgress): boolean =>
  stage.results.length === STAGE_LENGTH;

export function newStage(saved: SavedState, words: string[]): SavedState {
  const number = (saved.stage?.number ?? saved.stats.stagesCompleted) + 1;
  return {
    ...saved,
    stage: { number, words, cursor: 0, results: [], guesses: [] },
  };
}

function reject(state: GameState, message: string): GameState {
  return { ...state, message, rejections: state.rejections + 1 };
}

function finishWord(state: GameState, stage: StageProgress, gaveUp: boolean) {
  const result: WordResult = {
    answer: stage.words[stage.cursor],
    guesses: stage.guesses.length,
    points: gaveUp ? 0 : pointsFor(stage.guesses.length, stage.cursor),
    gaveUp,
  };
  const results = [...stage.results, result];
  let stats = recordWord(state.saved.stats, result);
  if (results.length === STAGE_LENGTH) {
    const clean = isCleanStage(results);
    const bonus = clean ? CLEAN_STAGE_BONUS : 0;
    stats = recordStage(stats, stageScore(results), clean, bonus);
  }
  return {
    ...state,
    input: "",
    message: null,
    saved: {
      ...state.saved,
      stats,
      served: [...state.saved.served, result.answer],
      stage: { ...stage, results },
    },
  };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  const stage = state.saved.stage;

  if (action.type === "newStage") {
    return {
      ...state,
      input: "",
      message: null,
      saved: newStage(state.saved, action.words),
    };
  }
  if (!stage) return state;

  const done = isWordDone(stage);

  switch (action.type) {
    case "letter":
      if (done || state.input.length >= 5) return state;
      return { ...state, input: state.input + action.letter, message: null };

    case "backspace":
      if (done) return state;
      return { ...state, input: state.input.slice(0, -1), message: null };

    case "submit": {
      if (done) return state;
      if (state.input.length < 5) return reject(state, "Not enough letters");
      if (!GUESSES.has(state.input)) return reject(state, "Not in word list");
      const guesses = [...stage.guesses, state.input];
      const next = { ...stage, guesses };
      if (state.input === stage.words[stage.cursor]) {
        return finishWord(state, next, false);
      }
      return {
        ...state,
        input: "",
        message: null,
        saved: { ...state.saved, stage: next },
      };
    }

    case "giveUp":
      return done ? state : finishWord(state, stage, true);

    case "nextWord":
      if (!done || isStageDone(stage)) return state;
      return {
        ...state,
        saved: {
          ...state.saved,
          stage: { ...stage, cursor: stage.cursor + 1, guesses: [] },
        },
      };
  }
}
