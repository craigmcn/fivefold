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

// The CSP allows index.html's inline scripts by hash, so any edit to one
// must update netlify.toml too, or browsers will block it.
describe("Content-Security-Policy", () => {
  it("allows every inline script in index.html by its hash", async () => {
    // Any <script> without src is inline, whatever its attributes.
    const scripts = [
      ...indexHtml.matchAll(
        /<script\b(?![^>]*\ssrc\s*=)[^>]*>(.*?)<\/script>/gis,
      ),
    ].map((match) => match[1]);
    expect(scripts.length).toBeGreaterThan(0);

    for (const script of scripts) {
      expect(netlifyToml).toContain(`'sha256-${await sha256Base64(script)}'`);
    }
  });
});
