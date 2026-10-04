import { SCORED_GUESSES } from "../lib/scoring";
import type { Stats } from "../lib/storage";

interface StatsPanelProps {
  stats: Stats;
  // Daily mode's consecutive-days streak, shown first in the streaks table.
  dayStreak?: { current: number; best: number };
  // What one completed stage is called in this mode's tiles.
  unit?: "stage" | "daily";
}

export function StatsPanel({
  stats,
  dayStreak,
  unit = "stage",
}: StatsPanelProps) {
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
    ["Words played", stats.wordsPlayed],
    [unit === "daily" ? "Dailies completed" : "Stages", stats.stagesCompleted],
    [`Clean ${unit === "daily" ? "dailies" : "stages"}`, stats.cleanStages],
    ["Total points", stats.totalPoints],
    [`Best ${unit}`, stats.bestStageScore],
    ["Avg guesses", average],
  ];

  const streaks: [string, number, number][] = [
    ...(dayStreak
      ? [
          ["Days completed", dayStreak.current, dayStreak.best] as [
            string,
            number,
            number,
          ],
        ]
      : []),
    [
      unit === "daily" ? "Clean dailies" : "Clean stages",
      stats.cleanStreak,
      stats.maxCleanStreak,
    ],
    [
      `Words in ${SCORED_GUESSES} or fewer`,
      stats.wordStreak,
      stats.maxWordStreak,
    ],
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
      <h3>Streaks</h3>
      <table className="streaks">
        <thead>
          <tr>
            <th scope="col">In a row</th>
            <th scope="col">Now</th>
            <th scope="col">Best</th>
          </tr>
        </thead>
        <tbody>
          {streaks.map(([label, current, best]) => (
            <tr key={label}>
              <th scope="row">{label}</th>
              <td>{current}</td>
              <td>{best}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
      {stats.hintsUsed > 0 && (
        <p className="muted">Hints used: {stats.hintsUsed}</p>
      )}
    </>
  );
}
