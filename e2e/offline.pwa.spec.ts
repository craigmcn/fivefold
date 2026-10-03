import { expect, test } from "@playwright/test";
import { seed } from "./seed.ts";

// Runs against `vite preview` of a production build: the service worker is
// only generated at build time, so the dev server can't exercise it.
test("reloads and plays offline once the service worker is in control", async ({
  page,
  context,
}) => {
  await seed(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Fivefold" })).toBeVisible();

  // A page's first load is never served by its own installing worker; wait
  // until clientsClaim hands it control. Strings keep DOM globals out of here.
  await page.waitForFunction("navigator.serviceWorker.controller !== null");

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Fivefold" })).toBeVisible();

  await page.keyboard.type("crane");
  await page.keyboard.press("Enter");
  await expect(page.getByText("Guess 2 is worth 50 points")).toBeVisible();

  // Shared links carry ?stage=, which must still match the precached page.
  await page.goto("/?stage=nope");
  await expect(page.getByRole("heading", { name: "Fivefold" })).toBeVisible();
  await expect(page.locator(".message")).toHaveText(
    "That stage link isn't valid",
  );
});
