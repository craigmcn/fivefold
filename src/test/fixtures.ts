import { emptyState, type SavedState } from "../lib/storage";

export const STAGE_WORDS = [
  "stand",
  "party",
  "crane",
  "flock",
  "shock",
  "early",
  "adorn",
  "guild",
  "taper",
  "dross",
];

export function seededState(overrides: Partial<SavedState> = {}): SavedState {
  return {
    ...emptyState(),
    stage: {
      number: 1,
      words: STAGE_WORDS,
      cursor: 0,
      results: [],
      guesses: [],
      revealed: [],
      eliminated: [],
      eliminations: 0,
      hintsFor: 0,
    },
    ...overrides,
  };
}
