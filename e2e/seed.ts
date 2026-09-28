import type { Page } from "@playwright/test";

export const WORDS = [
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

const SEEDED_STATE = JSON.stringify({
  version: 1,
  stats: {
    wordsPlayed: 0,
    wordsGivenUp: 0,
    stagesCompleted: 0,
    cleanStages: 0,
    totalPoints: 0,
    bestStageScore: 0,
    guessHistogram: {},
  },
  served: [],
  stage: { number: 1, words: WORDS, cursor: 0, results: [], guesses: [] },
});

// Seeds a known stage so answers are deterministic; only on first load, so
// reloads exercise real persistence. A string script keeps DOM globals out of
// this Node-typed file.
export async function seed(page: Page) {
  await page.addInitScript({
    content: `if (!localStorage.getItem("fivefold")) localStorage.setItem("fivefold", ${JSON.stringify(SEEDED_STATE)});`,
  });
}
