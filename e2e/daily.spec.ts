import { expect, test } from "@playwright/test";
import { seed } from "./seed.ts";

test("plays today's daily stage and keeps it across a reload", async ({
  page,
}) => {
  // Fixes Date only; timers still run normally.
  await page.clock.setFixedTime(new Date(2026, 9, 3, 9));
  await seed(page);
  await page.goto("/");
  await expect(page.getByText("Guess 1 is worth 60 points")).toBeVisible();

  await page.getByRole("button", { name: "Daily" }).click();
  await expect(page.getByText(/Daily #3 · Word 1 of 10/)).toBeVisible();
  // Unit tests cover which words a day gets; here just read today's first.
  // A string expression keeps DOM globals out of this Node-typed file.
  const first = (await page.evaluate(
    `JSON.parse(localStorage.getItem("fivefold")).daily.stage.words[0]`,
  )) as string;
  await page.keyboard.type(first);
  await page.keyboard.press("Enter");
  await expect(
    page.getByText(`${first.toUpperCase()} in one! +60 points`),
  ).toBeVisible();

  await page.reload();
  await expect(page.getByText(/Daily #3 · Word 1 of 10/)).toBeVisible();
  await page.getByRole("button", { name: "Endless" }).click();
  await expect(page.getByText(/Stage 1 · Word 1 of 10/)).toBeVisible();
});
