// Builds src/data/definitions.ts: one short definition per answer. Sources,
// in priority order:
//   1. scripts/data/definition-overrides.tsv: hand fixes for bad senses
//   2. WordNet 3.1 (devDependency wordnet-db, Princeton licence)
//   3. scripts/data/definitions-wiktionary.tsv: fills WordNet's gaps
//      (CC BY-SA 4.0; refresh with `yarn definitions:fetch`)
// Runs offline from committed inputs; part of `yarn words`.
import { openSync, readFileSync, readSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const dataDir = `${root}scripts/data/`;
const wordnetDir = createRequire(import.meta.url)
  .resolve("wordnet-db/package.json")
  .replace(/package\.json$/, "dict/");

// Long glosses crowd the word-complete line on a phone.
const MAX_LENGTH = 140;

// Read the generated module's text rather than importing it: it imports from
// src/, which this Node-typed scripts project doesn't type-check.
export const answers = [
  ...readFileSync(`${root}src/data/answers.ts`, "utf8").matchAll(
    /"([a-z]{5})"/g,
  ),
]
  .map((m) => m[1])
  .sort();

export function readTsv(name: string): Map<string, string> {
  let text = "";
  try {
    text = readFileSync(dataDir + name, "utf8");
  } catch {
    return new Map();
  }
  return new Map(
    text
      .split("\n")
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => line.split("\t") as [string, string])
      .filter(([word, definition]) => /^[a-z]{5}$/.test(word) && definition),
  );
}

// Sentence-case, no trailing full stop, clipped at a word boundary. A leading
// usage label ("(astronomy) a small…", "(of hair) having curls") is dropped.
export function tidy(definition: string): string {
  let text = definition
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\([^)]*\)\s*/, "")
    .replace(/[.;:]+$/, "");
  if (text.length > MAX_LENGTH) {
    text = `${text.slice(0, text.lastIndexOf(" ", MAX_LENGTH - 1))}…`;
  }
  return text.charAt(0).toUpperCase() + text.slice(1);
}

type Pos = "noun" | "verb" | "adj" | "adv";
const POS_ORDER: Pos[] = ["noun", "verb", "adj", "adv"];

// index.<pos> lines: lemma pos synset_cnt p_cnt [ptr…] sense_cnt
// tagsense_cnt offset… (offsets ordered by WordNet's sense frequency).
function readIndex(
  pos: Pos,
): Map<string, { tagged: number; offsets: string[] }> {
  const entries = new Map<string, { tagged: number; offsets: string[] }>();
  for (const line of readFileSync(`${wordnetDir}index.${pos}`, "utf8").split(
    "\n",
  )) {
    if (!line || line.startsWith(" ")) continue;
    const fields = line.split(" ");
    if (!/^[a-z]{5}$/.test(fields[0])) continue;
    const synsets = Number(fields[2]);
    const rest = fields.slice(4 + Number(fields[3]));
    entries.set(fields[0], {
      tagged: Number(rest[1]),
      offsets: rest.slice(2, 2 + synsets),
    });
  }
  return entries;
}

const files = new Map(
  POS_ORDER.map((pos) => [pos, openSync(`${wordnetDir}data.${pos}`, "r")]),
);

interface Sense {
  gloss: string;
  // The synset spells the word capitalised: a proper noun ("Drake" the
  // explorer, "Heron" the mathematician), rarely the sense a player means.
  proper: boolean;
}

// data.<pos> is addressed by byte offset: offset lex_filenum ss_type w_cnt
// word lex_id …, with the gloss after "| ". Lines for heavily linked synsets
// ("alter", "brand") run past 4 KB, so read on until the newline.
function sense(pos: Pos, offset: string, word: string): Sense {
  const chunks: Buffer[] = [];
  let position = Number(offset);
  for (;;) {
    const buffer = Buffer.alloc(4096);
    const read = readSync(files.get(pos)!, buffer, 0, buffer.length, position);
    const end = buffer.subarray(0, read).indexOf("\n");
    chunks.push(buffer.subarray(0, end === -1 ? read : end));
    if (end !== -1 || read === 0) break;
    position += read;
  }
  const line = Buffer.concat(chunks).toString("utf8");
  const fields = line.split(" ");
  const words = fields
    .slice(4, 4 + 2 * parseInt(fields[3], 16))
    .filter((_, i) => i % 2 === 0);
  const spelling = words.find((w) => w.toLowerCase().split("(")[0] === word);
  const text = line.slice(line.indexOf("| ") + 2);
  return {
    // First definition only: examples are quoted, alternatives split by ";".
    gloss: text.split('; "')[0].split(";")[0].trim(),
    proper: spelling !== undefined && spelling !== spelling.toLowerCase(),
  };
}

// The part of speech with the most usage-tagged senses wins; within it, the
// first sense that's neither a proper noun nor domain-labelled
// ("(astronomy)"), since WordNet's ordering of untagged senses is arbitrary.
export function wordnetDefinitions(): Map<string, string> {
  const indexes = POS_ORDER.map((pos) => [pos, readIndex(pos)] as const);
  const found = new Map<string, string>();
  for (const word of answers) {
    const candidates = indexes
      .filter(([, index]) => index.has(word))
      .map(([pos, index]) => ({ pos, ...index.get(word)! }))
      .sort((a, b) => b.tagged - a.tagged);
    if (candidates.length === 0) continue;
    const { pos, offsets } = candidates[0];
    const senses = offsets.map((offset) => sense(pos, offset, word));
    const best =
      senses.find((s) => !s.proper && !s.gloss.startsWith("(")) ??
      senses.find((s) => !s.proper) ??
      senses[0];
    found.set(word, best.gloss);
  }
  return found;
}

function build() {
  const overrides = readTsv("definition-overrides.tsv");
  const wordnet = wordnetDefinitions();
  const wiktionary = readTsv("definitions-wiktionary.tsv");

  const definitions: [string, string][] = [];
  const missing: string[] = [];
  for (const word of answers) {
    const definition =
      overrides.get(word) ?? wordnet.get(word) ?? wiktionary.get(word);
    if (definition) definitions.push([word, tidy(definition)]);
    else missing.push(word);
  }

  writeFileSync(
    `${root}src/data/definitions.ts`,
    `// Generated by scripts/build-definitions.ts — do not edit by hand.
// Definitions from WordNet 3.1, Copyright 2006 by Princeton University (see
// public/licenses/wordnet.txt), and Wiktionary (CC BY-SA 4.0,
// https://creativecommons.org/licenses/by-sa/4.0/), first sense only,
// shortened and re-cased; with hand-written overrides.

export const DEFINITIONS: Readonly<Record<string, string>> = ${JSON.stringify(Object.fromEntries(definitions), null, 2)};
`,
  );
  console.log(
    `${definitions.length}/${answers.length} definitions ` +
      `(${wordnet.size} WordNet, ${overrides.size} overrides, ` +
      `${wiktionary.size} Wiktionary)`,
  );
  if (missing.length > 0) {
    console.warn(`No definition for ${missing.length}: ${missing.join(" ")}`);
  }
}

// Imported by fetch-wiktionary.ts for its helpers; only build when run.
if (process.argv[1] === fileURLToPath(import.meta.url)) build();
