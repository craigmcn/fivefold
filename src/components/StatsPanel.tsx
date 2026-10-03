import { SCORED_GUESSES } from "../lib/scoring";
import type { Stats } from "../lib/storage";

interface StatsPanelProps {
  stats: Stats;
  extraTiles?: readonly [string, number][];
}

export function StatsPanel({ stats, extraTiles = [] }: StatsPanelProps) {
  const solved = Object.entries(stats.guessHistogram);
  const solvedCount = solved.reduce((sum, [, n]) => sum + n, 0);
  const average =
    solvedCount === 0
      ? "–"
      : (
          solved.reduce((sum, [g, n]) => sum + Number(g) * n, 0) / solvedCount
        ).toFixed(1);

  // Unlimited guesses would make an unbounded histogram; lump the unscored
  // tail into one bar.
  const bars = Array.from({ length: SCORED_GUESSES }, (_, i) => ({
    label: String(i + 1),
    count: stats.guessHistogram[i + 1] ?? 0,
  }));
  bars.push({
    label: `${SCORED_GUESSES + 1}+`,
    count: solved
      .filter(([g]) => Number(g) > SCORED_GUESSES)
      .reduce((sum, [, n]) => sum + n, 0),
  });
  const max = Math.max(1, ...bars.map((b) => b.count));

  const tiles: [string, string | number][] = [
    ...extraTiles,
    ["Words played", stats.wordsPlayed],
    ["Stages", stats.stagesCompleted],
    ["Clean stages", stats.cleanStages],
    ["Total points", stats.totalPoints],
    ["Best stage", stats.bestStageScore],
    ["Avg guesses", average],
  ];

  return (
    <>
      <dl className="stat-tiles">
        {tiles.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <h3>Guesses to solve</h3>
      <ul className="histogram">
        {bars.map(({ label, count }) => (
          <li key={label}>
            <span className="histogram-label">{label}</span>
            <span
              className="histogram-bar"
              style={{ width: `${Math.max(8, (count / max) * 100)}%` }}
            >
              {count}
            </span>
          </li>
        ))}
      </ul>
      {stats.wordsGivenUp > 0 && (
        <p className="muted">Words revealed: {stats.wordsGivenUp}</p>
      )}
    </>
  );
}
