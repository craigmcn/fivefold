import { STAGE_LENGTH, type WordResult } from "./scoring";

export const STORAGE_KEY = "fivefold";
const VERSION = 2;

export interface Stats {
  wordsPlayed: number;
  wordsGivenUp: number;
  stagesCompleted: number;
  cleanStages: number;
  totalPoints: number;
  bestStageScore: number;
  hintsUsed: number;
  // Consecutive clean stages, and consecutive words solved within the scored
  // guesses (hints allowed; a reveal or an unscored solve breaks it).
  cleanStreak: number;
  maxCleanStreak: number;
  wordStreak: number;
  maxWordStreak: number;
  // Solved-word counts keyed by number of guesses taken (1, 2, …, n).
  guessHistogram: Record<number, number>;
}

export interface StageProgress {
  number: number;
  words: string[];
  // Index of the word being played; it stays put after the word is finished
  // (so its board remains visible) until the player moves on.
  cursor: number;
  results: WordResult[];
  // Submitted guesses for the word currently being played.
  guesses: string[];
  // Hints on the current word: revealed positions, removed letters, and how
  // many times the remove-letters hint was used (one use can remove several).
  revealed: number[];
  eliminated: string[];
  eliminations: number;
  // Locked when the stage starts, from SavedState.hardMode.
  hard: boolean;
  // The cursor the hint fields belong to. A pre-hints build advancing the
  // cursor leaves them stale; a mismatch on load clears them.
  hintsFor: number;
}

export type Mode = "endless" | "daily";

export interface DailyState {
  // Its number is the day number (see lib/daily), so a stale stage is easy
  // to spot when the date rolls over.
  stage: StageProgress | null;
  stats: Stats;
  // Consecutive days with a completed daily, ending on lastCompleted.
  streak: number;
  maxStreak: number;
  lastCompleted: number | null;
}

export interface SavedState {
  version: typeof VERSION;
  mode: Mode;
  // Endless play: stats, repeat-avoidance history and the stage in progress.
  stats: Stats;
  served: string[];
  stage: StageProgress | null;
  daily: DailyState;
  // Earned achievement ids in the order earned; one set across both modes.
  achievements: string[];
  // Hard-mode preference, applied to stages as they start.
  hardMode: boolean;
}

export const emptyStats = (): Stats => ({
  wordsPlayed: 0,
  wordsGivenUp: 0,
  stagesCompleted: 0,
  cleanStages: 0,
  totalPoints: 0,
  bestStageScore: 0,
  hintsUsed: 0,
  cleanStreak: 0,
  maxCleanStreak: 0,
  wordStreak: 0,
  maxWordStreak: 0,
  guessHistogram: {},
});

export const emptyDaily = (): DailyState => ({
  stage: null,
  stats: emptyStats(),
  streak: 0,
  maxStreak: 0,
  lastCompleted: null,
});

export const emptyState = (): SavedState => ({
  version: VERSION,
  mode: "endless",
  stats: emptyStats(),
  served: [],
  stage: null,
  daily: emptyDaily(),
  achievements: [],
  hardMode: false,
});

const isWordList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((w) => /^[a-z]{5}$/.test(String(w)));

const isCount = (value: unknown): value is number =>
  Number.isInteger(value) && (value as number) >= 0;

// Results are rendered (WordComplete upper-cases the answer) and summed into
// scores, so every field is checked; hints is defaulted by loadStage instead.
function isResult(value: unknown, answer: string): boolean {
  if (!value || typeof value !== "object") return false;
  const r = value as Partial<WordResult>;
  return (
    r.answer === answer &&
    isCount(r.guesses) &&
    isCount(r.points) &&
    typeof r.gaveUp === "boolean"
  );
}

// Guards every field App and the reducer read; a stage failing it is dropped
// rather than crashing every load. Hint fields are optional here and
// defaulted by loadStage, so saves from before hints still load.
function isStage(value: unknown): value is StageProgress {
  if (!value || typeof value !== "object") return false;
  const s = value as Partial<StageProgress>;
  return (
    Number.isInteger(s.number) &&
    isWordList(s.words) &&
    s.words.length === STAGE_LENGTH &&
    Number.isInteger(s.cursor) &&
    s.cursor! >= 0 &&
    s.cursor! < STAGE_LENGTH &&
    Array.isArray(s.results) &&
    s.results.every((r, i) => isResult(r, s.words![i])) &&
    (s.results.length === s.cursor || s.results.length === s.cursor! + 1) &&
    isWordList(s.guesses)
  );
}

// Hint fields were added without a version bump: they're additive, so older
// app builds still read these saves, and defaulting them here covers saves
// made before hints existed.
function loadStage(value: unknown): StageProgress | null {
  if (!isStage(value)) return null;
  const s = value as Partial<StageProgress> & StageProgress;
  const current = s.hintsFor === s.cursor;
  return {
    ...s,
    results: s.results.map((r) => ({
      ...r,
      hints: isCount(r.hints) ? r.hints : 0,
    })),
    revealed:
      current && Array.isArray(s.revealed)
        ? s.revealed.filter((i) => Number.isInteger(i) && i >= 0 && i < 5)
        : [],
    eliminated:
      current && Array.isArray(s.eliminated)
        ? s.eliminated.filter((l) => /^[a-z]$/.test(String(l)))
        : [],
    eliminations: current && isCount(s.eliminations) ? s.eliminations : 0,
    hintsFor: s.cursor,
    hard: s.hard === true,
  };
}

// Field by field, so a corrupt counter or histogram falls back to its
// default instead of crashing the Stats dialog or turning sums into strings.
// Missing fields (streaks, hintsUsed: added without a version bump) default
// the same way.
function loadStats(value: unknown): Stats {
  const raw = (value && typeof value === "object" ? value : {}) as Record<
    string,
    unknown
  >;
  const stats = emptyStats();
  for (const key of Object.keys(stats) as (keyof Stats)[]) {
    if (key !== "guessHistogram" && isCount(raw[key])) stats[key] = raw[key];
  }
  const histogram = raw.guessHistogram;
  if (histogram && typeof histogram === "object") {
    stats.guessHistogram = Object.fromEntries(
      Object.entries(histogram).filter(
        ([guesses, count]) => /^[1-9]\d*$/.test(guesses) && isCount(count),
      ),
    );
  }
  return stats;
}

function loadDaily(value: unknown): DailyState {
  if (!value || typeof value !== "object") return emptyDaily();
  const d = value as Partial<DailyState>;
  return {
    stage: loadStage(d.stage),
    stats: loadStats(d.stats),
    streak: isCount(d.streak) ? d.streak : 0,
    maxStreak: isCount(d.maxStreak) ? d.maxStreak : 0,
    lastCompleted: Number.isInteger(d.lastCompleted) ? d.lastCompleted! : null,
  };
}

// localStorage can throw (private mode, blocked storage) or hold data from a
// future schema; either way, start fresh rather than crash the game. Version 1
// had no daily mode, so it loads as endless play with empty daily state.
export function loadState(): SavedState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as Partial<Omit<SavedState, "version">> & {
      version?: unknown;
    };
    if (parsed.version !== 1 && parsed.version !== VERSION) {
      return emptyState();
    }
    return {
      version: VERSION,
      mode: parsed.mode === "daily" ? "daily" : "endless",
      stats: loadStats(parsed.stats),
      served: isWordList(parsed.served) ? parsed.served : [],
      stage: loadStage(parsed.stage),
      daily: loadDaily(parsed.daily),
      // Additive like the hint and streak fields, so no version bump.
      achievements: Array.isArray(parsed.achievements)
        ? [
            ...new Set(
              parsed.achievements.filter((id) => typeof id === "string"),
            ),
          ]
        : [],
      hardMode: parsed.hardMode === true,
    };
  } catch {
    return emptyState();
  }
}

export function saveState(state: SavedState): void {
  try {
    // An unchanged write is skipped: another tab's change reaches this one as
    // new state, and writing it straight back would bounce between tabs.
    const json = JSON.stringify(state);
    if (window.localStorage.getItem(STORAGE_KEY) === json) return;
    window.localStorage.setItem(STORAGE_KEY, json);
  } catch {
    // Progress just won't persist; the game itself still works.
  }
}

// The error screen's way out when a save makes the app fail to render.
export function clearState(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing more can be done; a reload will at least retry.
  }
}
