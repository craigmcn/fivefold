import { useCallback, useEffect, useReducer, useState } from "react";
import "./App.css";
import { Board, describeGuess } from "./components/Board";
import { HowToPlay } from "./components/HowToPlay";
import { Keyboard } from "./components/Keyboard";
import { Modal } from "./components/Modal";
import { StageSummary } from "./components/StageSummary";
import { StageTrack } from "./components/StageTrack";
import { StatsPanel } from "./components/StatsPanel";
import { WordComplete } from "./components/WordComplete";
import { keyboardStatuses } from "./lib/evaluate";
import { dailyWords, dayNumber } from "./lib/daily";
import {
  gameReducer,
  isStageDone,
  isWordDone,
  newStage,
  type GameState,
} from "./lib/game";
import {
  multiplierFor,
  pointsFor,
  STAGE_LENGTH,
  stageScore,
} from "./lib/scoring";
import { clearSharedLink, readSharedLink, type SharedLink } from "./lib/share";
import { pickStage } from "./lib/stage";
import {
  currentStreak,
  loadState,
  saveState,
  type Mode,
  type StageProgress,
} from "./lib/storage";

const sameWords = (a: readonly string[], b: readonly string[]) =>
  a.join() === b.join();

// Only a stage with no guesses in it (or a finished one) is replaced without
// asking; otherwise App confirms before throwing away progress.
const isReplaceable = (stage: StageProgress | null): boolean =>
  !stage ||
  isStageDone(stage) ||
  (stage.results.length === 0 && stage.guesses.length === 0);

function init(shared: SharedLink): GameState {
  const saved = loadState();
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
  const state: GameState = {
    saved: next,
    input: "",
    message:
      shared && "invalid" in shared ? "That stage link isn't valid" : null,
    rejections: 0,
  };
  // Reopening on a later day moves daily play on to that day's stage.
  if (next.mode === "daily") {
    const today = dayNumber();
    if (next.daily.stage?.number !== today) {
      const words = dailyWords(today);
      return {
        ...gameReducer(state, { type: "startDaily", day: today, words }),
        message: state.message,
      };
    }
  }
  return state;
}

type Panel = "help" | "stats" | null;

function App() {
  const [shared] = useState(readSharedLink);
  const [state, dispatch] = useReducer(gameReducer, shared, init);
  const [panel, setPanel] = useState<Panel>(null);
  const [pendingShare, setPendingShare] = useState(() =>
    shared &&
    "words" in shared &&
    !sameWords(shared.words, state.saved.stage!.words)
      ? shared.words
      : null,
  );
  const { saved, input, message, rejections } = state;
  const daily = saved.mode === "daily";
  // Read inline rather than via activeStage(): the React Compiler only treats
  // direct reads of reducer state as frozen, which the callbacks below rely on.
  const stage = (daily ? saved.daily.stage : saved.stage)!;
  const answer = stage.words[stage.cursor];
  const wordDone = isWordDone(stage);
  const stageDone = isStageDone(stage);

  const stageLabel = daily ? `Daily #${stage.number}` : `Stage ${stage.number}`;
  const streakTiles: [string, number][] = daily
    ? [
        ["Current streak", currentStreak(saved.daily, dayNumber())],
        ["Best streak", saved.daily.maxStreak],
      ]
    : [];

  useEffect(() => saveState(saved), [saved]);
  useEffect(clearSharedLink, []);

  function acceptShare() {
    if (!pendingShare) return;
    dispatch({ type: "newStage", words: pendingShare, served: saved.served });
    setPendingShare(null);
  }

  function switchMode(mode: Mode) {
    if (mode === "daily") {
      const day = dayNumber();
      dispatch({ type: "startDaily", day, words: dailyWords(day) });
    } else {
      dispatch({ type: "setMode", mode });
    }
  }

  const advance = useCallback(() => {
    if (!wordDone) return;
    if (!stageDone) {
      dispatch({ type: "nextWord" });
    } else if (daily) {
      dispatch({ type: "setMode", mode: "endless" });
    } else {
      dispatch({ type: "newStage", ...pickStage(saved.served) });
    }
  }, [wordDone, stageDone, daily, saved.served]);

  const submit = useCallback(() => {
    if (wordDone) advance();
    else dispatch({ type: "submit" });
  }, [wordDone, advance]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (document.querySelector("dialog[open]")) return;
      // Let a focused button handle its own Enter/Space activation.
      const target = e.target as HTMLElement | null;
      if (target?.closest("button") && (e.key === "Enter" || e.key === " ")) {
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        submit();
      } else if (e.key === "Backspace") {
        dispatch({ type: "backspace" });
      } else if (/^[a-z]$/i.test(e.key)) {
        dispatch({ type: "letter", letter: e.key.toLowerCase() });
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [submit]);

  const guessNumber = stage.guesses.length + 1;
  const multiplier = multiplierFor(stage.cursor);
  const worth = pointsFor(guessNumber, stage.cursor);
  const lastGuess = stage.guesses.at(-1);
  const result = wordDone ? stage.results[stage.cursor] : undefined;

  return (
    <div id="fivefold">
      <header className="app-header">
        <button
          type="button"
          className="text-button"
          onClick={() => setPanel("help")}
        >
          How to play
        </button>
        <h1>Fivefold</h1>
        <button
          type="button"
          className="text-button"
          onClick={() => setPanel("stats")}
        >
          Stats
        </button>
      </header>

      <main>
        <div className="mode-switch" role="group" aria-label="Game mode">
          {(["endless", "daily"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={saved.mode === mode}
              // Like the on-screen keys: a clicked mode button mustn't keep
              // focus, or Enter would press it again instead of submitting.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => switchMode(mode)}
            >
              {mode === "daily" ? "Daily" : "Endless"}
            </button>
          ))}
        </div>
        <div className="stage-heading">
          <p>
            {stageLabel} · Word {stage.cursor + 1} of {STAGE_LENGTH}
            {multiplier > 1 && (
              <span className="boss-badge">Boss ×{multiplier}</span>
            )}
          </p>
          <p>{stageScore(stage.results)} pts</p>
        </div>
        <StageTrack
          cursor={stage.cursor}
          results={stage.results}
          total={STAGE_LENGTH}
        />

        {stageDone && wordDone ? (
          <StageSummary
            title={`${stageLabel} complete`}
            shareWords={daily ? undefined : stage.words}
            results={stage.results}
          />
        ) : (
          <Board
            answer={answer}
            guesses={stage.guesses}
            input={input}
            done={wordDone}
            rejections={rejections}
          />
        )}

        <div className="status">
          {message && (
            <p className="message" aria-hidden="true">
              {message}
            </p>
          )}
          {/* A finished word's button must survive a message: once the word
              is done nothing clears it, and the summary hides the keyboard. */}
          {result ? (
            <WordComplete
              result={result}
              onNext={advance}
              nextLabel={
                !stageDone
                  ? "Next word"
                  : daily
                    ? "Back to endless"
                    : `Start stage ${stage.number + 1}`
              }
            />
          ) : message ? null : worth > 0 ? (
            <p className="muted">
              Guess {guessNumber} is worth {worth} points
            </p>
          ) : (
            <p className="muted">
              Free guesses: no points, no limit.{" "}
              <button
                type="button"
                className="text-button"
                onClick={() => dispatch({ type: "giveUp" })}
              >
                Reveal the word
              </button>
            </p>
          )}
        </div>

        <p className="visually-hidden" aria-live="polite">
          {message ??
            (result
              ? result.gaveUp
                ? `The word was ${result.answer}`
                : `Solved: ${result.answer}, ${result.points} points`
              : lastGuess
                ? describeGuess(lastGuess, answer)
                : "")}
        </p>

        {!(stageDone && wordDone) && (
          <Keyboard
            statuses={keyboardStatuses(stage.guesses, answer)}
            onLetter={(letter) => dispatch({ type: "letter", letter })}
            onEnter={submit}
            onBackspace={() => dispatch({ type: "backspace" })}
          />
        )}
      </main>

      <Modal
        open={panel === "help"}
        title="How to play"
        onClose={() => setPanel(null)}
      >
        <HowToPlay />
      </Modal>
      <Modal
        open={panel === "stats"}
        title={daily ? "Daily statistics" : "Endless statistics"}
        onClose={() => setPanel(null)}
      >
        <StatsPanel
          stats={daily ? saved.daily.stats : saved.stats}
          extraTiles={streakTiles}
        />
      </Modal>
      <Modal
        open={pendingShare !== null}
        title="Play a shared stage?"
        onClose={() => setPendingShare(null)}
      >
        <p>
          You're partway through stage {saved.stage!.number}. Playing the shared
          stage abandons it, though words you've already finished stay in your
          stats.
        </p>
        <div className="modal-actions">
          <button
            type="button"
            className="primary"
            onClick={acceptShare}
            data-autofocus
          >
            Play shared stage
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => setPendingShare(null)}
          >
            Keep my stage
          </button>
        </div>
      </Modal>
    </div>
  );
}

export default App;
