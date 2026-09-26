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

export interface PickedStage {
  words: string[];
  served: string[];
}

// Picks one unplayed answer per slot. When a tier runs dry, only that tier's
// history is cleared to start a new cycle, so repeat-avoidance keeps working
// indefinitely and the served list stays bounded by the answer count.
export function pickStage(
  served: readonly string[],
  random: () => number = Math.random,
): PickedStage {
  const remaining = new Set(served);
  const words: string[] = [];
  for (const tier of STAGE_TIERS) {
    const pool = ANSWERS[tier].filter((w) => !words.includes(w));
    let fresh = pool.filter((w) => !remaining.has(w));
    if (fresh.length === 0) {
      ANSWERS[tier].forEach((w) => remaining.delete(w));
      fresh = pool;
    }
    words.push(fresh[Math.floor(random() * fresh.length)]);
  }
  return { words, served: [...remaining] };
}
