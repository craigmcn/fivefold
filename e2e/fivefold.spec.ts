import { expect, test, type Page } from "@playwright/test";

const WORDS = [
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
async function seed(page: Page) {
  await page.addInitScript({
    content: `if (!localStorage.getItem("fivefold")) localStorage.setItem("fivefold", ${JSON.stringify(SEEDED_STATE)});`,
  });
}

test("plays a full stage and carries progress across reloads", async ({
  page,
}) => {
  await seed(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Fivefold" })).toBeVisible();

  await page.keyboard.type("crane");
  await page.keyboard.press("Enter");
  await expect(page.getByText("Guess 2 is worth 50 points")).toBeVisible();

  await page.reload();
  await expect(page.getByText("Guess 2 is worth 50 points")).toBeVisible();

  for (const [i, word] of WORDS.entries()) {
    await page.keyboard.type(word);
    await page.keyboard.press("Enter");
    // Focus lands on the Next button, so Enter moves on.
    await page.keyboard.press("Enter");
    if (i < WORDS.length - 1) {
      await expect(page.getByText(`Word ${i + 2} of 10`)).toBeVisible();
    }
  }

  await expect(page.getByText(/Stage 2 · Word 1 of 10/)).toBeVisible();
  await page.getByRole("button", { name: "Stats" }).click();
  await expect(page.getByRole("dialog")).toContainText("Stages");
});

test("shakes off invalid words without spending a guess", async ({ page }) => {
  await seed(page);
  await page.goto("/");
  await expect(page.getByText("Guess 1 is worth 60 points")).toBeVisible();
  await page.keyboard.type("qzxvj");
  await page.keyboard.press("Enter");
  await expect(page.locator(".message")).toHaveText("Not in word list");
  await expect(
    page.getByRole("img", { name: "Guess 1: Q Z X V J" }),
  ).toBeVisible();
});
