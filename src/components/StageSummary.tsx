import {
  CLEAN_STAGE_BONUS,
  isCleanStage,
  stageScore,
  type WordResult,
} from "../lib/scoring";

interface StageSummaryProps {
  number: number;
  results: readonly WordResult[];
}

export function StageSummary({ number, results }: StageSummaryProps) {
  const clean = isCleanStage(results);
  return (
    <section className="stage-summary" aria-labelledby="stage-summary-title">
      <h2 id="stage-summary-title">Stage {number} complete</h2>
      <table>
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Word</th>
            <th scope="col">Guesses</th>
            <th scope="col">Points</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r, i) => (
            <tr key={r.answer}>
              <td>{i + 1}</td>
              <td className="summary-word">{r.answer}</td>
              <td>{r.gaveUp ? "revealed" : r.guesses}</td>
              <td>{r.points}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          {clean && (
            <tr>
              <td colSpan={3}>Clean stage bonus</td>
              <td>{CLEAN_STAGE_BONUS}</td>
            </tr>
          )}
          <tr>
            <th scope="row" colSpan={3}>
              Total
            </th>
            <td>{stageScore(results)}</td>
          </tr>
        </tfoot>
      </table>
    </section>
  );
}
