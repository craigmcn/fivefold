import type { MouseEvent } from "react";
import type { LetterStatus } from "../types";

interface KeyboardProps {
  statuses: ReadonlyMap<string, LetterStatus>;
  onLetter: (letter: string) => void;
  onEnter: () => void;
  onBackspace: () => void;
}

const ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];

const STATUS_LABEL: Record<LetterStatus, string> = {
  correct: "correct",
  present: "in the word",
  absent: "not in the word",
};

// Keeps mouse/touch clicks from leaving focus on a key, where a later
// physical Enter would re-press that key instead of submitting the guess.
const keepFocus = (e: MouseEvent) => e.preventDefault();

export function Keyboard({
  statuses,
  onLetter,
  onEnter,
  onBackspace,
}: KeyboardProps) {
  return (
    <div className="keyboard" role="group" aria-label="Keyboard">
      {ROWS.map((row, r) => (
        <div key={row} className="keyboard-row">
          {r === 2 && (
            <button
              type="button"
              className="key key--wide"
              onMouseDown={keepFocus}
              onClick={onEnter}
            >
              Enter
            </button>
          )}
          {[...row].map((letter) => {
            const status = statuses.get(letter);
            return (
              <button
                key={letter}
                type="button"
                className={`key${status ? ` key--${status}` : ""}`}
                aria-label={
                  status ? `${letter}, ${STATUS_LABEL[status]}` : letter
                }
                onMouseDown={keepFocus}
                onClick={() => onLetter(letter)}
              >
                {letter}
              </button>
            );
          })}
          {r === 2 && (
            <button
              type="button"
              className="key key--wide"
              aria-label="Backspace"
              onMouseDown={keepFocus}
              onClick={onBackspace}
            >
              ⌫
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
