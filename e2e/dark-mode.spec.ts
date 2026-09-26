import { expect, test } from "@playwright/test";

test("follows the system colour scheme", async ({ page }) => {
  await page.goto("/");
  const body = page.locator("body");

  await page.emulateMedia({ colorScheme: "light" });
  await expect(body).toHaveCSS("background-color", "rgb(251, 250, 247)");

  await page.emulateMedia({ colorScheme: "dark" });
  await expect(body).toHaveCSS("background-color", "rgb(20, 22, 28)");
});
