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
  let next = saved;
  // Opening your own link (e.g. a bookmarked one) shouldn't replay a stage.
  const alreadyPlaying =
    words && saved.stage && sameWords(words, saved.stage.words);
  if (words && !alreadyPlaying && isReplaceable(saved.stage)) {
    next = newStage(saved, { words, served: saved.served });
  } else if (!saved.stage) {
    next = newStage(saved, pickStage(saved.served));
  }
  // A shared link is always an endless stage, so show it (or the confirm).
  if (words) next = { ...next, mode: "endless" };

  let state: GameState = {
    saved: next,
    input: "",
    message:
      shared && "invalid" in shared ? "That stage link isn't valid" : null,
    rejections: 0,
    unlocked: [],
  };
  // Reopening on a later day moves daily play on to that day's stage, unless
  // the earlier one is under way (startDaily keeps it to be finished).
  if (next.mode === "daily" && next.daily.stage?.number !== today) {
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
    words && !sameWords(words, state.saved.stage!.words) ? words : null;
  return { state, pendingShare };
}
