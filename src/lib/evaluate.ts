import type { LetterStatus } from "../types";

// Two passes so duplicate letters are scored like Wordle: exact matches claim
// their answer letters first, then "present" is only awarded while unclaimed
// copies of that letter remain (guess "speed" vs answer "abide" → one present e).
export function evaluateGuess(guess: string, answer: string): LetterStatus[] {
  const result: LetterStatus[] = Array(5).fill("absent");
  const remaining = new Map<string, number>();

  for (let i = 0; i < 5; i++) {
    if (guess[i] === answer[i]) {
      result[i] = "correct";
    } else {
      remaining.set(answer[i], (remaining.get(answer[i]) ?? 0) + 1);
    }
  }

  for (let i = 0; i < 5; i++) {
    const count = remaining.get(guess[i]) ?? 0;
    if (result[i] !== "correct" && count > 0) {
      result[i] = "present";
      remaining.set(guess[i], count - 1);
    }
  }

  return result;
}

const RANK: Record<LetterStatus, number> = {
  absent: 0,
  present: 1,
  correct: 2,
};

// Best status seen for each letter across all guesses, for keyboard colouring.
export function keyboardStatuses(
  guesses: readonly string[],
  answer: string,
): Map<string, LetterStatus> {
  const statuses = new Map<string, LetterStatus>();
  for (const guess of guesses) {
    evaluateGuess(guess, answer).forEach((status, i) => {
      const current = statuses.get(guess[i]);
      if (!current || RANK[status] > RANK[current]) {
        statuses.set(guess[i], status);
      }
    });
  }
  return statuses;
}
