import { pickStage } from "./stage";

// Daily #1 is this local date. Days are counted from local calendar dates via
// Date.UTC, so DST shifts can't make a day 23 or 25 hours long.
const EPOCH = Date.UTC(2026, 9, 1);
const DAY_MS = 86_400_000;

// Floored at 1 so a device clock set before launch can't show "Daily #0"
// or a negative number.
export function dayNumber(date: Date = new Date()): number {
  const today = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.max(1, Math.round((today - EPOCH) / DAY_MS) + 1);
}

// Small, well-mixed 32-bit PRNG; quality only needs to beat obvious patterns.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

// Ignores the player's served history so everyone gets the same ten words.
export function dailyWords(day: number): string[] {
  return pickStage([], mulberry32(Math.imul(day, 0x9e3779b1))).words;
}
