import type { Page } from "@playwright/test";

// Collects CSP violations for the page's whole life, reloads and navigations
// included. The listener is a string so DOM globals stay out of this tsconfig.
export async function watchCsp(page: Page): Promise<string[]> {
  const violations: string[] = [];
  await page.exposeFunction("reportCspViolation", (text: string) =>
    violations.push(text),
  );
  await page.addInitScript({
    content: `document.addEventListener("securitypolicyviolation", (e) =>
      window.reportCspViolation(e.violatedDirective + " blocked " + (e.blockedURI || "inline")));`,
  });
  return violations;
}
