import { ANSWERS } from "../data/answers";
import type { LetterStatus } from "../types";
import { evaluateGuess } from "./evaluate";

export const ELIMINATE_COUNT = 3;

// Commonest letters across all answers first: ruling those out narrows the
// field fastest, and a fixed order keeps the reducer deterministic.
const BY_FREQUENCY: readonly string[] = (() => {
  const counts = new Map<string, number>();
  for (const word of Object.values(ANSWERS).flat()) {
    for (const letter of word)
      counts.set(letter, (counts.get(letter) ?? 0) + 1);
  }
  return "abcdefghijklmnopqrstuvwxyz"
    .split("")
    .sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0));
})();

function knownPositions(
  answer: string,
  guesses: readonly string[],
  revealed: readonly number[],
): Set<number> {
  const known = new Set(revealed);
  for (const guess of guesses) {
    evaluateGuess(guess, answer).forEach((status, i) => {
      if (status === "correct") known.add(i);
    });
  }
  return known;
}

// Leftmost position not yet known. Never the last unknown one, which would
// hand over the whole word; revealing the word is a separate, explicit choice.
export function nextReveal(
  answer: string,
  guesses: readonly string[],
  revealed: readonly number[],
): number | null {
  const known = knownPositions(answer, guesses, revealed);
  if (answer.length - known.size <= 1) return null;
  for (let i = 0; i < answer.length; i++) if (!known.has(i)) return i;
  return null;
}

// Up to three absent letters the player hasn't already guessed or removed.
export function nextEliminations(
  answer: string,
  guesses: readonly string[],
  eliminated: readonly string[],
): string[] {
  const seen = new Set([...guesses.join(""), ...eliminated]);
  return BY_FREQUENCY.filter(
    (letter) => !answer.includes(letter) && !seen.has(letter),
  ).slice(0, ELIMINATE_COUNT);
}

// Hinted knowledge on the keyboard: revealed letters are correct, removed ones
// absent. Never downgrades a status the player's own guesses established.
export function withHints(
  statuses: ReadonlyMap<string, LetterStatus>,
  answer: string,
  revealed: readonly number[],
  eliminated: readonly string[],
): Map<string, LetterStatus> {
  const merged = new Map(statuses);
  for (const i of revealed) merged.set(answer[i], "correct");
  for (const letter of eliminated) {
    if (!merged.has(letter)) merged.set(letter, "absent");
  }
  return merged;
}
