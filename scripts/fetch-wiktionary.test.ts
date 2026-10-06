// @vitest-environment node
// A Node script: under happy-dom, import.meta.url isn't a file: URL, which
// build-definitions.ts needs at load.
import { describe, expect, it } from "vitest";
import { decodeEntities, plainText } from "./fetch-wiktionary.ts";

describe("decodeEntities", () => {
  it("decodes decimal and hex numeric entities", () => {
    expect(decodeEntities("caf&#233; &#x2014; &#X41;")).toBe("café — A");
  });

  it("decodes known named entities, ignoring case", () => {
    expect(decodeEntities("salt &amp; pepper&nbsp;&QUOT;x&quot;")).toBe(
      'salt & pepper "x"',
    );
  });

  it("keeps unknown named entities as text", () => {
    expect(decodeEntities("a &foo; b")).toBe("a &foo; b");
  });

  it("decodes only once", () => {
    expect(decodeEntities("&amp;lt;")).toBe("&lt;");
  });
});

describe("plainText", () => {
  it("strips tags and style blocks, keeping the first line", () => {
    expect(
      plainText(
        '<style>.mw-parser-output .x{color:red}</style>To <a href="/w">fly</a> &amp; glide\nSecond line',
      ),
    ).toBe("To fly & glide");
  });
});
