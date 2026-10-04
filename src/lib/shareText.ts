import {
  cleanBonus,
  isCleanStage,
  multiplierFor,
  SCORED_GUESSES,
  stageScore,
  type WordResult,
} from "./scoring";

// Blue/orange echo the game's teal/coral; there's no teal square emoji.
const MISS = "⬛";
const SCORED = "🟦";
const UNSCORED = "🟧";
const REVEALED = "❌";
const HINT = "💡";

// Guesses past the scored ones are capped so a long slog doesn't make a
// runaway row; the 0 points already says it went long.
function row(result: WordResult, index: number): string {
  const misses = Math.min(result.guesses, SCORED_GUESSES + 1) - 1;
  const end = result.gaveUp
    ? REVEALED
    : result.guesses > SCORED_GUESSES
      ? UNSCORED
      : SCORED;
  const boss = multiplierFor(index) > 1 ? ` ×${multiplierFor(index)}` : "";
  const hints = result.hints > 0 ? ` ${HINT.repeat(result.hints)}` : "";
  const bar = result.gaveUp ? MISS.repeat(SCORED_GUESSES) : MISS.repeat(misses);
  return `${bar}${end} ${result.points}${boss}${hints}`;
}

// No letters anywhere, so it's safe to post before friends have played.
export function shareText(
  title: string,
  results: readonly WordResult[],
  url: string,
  hard: boolean,
): string {
  const lines = [
    `Fivefold ${title}${hard ? " (hard)" : ""} · ${stageScore(results, hard)} pts`,
    ...results.map(row),
  ];
  if (isCleanStage(results)) {
    lines.push(`✨ Clean stage +${cleanBonus(hard)}`);
  }
  lines.push(url);
  return lines.join("\n");
}
