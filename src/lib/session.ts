import { dailyWords } from "./daily";
import { gameReducer, isStageDone, newStage, type GameState } from "./game";
import type { SharedLink } from "./share";
import { pickStage } from "./stage";
import type { SavedState, StageProgress } from "./storage";

export interface Session {
  state: GameState;
  // A shared stage waiting for the player to confirm abandoning their own.
  pendingShare: string[] | null;
}

export const sameWords = (a: readonly string[], b: readonly string[]) =>
  a.join() === b.join();

// Only a stage with no guesses in it (or a finished one) is replaced without
// asking; otherwise the player confirms before losing progress.
export const isReplaceable = (stage: StageProgress | null): boolean =>
  !stage ||
  isStageDone(stage) ||
  (stage.results.length === 0 && stage.guesses.length === 0);

// Everything the app decides at start-up, kept pure (the save, the link and
// the day are passed in) so it's testable without rendering. Randomness comes
// from pickStage, as in the reducer's callers.
export function startSession(
  saved: SavedState,
  shared: SharedLink,
  today: number,
): Session {
  const words = shared && "words" in shared ? shared.words : null;
  // Opening your own link (e.g. a bookmarked one) shouldn't replay a stage.
  const alreadyPlaying =
    words && saved.stage && sameWords(words, saved.stage.words);
  const replaceWith =
    words && !alreadyPlaying && isReplaceable(saved.stage) ? words : null;
  const withStage = replaceWith
    ? newStage(saved, { words: replaceWith, served: saved.served })
    : hasStage(saved)
      ? saved
      : newStage(saved, pickStage(saved.served));

  let state: GameState = {
    // Endless first: daily gets its stage from startDaily below.
    saved: { ...withStage, mode: "endless" },
    input: "",
    message:
      shared && "invalid" in shared ? "That stage link isn't valid" : null,
    rejections: 0,
    unlocked: [],
  };
  // A shared link is always an endless stage, so show it (or the confirm).
  // Otherwise daily resumes, on today's stage unless an earlier day's is
  // under way (startDaily keeps that one to be finished).
  if (!words && withStage.mode === "daily") {
    state = {
      ...gameReducer(state, {
        type: "startDaily",
        day: today,
        words: dailyWords(today),
      }),
      message: state.message,
    };
  }

  const pendingShare =
    words && !sameWords(words, state.saved.stage.words) ? words : null;
  return { state, pendingShare };
}

const hasStage = (
  saved: SavedState,
): saved is SavedState & { stage: StageProgress } => saved.stage !== null;
