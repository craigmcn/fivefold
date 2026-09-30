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
import { loadState, saveState, type StageProgress } from "./lib/storage";

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
  if (words && isReplaceable(saved.stage)) {
    next = newStage(saved, { words, served: saved.served });
  } else if (!saved.stage) {
    next = newStage(saved, pickStage(saved.served));
  }
  return {
    saved: next,
    input: "",
    message:
      shared && "invalid" in shared ? "That stage link isn't valid" : null,
    rejections: 0,
  };
}

const sameWords = (a: readonly string[], b: readonly string[]) =>
  a.join() === b.join();

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
  const stage = saved.stage!;
  const answer = stage.words[stage.cursor];
  const wordDone = isWordDone(stage);
  const stageDone = isStageDone(stage);

  useEffect(() => saveState(saved), [saved]);
  useEffect(clearSharedLink, []);

  function acceptShare() {
    if (!pendingShare) return;
    dispatch({ type: "newStage", words: pendingShare, served: saved.served });
    setPendingShare(null);
  }

  const advance = useCallback(() => {
    if (!wordDone) return;
    if (stageDone) {
      dispatch({ type: "newStage", ...pickStage(saved.served) });
    } else {
      dispatch({ type: "nextWord" });
    }
  }, [wordDone, stageDone, saved.served]);

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
        <div className="stage-heading">
          <p>
            Stage {stage.number} · Word {stage.cursor + 1} of {STAGE_LENGTH}
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
            number={stage.number}
            words={stage.words}
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
          {message ? (
            <p className="message" aria-hidden="true">
              {message}
            </p>
          ) : result ? (
            <WordComplete
              result={result}
              onNext={advance}
              nextLabel={
                stageDone ? `Start stage ${stage.number + 1}` : "Next word"
              }
            />
          ) : worth > 0 ? (
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
        title="Statistics"
        onClose={() => setPanel(null)}
      >
        <StatsPanel stats={saved.stats} />
      </Modal>
      <Modal
        open={pendingShare !== null}
        title="Play a shared stage?"
        onClose={() => setPendingShare(null)}
      >
        <p>
          You're partway through stage {stage.number}. Playing the shared stage
          abandons it, though words you've already finished stay in your stats.
        </p>
        <div className="modal-actions">
          <button type="button" className="primary" onClick={acceptShare}>
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
