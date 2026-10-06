import { describe, expect, it } from "vitest";
import { ANSWERS } from "../data/answers";
import { dailyWords, dayNumber } from "./daily";
import { STAGE_TIERS } from "./stage";

// Dailies #1–30, pinned so a change to pickStage, the PRNG or the seed can't
// silently reshuffle everyone's past and future dailies. Update only on
// purpose, e.g. alongside an answer-list change (which reshuffles them anyway).
const PINNED_DAILIES = [
  "ninth lapse dryer madam sweet rugby hydro lasso rusty joist",
  "their nicer siege melee quark glory gnash gawky chafe flunk",
  "drink heath koala lemur coven abide penny spiel gizmo sassy",
  "smart sinew zesty crypt dough trail femur milky caper skunk",
  "cruel trade glass avail bribe abhor forge brown rigid snuff",
  "claim honey pouty candy wince basic aping hydro plaid taunt",
  "truth alike melee dingy stash alive amaze ingot aspic swash",
  "saucy chair snarl lower stork spoil chafe stuck diode slunk",
  "remix shame rebus match spire chalk stain toxic stoke needy",
  "slope cache friar whack shrew scarf stole twist track bevel",
  "ultra crash penny tacit sleek felon valve bench shaky amass",
  "cyber erupt lowly mafia linen magic swore rough gorge lever",
  "party serve brave nylon rumor forty tulle comic digit toddy",
  "scuba fetid spurt stoke shock essay phony molar poser rover",
  "alone upset recut lager petty title tapir forte gavel billy",
  "known pulse timid fried gross cache scout swami mouth manga",
  "carol laden chose flesh guava shaft fatal grimy tipsy pooch",
  "serve sweat scrub strap rebut berth savor scant idiot trite",
  "vomit cycle capon tibia eager inbox lease afoot elegy kneed",
  "dwarf maybe track melee stump clean rusty flare siege clank",
  "clerk cigar vixen twist liege chief queue eight drank mossy",
  "satyr stern opine swept stump awoke evade shade picky tatty",
  "notch speak teeth cover cubic berth tonal opine apnea livid",
  "voice noisy aping frank mower sober lucid maven glean clung",
  "exist trunk moist hotly pried boxer melee timid rigid couch",
  "table lodge welch boast tweed aunty frisk brick canal clock",
  "siren obese stare prowl moose opium ample liner speed spoof",
  "newly flier diver prune fluke haven refit ingot forge couch",
  "elder value prowl apple beret coupe crept khaki queer mania",
  "equal frame strap leant hovel awoke halve liner stead tatty",
];

describe("dayNumber", () => {
  it("counts local calendar days from 1 October 2026", () => {
    expect(dayNumber(new Date(2026, 9, 1, 0, 0))).toBe(1);
    expect(dayNumber(new Date(2026, 9, 1, 23, 59))).toBe(1);
    expect(dayNumber(new Date(2026, 9, 3, 12))).toBe(3);
    expect(dayNumber(new Date(2027, 9, 1))).toBe(366);
  });

  it("never drops below Daily #1 on a clock set before launch", () => {
    expect(dayNumber(new Date(2026, 8, 30))).toBe(1);
    expect(dayNumber(new Date(2020, 0, 1))).toBe(1);
  });

  it("stays one day apart across daylight-saving changes", () => {
    for (const [y, m, d] of [
      [2026, 10, 1],
      [2027, 2, 14],
    ]) {
      const before = dayNumber(new Date(y, m, d, 12));
      expect(dayNumber(new Date(y, m, d + 1, 12))).toBe(before + 1);
    }
  });
});

describe("dailyWords", () => {
  it("is the same for everyone on a given day", () => {
    expect(dailyWords(3)).toEqual(dailyWords(3));
  });

  it("follows the stage's tier shape with ten distinct words", () => {
    const words = dailyWords(42);
    expect(new Set(words).size).toBe(10);
    words.forEach((word, i) => {
      expect(ANSWERS[STAGE_TIERS[i]]).toContain(word);
    });
  });

  it("changes from day to day", () => {
    const days = Array.from({ length: 30 }, (_, i) => dailyWords(i + 1).join());
    expect(new Set(days).size).toBe(30);
  });

  it("matches the pinned words for the first 30 days", () => {
    const days = Array.from({ length: 30 }, (_, i) =>
      dailyWords(i + 1).join(" "),
    );
    expect(days).toEqual(PINNED_DAILIES);
  });
});
