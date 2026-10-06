import { describeGuess } from "../components/Board";
import type { WordResult } from "./scoring";

interface AnnounceInput {
  message: string | null;
  result: WordResult | undefined;
  lastGuess: string | undefined;
  answer: string;
}

// What the polite live region says: a rejection or hint message first, then
// the finished word, else the colours of the latest guess.
export function announcement({
  message,
  result,
  lastGuess,
  answer,
}: AnnounceInput): string {
  if (message) return message;
  if (result) {
    return result.gaveUp
      ? `The word was ${result.answer}`
      : `Solved: ${result.answer}, ${result.points} points`;
  }
  return lastGuess ? describeGuess(lastGuess, answer) : "";
}
