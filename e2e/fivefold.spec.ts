import { expect, test } from "@playwright/test";
import { seed, WORDS } from "./seed.ts";

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

test("a finished stage's link gives a friend the same words", async ({
  page,
  browser,
}) => {
  await seed(page);
  await page.goto("/");
  await expect(page.getByText("Guess 1 is worth 60 points")).toBeVisible();
  for (const [i, word] of WORDS.entries()) {
    await page.keyboard.type(word);
    await page.keyboard.press("Enter");
    if (i < WORDS.length - 1) {
      await page.keyboard.press("Enter");
      await expect(page.getByText(`Word ${i + 2} of 10`)).toBeVisible();
    }
  }
  const link = await page
    .getByRole("textbox", { name: /Challenge a friend/ })
    .inputValue();

  // A fresh context has empty storage, like a friend's browser.
  const friend = await (await browser.newContext()).newPage();
  await friend.goto(link);
  await expect(friend.getByText(/Stage 1 · Word 1 of 10/)).toBeVisible();
  await expect(friend).not.toHaveURL(/stage=/);
  await friend.keyboard.type(WORDS[0]);
  await friend.keyboard.press("Enter");
  await expect(friend.getByText("STAND in one! +60 points")).toBeVisible();
});
