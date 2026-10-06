import type { WordResult } from "../lib/scoring";
import { WordComplete } from "./WordComplete";

interface StatusLineProps {
  message: string | null;
  // The finished current word, if any.
  result: WordResult | undefined;
  guessNumber: number;
  worth: number;
  nextLabel: string;
  onNext: () => void;
  onGiveUp: () => void;
}

export function StatusLine({
  message,
  result,
  guessNumber,
  worth,
  nextLabel,
  onNext,
  onGiveUp,
}: StatusLineProps) {
  return (
    <div className="status">
      {message && (
        <p className="message" aria-hidden="true">
          {message}
        </p>
      )}
      {/* A finished word's button must survive a message: once the word
          is done nothing clears it, and the summary hides the keyboard. */}
      {result ? (
        <WordComplete result={result} onNext={onNext} nextLabel={nextLabel} />
      ) : message ? null : worth > 0 ? (
        <p className="muted">
          Guess {guessNumber} is worth {worth} points
        </p>
      ) : (
        <p className="muted">
          Free guesses: no points, no limit.{" "}
          <button type="button" className="text-button" onClick={onGiveUp}>
            Reveal the word
          </button>
        </p>
      )}
    </div>
  );
}
