import { evaluateGuess } from "./evaluate";

const ORDINALS = ["1st", "2nd", "3rd", "4th", "5th"];

// Wordle's hard mode plus revealed-letter hints: greens (and revealed letters)
// stay put, and every yellow or green letter is used at least as many times
// as one earlier guess showed it. Greys aren't enforced, as in Wordle.
export function hardModeViolation(
  guess: string,
  guesses: readonly string[],
  answer: string,
  revealed: readonly number[],
): string | null {
  const fixed = new Map<number, string>();
  const needed = new Map<string, number>();
  for (const i of revealed) fixed.set(i, answer[i]);
  for (const earlier of guesses) {
    const counts = new Map<string, number>();
    evaluateGuess(earlier, answer).forEach((status, i) => {
      if (status === "absent") return;
      if (status === "correct") fixed.set(i, earlier[i]);
      counts.set(earlier[i], (counts.get(earlier[i]) ?? 0) + 1);
    });
    for (const [letter, n] of counts) {
      needed.set(letter, Math.max(needed.get(letter) ?? 0, n));
    }
  }
  // Revealed letters count toward "must contain" too.
  for (const [, letter] of fixed) {
    needed.set(letter, Math.max(needed.get(letter) ?? 0, 1));
  }

  for (const [i, letter] of [...fixed].sort(([a], [b]) => a - b)) {
    if (guess[i] !== letter) {
      return `${ORDINALS[i]} letter must be ${letter.toUpperCase()}`;
    }
  }
  for (const [letter, n] of needed) {
    const have = [...guess].filter((l) => l === letter).length;
    if (have < n) {
      return n > 1
        ? `Guess must contain ${n} ${letter.toUpperCase()}s`
        : `Guess must contain ${letter.toUpperCase()}`;
    }
  }
  return null;
}
