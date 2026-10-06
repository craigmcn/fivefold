import { multiplierFor, STAGE_LENGTH } from "../lib/scoring";

interface StageHeadingProps {
  label: string;
  cursor: number;
  hard: boolean;
  score: number;
}

export function StageHeading({
  label,
  cursor,
  hard,
  score,
}: StageHeadingProps) {
  const multiplier = multiplierFor(cursor);
  return (
    <div className="stage-heading">
      <p>
        {label} · Word {cursor + 1} of {STAGE_LENGTH}
        {multiplier > 1 && (
          <span className="boss-badge">Boss ×{multiplier}</span>
        )}
        {hard && <span className="hard-badge">Hard</span>}
      </p>
      <p>{score} pts</p>
    </div>
  );
}
