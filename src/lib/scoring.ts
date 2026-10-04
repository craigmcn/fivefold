export const STAGE_LENGTH = 10;
export const POINTS_BY_GUESS: readonly number[] = [60, 50, 40, 30, 20, 10];
export const SCORED_GUESSES = POINTS_BY_GUESS.length;
export const CLEAN_STAGE_BONUS = 100;
// Hints score like extra guesses (without using a board row), so they slot
// into the points table and are free once guesses stop scoring.
export const HINT_STEPS = { reveal: 2, eliminate: 1 } as const;

// The two "boss" words (5th and 10th) are worth more to reward the jump in
// difficulty; indices are 0-based positions within the stage.
export const BOSS_MULTIPLIERS: Readonly<Record<number, number>> = {
  4: 2,
  9: 3,
};

export const multiplierFor = (wordIndex: number): number =>
  BOSS_MULTIPLIERS[wordIndex] ?? 1;

// Hard mode is locked per stage when it starts, and scales every word's
// points and the clean bonus.
export const HARD_MULTIPLIER = 1.5;

const hardScale = (points: number, hard: boolean) =>
  Math.round(points * (hard ? HARD_MULTIPLIER : 1));

// Points for solving on the given (1-based) guess; anything past the sixth
// guess still clears the word but scores nothing.
export function pointsFor(
  guessNumber: number,
  wordIndex: number,
  hard: boolean,
): number {
  const base = POINTS_BY_GUESS[guessNumber - 1] ?? 0;
  return hardScale(base * multiplierFor(wordIndex), hard);
}

export const cleanBonus = (hard: boolean): number =>
  hardScale(CLEAN_STAGE_BONUS, hard);

export interface WordResult {
  answer: string;
  guesses: number;
  points: number;
  gaveUp: boolean;
  hints: number;
}

// A stage is "clean" when every word was solved within the scored guesses,
// unaided.
export const isCleanStage = (results: readonly WordResult[]): boolean =>
  results.length === STAGE_LENGTH &&
  results.every(
    (r) => !r.gaveUp && r.guesses <= SCORED_GUESSES && r.hints === 0,
  );

export function stageScore(
  results: readonly WordResult[],
  hard: boolean,
): number {
  const base = results.reduce((sum, r) => sum + r.points, 0);
  return base + (isCleanStage(results) ? cleanBonus(hard) : 0);
}
