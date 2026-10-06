import { SCORED_GUESSES, type WordResult } from "./scoring";
import type { DailyState, Stats } from "./storage";

// The rules for updating stats and streaks as words, stages and days finish;
// storage.ts only owns the saved shape and its validation.
export function recordWord(stats: Stats, result: WordResult): Stats {
  const histogram = { ...stats.guessHistogram };
  if (!result.gaveUp) {
    histogram[result.guesses] = (histogram[result.guesses] ?? 0) + 1;
  }
  const wordStreak =
    !result.gaveUp && result.guesses <= SCORED_GUESSES
      ? stats.wordStreak + 1
      : 0;
  return {
    ...stats,
    wordStreak,
    maxWordStreak: Math.max(stats.maxWordStreak, wordStreak),
    wordsPlayed: stats.wordsPlayed + 1,
    wordsGivenUp: stats.wordsGivenUp + (result.gaveUp ? 1 : 0),
    hintsUsed: stats.hintsUsed + result.hints,
    totalPoints: stats.totalPoints + result.points,
    guessHistogram: histogram,
  };
}

// Streaks run on day numbers: completing the day after the last one extends
// it, any gap restarts it, and replaying a completed day changes nothing.
export function recordDailyStreak(daily: DailyState, day: number): DailyState {
  if (daily.lastCompleted !== null && day <= daily.lastCompleted) return daily;
  const streak = daily.lastCompleted === day - 1 ? daily.streak + 1 : 1;
  return {
    ...daily,
    streak,
    maxStreak: Math.max(daily.maxStreak, streak),
    lastCompleted: day,
  };
}

// The stored streak only goes stale lazily, so missing yesterday reads as 0.
export const currentStreak = (daily: DailyState, today: number): number =>
  daily.lastCompleted !== null && daily.lastCompleted >= today - 1
    ? daily.streak
    : 0;

export function recordStage(
  stats: Stats,
  score: number,
  clean: boolean,
  bonus: number,
): Stats {
  const cleanStreak = clean ? stats.cleanStreak + 1 : 0;
  return {
    ...stats,
    cleanStreak,
    maxCleanStreak: Math.max(stats.maxCleanStreak, cleanStreak),
    stagesCompleted: stats.stagesCompleted + 1,
    cleanStages: stats.cleanStages + (clean ? 1 : 0),
    totalPoints: stats.totalPoints + bonus,
    bestStageScore: Math.max(stats.bestStageScore, score),
  };
}
