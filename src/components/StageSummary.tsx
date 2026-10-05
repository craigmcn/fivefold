import { useId, useState } from "react";
import {
  cleanBonus,
  isCleanStage,
  stageScore,
  type WordResult,
} from "../lib/scoring";
import { appLink, stageLink } from "../lib/share";
import { shareText } from "../lib/shareText";

interface StageSummaryProps {
  // "Daily #3" or "Stage 4"; used in the heading and the share text.
  label: string;
  // Omitted for daily stages: everyone already has them, so a link would
  // only spoil a friend's daily.
  shareWords?: readonly string[];
  results: readonly WordResult[];
  hard: boolean;
}

type CopyState = "idle" | "copied" | "failed";

// The link stays visible in a read-only field so it can still be selected by
// hand where the Clipboard API is missing or refused (e.g. non-HTTPS).
function ShareLink({ link }: { link: string }) {
  const [copy, setCopy] = useState<CopyState>("idle");
  const inputId = useId();

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

type ShareState = "idle" | "copied" | "failed";

// Web Share where it exists (mostly phones), else the clipboard. Dismissing
// the share sheet throws AbortError, which isn't a failure worth reporting.
function ShareResults({ text }: { text: string }) {
  const [share, setShare] = useState<ShareState>("idle");

  async function shareResults() {
    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setShare("copied");
    } catch {
      setShare("failed");
    }
  }

  return (
    <div className="share-results">
      <button type="button" className="secondary" onClick={shareResults}>
        Share results
      </button>
      <p className="muted" aria-live="polite">
        {share === "copied" && "Results copied to the clipboard."}
        {share === "failed" && "Couldn't share or copy your results."}
      </p>
    </div>
  );
}

export function StageSummary({
  label,
  shareWords,
  results,
  hard,
}: StageSummaryProps) {
  const clean = isCleanStage(results);
  const link = shareWords ? stageLink(shareWords) : null;
  return (
    <section className="stage-summary" aria-labelledby="stage-summary-title">
      <h2 id="stage-summary-title">
        {label} complete{hard && " (hard mode)"}
      </h2>
      <ShareResults text={shareText(label, results, link ?? appLink(), hard)} />
      {link && <ShareLink link={link} />}
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
              <td>
                {r.gaveUp ? "revealed" : r.guesses}
                {r.hints > 0 &&
                  ` + ${r.hints} ${r.hints === 1 ? "hint" : "hints"}`}
              </td>
              <td>{r.points}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          {clean && (
            <tr>
              <td colSpan={3}>Clean stage bonus</td>
              <td>{cleanBonus(hard)}</td>
            </tr>
          )}
          <tr>
            <th scope="row" colSpan={3}>
              Total
            </th>
            <td>{stageScore(results, hard)}</td>
          </tr>
        </tfoot>
      </table>
    </section>
  );
}
