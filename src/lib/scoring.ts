export const STAGE_LENGTH = 10;
export const SCORED_GUESSES = 6;

const POINTS_BY_GUESS = [60, 50, 40, 30, 20, 10];
export const CLEAN_STAGE_BONUS = 100;

// The two "boss" words (5th and 10th) are worth more to reward the jump in
// difficulty; indices are 0-based positions within the stage.
export const BOSS_MULTIPLIERS: Readonly<Record<number, number>> = {
  4: 2,
  9: 3,
};

export const multiplierFor = (wordIndex: number): number =>
  BOSS_MULTIPLIERS[wordIndex] ?? 1;

// Points for solving on the given (1-based) guess; anything past the sixth
// guess still clears the word but scores nothing.
export function pointsFor(guessNumber: number, wordIndex: number): number {
  const base = POINTS_BY_GUESS[guessNumber - 1] ?? 0;
  return base * multiplierFor(wordIndex);
}

export interface WordResult {
  answer: string;
  guesses: number;
  points: number;
  gaveUp: boolean;
}

// A stage is "clean" when every word was solved within the scored guesses.
export const isCleanStage = (results: readonly WordResult[]): boolean =>
  results.length === STAGE_LENGTH &&
  results.every((r) => !r.gaveUp && r.guesses <= SCORED_GUESSES);

export function stageScore(results: readonly WordResult[]): number {
  const base = results.reduce((sum, r) => sum + r.points, 0);
  return base + (isCleanStage(results) ? CLEAN_STAGE_BONUS : 0);
}
