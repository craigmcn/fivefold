import { multiplierFor, type WordResult } from "../lib/scoring";

interface StageTrackProps {
  cursor: number;
  results: readonly WordResult[];
  total: number;
}

function describe(
  index: number,
  result: WordResult | undefined,
  cursor: number,
) {
  const boss =
    multiplierFor(index) > 1 ? `, boss word ×${multiplierFor(index)}` : "";
  if (result) {
    return result.gaveUp
      ? `Word ${index + 1}: revealed${boss}`
      : `Word ${index + 1}: solved in ${result.guesses}, ${result.points} points${boss}`;
  }
  return `Word ${index + 1}: ${index === cursor ? "current" : "upcoming"}${boss}`;
}

export function StageTrack({ cursor, results, total }: StageTrackProps) {
  return (
    <ol className="stage-track" aria-label="Stage progress">
      {Array.from({ length: total }, (_, i) => {
        const result = results[i];
        const state = result
          ? result.points > 0
            ? "scored"
            : "unscored"
          : i === cursor
            ? "current"
            : "upcoming";
        return (
          <li
            key={i}
            className={`pip pip--${state}${multiplierFor(i) > 1 ? " pip--boss" : ""}`}
            aria-label={describe(i, result, cursor)}
            aria-current={i === cursor ? "step" : undefined}
          >
            {multiplierFor(i) > 1 ? `×${multiplierFor(i)}` : i + 1}
          </li>
        );
      })}
    </ol>
  );
}
