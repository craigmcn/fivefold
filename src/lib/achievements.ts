import { isCleanStage, type WordResult } from "./scoring";
import { STAGE_TIERS } from "./stage";
import type { SavedState, Stats } from "./storage";

const BRUTAL_INDEX = STAGE_TIERS.indexOf("brutal");

export interface AchievementContext {
  // State after the word (and stage, if this word finished it) was recorded.
  saved: SavedState;
  result: WordResult;
  index: number;
  // Present only when this word completed the stage.
  stage: readonly WordResult[] | null;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  earned: (c: AchievementContext) => boolean;
}

// One shared set across modes, so counts sum endless and daily stats.
const total = (saved: SavedState, pick: (s: Stats) => number) =>
  pick(saved.stats) + pick(saved.daily.stats);
const best = (saved: SavedState, pick: (s: Stats) => number) =>
  Math.max(pick(saved.stats), pick(saved.daily.stats));

export const ACHIEVEMENTS: readonly Achievement[] = [
  {
    id: "first-try",
    name: "First try",
    description: "Solve a word on your first guess, without hints",
    earned: ({ result }) =>
      !result.gaveUp && result.guesses === 1 && result.hints === 0,
  },
  {
    id: "brutal-three",
    name: "Brutal efficiency",
    description:
      "Solve the brutal 10th word in 3 or fewer guesses, without hints",
    earned: ({ result, index }) =>
      index === BRUTAL_INDEX &&
      !result.gaveUp &&
      result.guesses <= 3 &&
      result.hints === 0,
  },
  {
    id: "clean-stage",
    name: "Spotless",
    description: "Complete a clean stage",
    earned: ({ stage }) => stage !== null && isCleanStage(stage),
  },
  {
    id: "no-reveal-stage",
    name: "No peeking",
    description: "Complete a stage without revealing any word",
    earned: ({ stage }) => stage !== null && stage.every((r) => !r.gaveUp),
  },
  {
    id: "ten-stages",
    name: "Ten down",
    description: "Complete 10 stages",
    earned: ({ saved }) => total(saved, (s) => s.stagesCompleted) >= 10,
  },
  {
    id: "clean-streak-3",
    name: "Hat trick",
    description: "Complete 3 clean stages in a row",
    earned: ({ saved }) => best(saved, (s) => s.cleanStreak) >= 3,
  },
  {
    id: "word-streak-25",
    name: "On a roll",
    description: "Solve 25 words in a row within 6 guesses",
    earned: ({ saved }) => best(saved, (s) => s.wordStreak) >= 25,
  },
  {
    id: "words-100",
    name: "Centurion",
    description: "Play 100 words",
    earned: ({ saved }) => total(saved, (s) => s.wordsPlayed) >= 100,
  },
  {
    id: "stages-50",
    name: "Half century",
    description: "Complete 50 stages",
    earned: ({ saved }) => total(saved, (s) => s.stagesCompleted) >= 50,
  },
  {
    id: "points-10k",
    name: "High scorer",
    description: "Earn 10,000 points in total",
    earned: ({ saved }) => total(saved, (s) => s.totalPoints) >= 10_000,
  },
];

export const ACHIEVEMENT_IDS = new Set(ACHIEVEMENTS.map((a) => a.id));

export const achievementName = (id: string): string =>
  ACHIEVEMENTS.find((a) => a.id === id)?.name ?? id;

// Ids newly earned by this word, in list order. Milestones are checked every
// word, so saves from before achievements catch up on the next word played.
export function newlyEarned(c: AchievementContext): string[] {
  const have = new Set(c.saved.achievements);
  return ACHIEVEMENTS.filter((a) => !have.has(a.id) && a.earned(c)).map(
    (a) => a.id,
  );
}
