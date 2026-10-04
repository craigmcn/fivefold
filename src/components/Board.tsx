import { useEffect, useRef, type CSSProperties } from "react";
import { evaluateGuess } from "../lib/evaluate";
import { SCORED_GUESSES } from "../lib/scoring";
import type { LetterStatus } from "../types";

interface BoardProps {
  answer: string;
  guesses: readonly string[];
  input: string;
  done: boolean;
  rejections: number;
  // Positions given away by the reveal-a-letter hint.
  revealed: readonly number[];
}

const STATUS_LABEL: Record<LetterStatus, string> = {
  correct: "correct",
  present: "in the word, wrong spot",
  absent: "not in the word",
};

export function describeGuess(guess: string, answer: string): string {
  return evaluateGuess(guess, answer)
    .map((status, i) => `${guess[i].toUpperCase()} ${STATUS_LABEL[status]}`)
    .join(", ");
}

function Tiles({
  letters,
  statuses,
  hints = [],
}: {
  letters: string;
  statuses?: LetterStatus[];
  // Faint placeholders for revealed letters, until the player types over them.
  hints?: readonly (string | undefined)[];
}) {
  return Array.from({ length: 5 }, (_, i) => {
    const hint = !letters[i] && hints[i];
    const kind = statuses
      ? ` tile--${statuses[i]}`
      : letters[i]
        ? " tile--filled"
        : hint
          ? " tile--hint"
          : "";
    return (
      <span
        key={i}
        className={`tile${kind}`}
        style={{ "--i": i } as CSSProperties}
        aria-hidden="true"
      >
        {letters[i] ?? (hint || "")}
      </span>
    );
  });
}

export function Board({
  answer,
  guesses,
  input,
  done,
  rejections,
  revealed,
}: BoardProps) {
  const activeRow = useRef<HTMLDivElement>(null);
  // Guesses beyond the sixth grow the board downward, so keep the row being
  // typed in view.
  useEffect(() => {
    activeRow.current?.scrollIntoView?.({ block: "nearest" });
  }, [guesses.length, done]);

  const rowsShown = guesses.length + (done ? 0 : 1);
  const hints = Array.from({ length: 5 }, (_, i) =>
    revealed.includes(i) ? answer[i] : undefined,
  );
  const hintLabel = [...revealed]
    .sort((a, b) => a - b)
    .map((i) => `letter ${i + 1} is ${answer[i].toUpperCase()}`)
    .join(", ");
  const fillers = Math.max(0, SCORED_GUESSES - rowsShown);

  return (
    <div className="board" aria-label="Guesses" role="group">
      {guesses.map((guess, i) => (
        <div
          key={i}
          ref={done && i === guesses.length - 1 ? activeRow : undefined}
          className={`row${i === guesses.length - 1 ? " row--reveal" : ""}${i === SCORED_GUESSES - 1 ? " row--last-scored" : ""}`}
          role="img"
          aria-label={`Guess ${i + 1}: ${describeGuess(guess, answer)}`}
        >
          <Tiles letters={guess} statuses={evaluateGuess(guess, answer)} />
        </div>
      ))}
      {!done && (
        <div
          key={`input-${rejections}`}
          ref={activeRow}
          className={`row${rejections > 0 ? " row--shake" : ""}`}
          role="img"
          aria-label={`Guess ${guesses.length + 1}: ${input ? input.toUpperCase().split("").join(" ") : "empty"}${hintLabel ? `; hints: ${hintLabel}` : ""}`}
        >
          <Tiles letters={input} hints={hints} />
        </div>
      )}
      {Array.from({ length: fillers }, (_, i) => (
        <div key={`filler-${i}`} className="row" aria-hidden="true">
          <Tiles letters="" />
        </div>
      ))}
    </div>
  );
}
