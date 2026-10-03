import { ANSWERS } from "../data/answers";
import { STAGE_LENGTH } from "./scoring";

// Codes index into the alphabetised answer list, so they survive tier
// re-balancing but not added/removed answers; the checksum prefix makes codes
// from a different list fail loudly instead of decoding to other words.
const ALL_ANSWERS = Object.values(ANSWERS).flat().sort();
const INDEX = new Map(ALL_ANSWERS.map((w, i) => [w, i]));
const RADIX = BigInt(ALL_ANSWERS.length);
const CHECK_WIDTH = 2;
// Real codes are ~24 chars; capping length keeps a crafted link from making
// the BigInt decode below chew on megabytes before rejecting it.
const MAX_CODE_LENGTH = 40;

function listChecksum(): string {
  let hash = 0x811c9dc5;
  for (const char of ALL_ANSWERS.join("")) {
    hash = Math.imul(hash ^ char.charCodeAt(0), 0x01000193) >>> 0;
  }
  return (hash % 36 ** CHECK_WIDTH).toString(36).padStart(CHECK_WIDTH, "0");
}

const CHECKSUM = listChecksum();

export function encodeStage(words: readonly string[]): string {
  let value = 0n;
  for (const word of [...words].reverse()) {
    const index = INDEX.get(word);
    if (index === undefined) throw new Error(`Not an answer: ${word}`);
    value = value * RADIX + BigInt(index);
  }
  return CHECKSUM + value.toString(36);
}

export function decodeStage(code: string): string[] | null {
  const normalised = code.trim().toLowerCase();
  if (normalised.length > MAX_CODE_LENGTH) return null;
  if (!/^[0-9a-z]+$/.test(normalised)) return null;
  if (normalised.slice(0, CHECK_WIDTH) !== CHECKSUM) return null;

  let value = 0n;
  for (const digit of normalised.slice(CHECK_WIDTH)) {
    value = value * 36n + BigInt(parseInt(digit, 36));
  }
  const words: string[] = [];
  for (let i = 0; i < STAGE_LENGTH; i++) {
    words.push(ALL_ANSWERS[Number(value % RADIX)]);
    value /= RADIX;
  }
  if (value !== 0n || new Set(words).size !== STAGE_LENGTH) return null;
  return words;
}

export const STAGE_PARAM = "stage";

export function appLink(): string {
  // BASE_URL is "./" in the relative-base build, so resolve it against the
  // page itself, not the origin, or links would point at the site root.
  const url = new URL(import.meta.env.BASE_URL, window.location.href);
  url.search = "";
  url.hash = "";
  return url.toString();
}

export function stageLink(words: readonly string[]): string {
  const url = new URL(appLink());
  url.searchParams.set(STAGE_PARAM, encodeStage(words));
  return url.toString();
}

export type SharedLink = { words: string[] } | { invalid: true } | null;

export function readSharedLink(): SharedLink {
  const code = new URL(window.location.href).searchParams.get(STAGE_PARAM);
  if (code === null) return null;
  const words = decodeStage(code);
  return words ? { words } : { invalid: true };
}

// Kept separate from reading (which runs in render) so a reload doesn't keep
// re-offering the same shared stage.
export function clearSharedLink(): void {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(STAGE_PARAM)) return;
  url.searchParams.delete(STAGE_PARAM);
  window.history.replaceState(window.history.state, "", url);
}
