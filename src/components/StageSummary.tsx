import { useId, useState } from "react";
import {
  CLEAN_STAGE_BONUS,
  isCleanStage,
  stageScore,
  type WordResult,
} from "../lib/scoring";
import { stageLink } from "../lib/share";

interface StageSummaryProps {
  number: number;
  words: readonly string[];
  results: readonly WordResult[];
}

type CopyState = "idle" | "copied" | "failed";

// The link stays visible in a read-only field so it can still be selected by
// hand where the Clipboard API is missing or refused (e.g. non-HTTPS).
function ShareLink({ words }: { words: readonly string[] }) {
  const [copy, setCopy] = useState<CopyState>("idle");
  const inputId = useId();
  const link = stageLink(words);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopy("copied");
    } catch {
      setCopy("failed");
    }
  }

  return (
    <div className="share-link">
      <label htmlFor={inputId}>Challenge a friend to these ten words:</label>
      <div className="share-link-row">
        <input
          id={inputId}
          type="text"
          readOnly
          value={link}
          onFocus={(e) => e.currentTarget.select()}
        />
        <button type="button" className="secondary" onClick={copyLink}>
          {copy === "copied" ? "Copied" : "Copy link"}
        </button>
      </div>
      <p className="muted" aria-live="polite">
        {copy === "copied" && "Link copied to the clipboard."}
        {copy === "failed" && "Couldn't copy. Select the link and copy it."}
      </p>
    </div>
  );
}

export function StageSummary({ number, words, results }: StageSummaryProps) {
  const clean = isCleanStage(results);
  return (
    <section className="stage-summary" aria-labelledby="stage-summary-title">
      <h2 id="stage-summary-title">Stage {number} complete</h2>
      <ShareLink words={words} />
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
