import { GUESSES } from "../data/guesses";
import { newlyEarned } from "./achievements";
import { nextEliminations, nextReveal } from "./hints";
import {
  CLEAN_STAGE_BONUS,
  HINT_STEPS,
  isCleanStage,
  pointsFor,
  STAGE_LENGTH,
  stageScore,
  type WordResult,
} from "./scoring";
import type { PickedStage } from "./stage";
import {
  recordDailyStreak,
  recordStage,
  recordWord,
  type Mode,
  type SavedState,
  type StageProgress,
} from "./storage";

export interface GameState {
  saved: SavedState;
  input: string;
  message: string | null;
  // Bumped on each rejected guess so the UI can replay the shake animation.
  rejections: number;
  // Achievements earned but not yet shown; the toast dismisses them.
  unlocked: string[];
}

export type GameAction =
  | { type: "letter"; letter: string }
  | { type: "backspace" }
  | { type: "submit" }
  | { type: "giveUp" }
  | { type: "nextWord" }
  | { type: "revealLetter" }
  | { type: "eliminateLetters" }
  | { type: "dismissUnlocked" }
  | { type: "newStage"; words: string[]; served: string[] }
  | { type: "setMode"; mode: Mode }
  | { type: "startDaily"; day: number; words: string[] };

export const isWordDone = (stage: StageProgress): boolean =>
  stage.results.length > stage.cursor;

export const isStageDone = (stage: StageProgress): boolean =>
  stage.results.length === STAGE_LENGTH;

export function newStage(
  saved: SavedState,
  { words, served }: PickedStage,
): SavedState {
  // A shared stage can replace an unfinished one; it takes over that number
  // rather than leaving a gap.
  const number =
    saved.stage && !isStageDone(saved.stage)
      ? saved.stage.number
      : (saved.stage?.number ?? saved.stats.stagesCompleted) + 1;
  return {
    ...saved,
    served,
    stage: freshStage(number, words),
  };
}

export const activeStage = (saved: SavedState): StageProgress | null =>
  saved.mode === "daily" ? saved.daily.stage : saved.stage;

function withActiveStage(saved: SavedState, stage: StageProgress): SavedState {
  return saved.mode === "daily"
    ? { ...saved, daily: { ...saved.daily, stage } }
    : { ...saved, stage };
}

const freshStage = (number: number, words: string[]): StageProgress => ({
  number,
  words,
  cursor: 0,
  results: [],
  guesses: [],
  revealed: [],
  eliminated: [],
  eliminations: 0,
  hintsFor: 0,
});

export const hintCount = (stage: StageProgress): number =>
  stage.revealed.length + stage.eliminations;

// Points-table steps the current word's hints have spent.
export const hintSteps = (stage: StageProgress): number =>
  stage.revealed.length * HINT_STEPS.reveal +
  stage.eliminations * HINT_STEPS.eliminate;

function reject(state: GameState, message: string): GameState {
  return { ...state, message, rejections: state.rejections + 1 };
}

function finishWord(state: GameState, stage: StageProgress, gaveUp: boolean) {
  const result: WordResult = {
    answer: stage.words[stage.cursor],
    guesses: stage.guesses.length,
    points: gaveUp
      ? 0
      : pointsFor(stage.guesses.length + hintSteps(stage), stage.cursor),
    gaveUp,
    hints: hintCount(stage),
  };
  const results = [...stage.results, result];
  const daily = state.saved.mode === "daily";
  // Endless and daily keep separate stats; both feed served, since a word seen
  // in either mode is one endless play should avoid repeating.
  let stats = recordWord(
    daily ? state.saved.daily.stats : state.saved.stats,
    result,
  );
  const stageDone = results.length === STAGE_LENGTH;
  if (stageDone) {
    const clean = isCleanStage(results);
    const bonus = clean ? CLEAN_STAGE_BONUS : 0;
    stats = recordStage(stats, stageScore(results), clean, bonus);
  }
  let saved: SavedState = {
    ...state.saved,
    served: state.saved.served.includes(result.answer)
      ? state.saved.served
      : [...state.saved.served, result.answer],
  };
  if (daily) {
    const next = { ...saved.daily, stats };
    saved = {
      ...saved,
      daily: stageDone ? recordDailyStreak(next, stage.number) : next,
    };
  } else {
    saved = { ...saved, stats };
  }
  saved = withActiveStage(saved, { ...stage, results });
  const earned = newlyEarned({
    saved,
    result,
    index: stage.cursor,
    stage: stageDone ? results : null,
  });
  if (earned.length > 0) {
    saved = { ...saved, achievements: [...saved.achievements, ...earned] };
  }
  return {
    ...state,
    input: "",
    message: null,
    // Same array when nothing new was earned, so the toast's timer (keyed on
    // the badge count) isn't restarted by every finished word.
    unlocked:
      earned.length > 0 ? [...state.unlocked, ...earned] : state.unlocked,
    saved,
  };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  const cleared = { ...state, input: "", message: null };

  switch (action.type) {
    case "newStage":
      return {
        ...cleared,
        saved: { ...newStage(state.saved, action), mode: "endless" },
      };
    case "dismissUnlocked":
      return state.unlocked.length === 0 ? state : { ...state, unlocked: [] };
    case "setMode":
      if (state.saved.mode === action.mode) return state;
      return { ...cleared, saved: { ...state.saved, mode: action.mode } };
    case "startDaily":
      // Re-starting the same day would wipe a finished attempt.
      if (state.saved.daily.stage?.number === action.day) {
        return gameReducer(state, { type: "setMode", mode: "daily" });
      }
      return {
        ...cleared,
        saved: {
          ...state.saved,
          mode: "daily",
          daily: {
            ...state.saved.daily,
            stage: freshStage(action.day, action.words),
          },
        },
      };
  }

  const stage = activeStage(state.saved);
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
      return { ...cleared, saved: withActiveStage(state.saved, next) };
    }

    case "revealLetter": {
      if (done) return state;
      const answer = stage.words[stage.cursor];
      const index = nextReveal(answer, stage.guesses, stage.revealed);
      if (index === null) return state;
      return {
        ...state,
        message: `Letter ${index + 1} is ${answer[index].toUpperCase()}`,
        saved: withActiveStage(state.saved, {
          ...stage,
          revealed: [...stage.revealed, index],
        }),
      };
    }

    case "eliminateLetters": {
      if (done) return state;
      const answer = stage.words[stage.cursor];
      const letters = nextEliminations(answer, stage.guesses, stage.eliminated);
      if (letters.length === 0) return state;
      return {
        ...state,
        message: `Not in the word: ${letters.join(", ").toUpperCase()}`,
        saved: withActiveStage(state.saved, {
          ...stage,
          eliminated: [...stage.eliminated, ...letters],
          eliminations: stage.eliminations + 1,
        }),
      };
    }

    case "giveUp":
      return done ? state : finishWord(state, stage, true);

    case "nextWord":
      if (!done || isStageDone(stage)) return state;
      return {
        ...state,
        saved: withActiveStage(state.saved, {
          ...stage,
          cursor: stage.cursor + 1,
          guesses: [],
          revealed: [],
          eliminated: [],
          eliminations: 0,
          hintsFor: stage.cursor + 1,
        }),
      };
  }
}
