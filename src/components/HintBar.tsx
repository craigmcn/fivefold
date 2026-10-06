interface HintBarProps {
  canReveal: boolean;
  // How many letters "rule out" would remove right now (0 when exhausted).
  eliminateCount: number;
  // Labels such as "−20 pts" or "free", worked out from the current worth.
  revealCost: string;
  eliminateCost: string;
  onReveal: () => void;
  onEliminate: () => void;
}

export function HintBar({
  canReveal,
  eliminateCount,
  revealCost,
  eliminateCost,
  onReveal,
  onEliminate,
}: HintBarProps) {
  if (!canReveal && eliminateCount === 0) return null;
  return (
    <div className="hint-bar" role="group" aria-label="Hints">
      {canReveal && (
        <button
          type="button"
          className="text-button"
          // Like the on-screen keys: don't keep focus, or Enter would buy
          // another hint instead of submitting the guess.
          onMouseDown={(e) => e.preventDefault()}
          onClick={onReveal}
        >
          Reveal a letter ({revealCost})
        </button>
      )}
      {eliminateCount > 0 && (
        <button
          type="button"
          className="text-button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onEliminate}
        >
          Rule out {eliminateCount}{" "}
          {eliminateCount === 1 ? "letter" : "letters"} ({eliminateCost})
        </button>
      )}
    </div>
  );
}
