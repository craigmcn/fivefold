import type { WordResult } from "./scoring";

const STORAGE_KEY = "fivefold";
const VERSION = 1;

export interface Stats {
  wordsPlayed: number;
  wordsGivenUp: number;
  stagesCompleted: number;
  cleanStages: number;
  totalPoints: number;
  bestStageScore: number;
  // Solved-word counts keyed by number of guesses taken (1, 2, …, n).
  guessHistogram: Record<number, number>;
}

export interface StageProgress {
  number: number;
  words: string[];
  // Index of the word being played; it stays put after the word is finished
  // (so its board remains visible) until the player moves on.
  cursor: number;
  results: WordResult[];
  // Submitted guesses for the word currently being played.
  guesses: string[];
}

export interface SavedState {
  version: typeof VERSION;
  stats: Stats;
  served: string[];
  stage: StageProgress | null;
}

export const emptyStats = (): Stats => ({
  wordsPlayed: 0,
  wordsGivenUp: 0,
  stagesCompleted: 0,
  cleanStages: 0,
  totalPoints: 0,
  bestStageScore: 0,
  guessHistogram: {},
});

export const emptyState = (): SavedState => ({
  version: VERSION,
  stats: emptyStats(),
  served: [],
  stage: null,
});

// localStorage can throw (private mode, blocked storage) or hold data from a
// future schema; either way, start fresh rather than crash the game.
export function loadState(): SavedState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as Partial<SavedState>;
    if (parsed.version !== VERSION) return emptyState();
    return {
      ...emptyState(),
      ...parsed,
      stats: { ...emptyStats(), ...parsed.stats },
    };
  } catch {
    return emptyState();
  }
}

export function saveState(state: SavedState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Progress just won't persist; the game itself still works.
  }
}

export function recordWord(stats: Stats, result: WordResult): Stats {
  const histogram = { ...stats.guessHistogram };
  if (!result.gaveUp) {
    histogram[result.guesses] = (histogram[result.guesses] ?? 0) + 1;
  }
  return {
    ...stats,
    wordsPlayed: stats.wordsPlayed + 1,
    wordsGivenUp: stats.wordsGivenUp + (result.gaveUp ? 1 : 0),
    totalPoints: stats.totalPoints + result.points,
    guessHistogram: histogram,
  };
}

export function recordStage(
  stats: Stats,
  score: number,
  clean: boolean,
  bonus: number,
): Stats {
  return {
    ...stats,
    stagesCompleted: stats.stagesCompleted + 1,
    cleanStages: stats.cleanStages + (clean ? 1 : 0),
    totalPoints: stats.totalPoints + bonus,
    bestStageScore: Math.max(stats.bestStageScore, score),
  };
}
