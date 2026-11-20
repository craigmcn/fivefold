import { describe, expect, it } from "vitest";
import indexHtml from "../index.html?raw";
import netlifyToml from "../netlify.toml?raw";

async function sha256Base64(text: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return btoa(String.fromCharCode(...new Uint8Array(digest)));
}

// Any <script> without a src attribute is inline, whatever else it has.
// `\s` before src keeps data-src from counting; HTML names ignore case.
function inlineScripts(html: string): string[] {
  return [
    ...html.matchAll(/<script\b(?![^>]*\ssrc\b)[^>]*>(.*?)<\/script\s*>/gis),
  ].map((match) => match[1]);
}

// The CSP allows index.html's inline scripts by hash, so any edit to one
// must update netlify.toml too, or browsers will block it.
describe("Content-Security-Policy", () => {
  it("allows every inline script in index.html by its hash", async () => {
    const scripts = inlineScripts(indexHtml);
    expect(scripts.length).toBeGreaterThan(0);

    for (const script of scripts) {
      expect(netlifyToml).toContain(`'sha256-${await sha256Base64(script)}'`);
    }
  });

  it("finds inline scripts whatever their attributes or case", () => {
    const html = [
      "<script>bare()</script>",
      '<script id="probe">withId()</script>',
      '<script data-src="x">dataSrc()</script>',
      "<SCRIPT>upper()</SCRIPT>",
      "<script>spaced()</script >",
      '<script type="module" src="/main.js"></script>',
      '<script src = "/spaced.js"></script>',
      '<script SRC="/upper.js"></script>',
    ].join("\n");

    expect(inlineScripts(html)).toEqual([
      "bare()",
      "withId()",
      "dataSrc()",
      "upper()",
      "spaced()",
    ]);
  });
});
