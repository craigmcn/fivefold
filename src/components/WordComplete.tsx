import { SCORED_GUESSES, type WordResult } from "../lib/scoring";

interface WordCompleteProps {
  result: WordResult;
  onNext: () => void;
  nextLabel: string;
}

function headline({ answer, guesses, points, gaveUp }: WordResult): string {
  const word = answer.toUpperCase();
  if (gaveUp) return `The word was ${word}`;
  if (guesses === 1) return `${word} in one! +${points} points`;
  if (guesses > SCORED_GUESSES) {
    return `${word} in ${guesses}. No points, but you got there!`;
  }
  return `${word} in ${guesses}. +${points} points`;
}

export function WordComplete({ result, onNext, nextLabel }: WordCompleteProps) {
  return (
    <div className="word-complete">
      <p>{headline(result)}</p>
      {/* eslint-disable-next-line jsx-a11y/no-autofocus -- the only sensible next action; saves a click every word */}
      <button type="button" className="primary" onClick={onNext} autoFocus>
        {nextLabel}
      </button>
    </div>
  );
}
