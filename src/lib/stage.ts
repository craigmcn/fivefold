import { ANSWERS } from "../data/answers";
import type { Tier } from "../types";

// Difficulty dips after the 5th-word boss so the stage doesn't feel like a
// steady grind, then peaks again at the 10th.
export const STAGE_TIERS: readonly Tier[] = [
  "easy",
  "easy",
  "medium",
  "medium",
  "hard",
  "easy",
  "medium",
  "medium",
  "medium",
  "brutal",
];

// Picks one unplayed answer per slot. Once a tier's answers have all been
// served, it falls back to the whole tier so play can continue forever.
export function pickStage(
  served: ReadonlySet<string>,
  random: () => number = Math.random,
): string[] {
  const chosen: string[] = [];
  for (const tier of STAGE_TIERS) {
    const pool = ANSWERS[tier].filter((w) => !chosen.includes(w));
    const fresh = pool.filter((w) => !served.has(w));
    const options = fresh.length > 0 ? fresh : pool;
    chosen.push(options[Math.floor(random() * options.length)]);
  }
  return chosen;
}
