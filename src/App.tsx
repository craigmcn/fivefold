import { useCallback, useReducer, useEffect, useState } from "react";
import "./App.css";
import { AchievementList } from "./components/AchievementList";
import { AchievementToast } from "./components/AchievementToast";
import { Board } from "./components/Board";
import { HintBar } from "./components/HintBar";
import { HowToPlay } from "./components/HowToPlay";
import { Keyboard } from "./components/Keyboard";
import { Modal } from "./components/Modal";
import { ModeBar } from "./components/ModeBar";
import { SharedStageDialog } from "./components/SharedStageDialog";
import { StaleDailyNotice } from "./components/StaleDailyNotice";
import { StageHeading } from "./components/StageHeading";
import { StageSummary } from "./components/StageSummary";
import { StageTrack } from "./components/StageTrack";
import { StatsPanel } from "./components/StatsPanel";
import { StatusLine } from "./components/StatusLine";
import { announcement } from "./lib/announce";
import { dailyWords, dayNumber } from "./lib/daily";
import { keyboardStatuses } from "./lib/evaluate";
import {
  gameReducer,
  hintSteps,
  isStageDone,
  isWordDone,
  type GameState,
} from "./lib/game";
import { nextEliminations, nextReveal, withHints } from "./lib/hints";
import { HINT_STEPS, pointsFor, STAGE_LENGTH, stageScore } from "./lib/scoring";
import { startSession, type Session } from "./lib/session";
import { clearSharedLink, readSharedLink, type SharedLink } from "./lib/share";
import { pickStage } from "./lib/stage";
import { currentStreak } from "./lib/stats";
import {
  loadState,
  saveState,
  type Mode,
  type SavedState,
} from "./lib/storage";
import { useGameKeys } from "./lib/useGameKeys";
import { useResume } from "./lib/useResume";
import { useSavedSync } from "./lib/useSavedSync";

type Panel = "help" | "stats" | null;

const loadSession = (shared: SharedLink): Session =>
  startSession(loadState(), shared, dayNumber());

function App() {
  const [shared] = useState(readSharedLink);
  const [session] = useState(() => loadSession(shared));
  const [state, dispatch] = useReducer(
    gameReducer,
    session,
    (s: Session): GameState => s.state,
  );
  const [pendingShare, setPendingShare] = useState(session.pendingShare);
  const [panel, setPanel] = useState<Panel>(null);
  // Re-read when the app comes back into view or switches to daily, so an
  // earlier day's daily can be spotted.
  const [today, setToday] = useState(dayNumber);
  const { saved, input, message, rejections, unlocked } = state;
  const daily = saved.mode === "daily";
  // Read inline rather than via activeStage(): the React Compiler only treats
  // direct reads of reducer state as frozen, which the callbacks below rely on.
  const stage = (daily ? saved.daily.stage : saved.stage)!;
  const answer = stage.words[stage.cursor];
  const wordDone = isWordDone(stage);
  const stageDone = isStageDone(stage);
  const stageLabel = daily ? `Daily #${stage.number}` : `Stage ${stage.number}`;
  const staleDaily = daily && stage.number !== today;

  useEffect(() => saveState(saved), [saved]);
  useEffect(clearSharedLink, []);
  useSavedSync(
    useCallback(
      (next: SavedState) => dispatch({ type: "replaceSaved", saved: next }),
      [],
    ),
  );

  function acceptShare() {
    if (!pendingShare) return;
    dispatch({ type: "newStage", words: pendingShare, served: saved.served });
    setPendingShare(null);
  }

  function switchMode(mode: Mode) {
    if (mode === "daily") {
      const day = dayNumber();
      setToday(day);
      dispatch({ type: "startDaily", day, words: dailyWords(day) });
    } else {
      dispatch({ type: "setMode", mode });
    }
  }

  // A new day while away: startDaily moves an untouched or finished daily on
  // to today's and keeps one that's under way.
  useResume(
    useCallback(() => {
      const day = dayNumber();
      setToday(day);
      if (daily) dispatch({ type: "startDaily", day, words: dailyWords(day) });
    }, [daily]),
  );

  const dismissUnlocked = useCallback(
    () => dispatch({ type: "dismissUnlocked" }),
    [],
  );
  const typeLetter = useCallback(
    (letter: string) => dispatch({ type: "letter", letter }),
    [],
  );
  const backspace = useCallback(() => dispatch({ type: "backspace" }), []);

  const advance = useCallback(() => {
    if (!wordDone) return;
    if (!stageDone) {
      dispatch({ type: "nextWord" });
    } else if (staleDaily) {
      dispatch({ type: "startDaily", day: today, words: dailyWords(today) });
    } else if (daily) {
      dispatch({ type: "setMode", mode: "endless" });
    } else {
      dispatch({ type: "newStage", ...pickStage(saved.served) });
    }
  }, [wordDone, stageDone, staleDaily, today, daily, saved.served]);

  const submit = useCallback(() => {
    if (wordDone) advance();
    else dispatch({ type: "submit" });
  }, [wordDone, advance]);

  useGameKeys({
    onLetter: typeLetter,
    onEnter: submit,
    onBackspace: backspace,
  });

  const guessNumber = stage.guesses.length + 1;
  const steps = hintSteps(stage);
  const worth = pointsFor(guessNumber + steps, stage.cursor, stage.hard);
  // What a hint would take off this guess's points, shown on its button.
  const hintCost = (extraSteps: number) => {
    const cost =
      worth -
      pointsFor(guessNumber + steps + extraSteps, stage.cursor, stage.hard);
    return cost > 0 ? `−${cost} pts` : "free";
  };
  const result = wordDone ? stage.results[stage.cursor] : undefined;

  return (
    <div id="fivefold">
      <AchievementToast ids={unlocked} onDone={dismissUnlocked} />
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
        <ModeBar
          mode={saved.mode}
          hardMode={saved.hardMode}
          stageHard={stage.hard}
          onMode={switchMode}
          onHardMode={(on) => dispatch({ type: "setHardMode", on })}
        />
        <StageHeading
          label={stageLabel}
          cursor={stage.cursor}
          hard={stage.hard}
          score={stageScore(stage.results, stage.hard)}
        />
        <StageTrack
          cursor={stage.cursor}
          results={stage.results}
          total={STAGE_LENGTH}
        />
        {staleDaily && !stageDone && (
          <StaleDailyNotice day={stage.number} today={today} />
        )}

        {stageDone && wordDone ? (
          <StageSummary
            label={stageLabel}
            shareWords={daily ? undefined : stage.words}
            results={stage.results}
            hard={stage.hard}
          />
        ) : (
          <Board
            answer={answer}
            guesses={stage.guesses}
            input={input}
            done={wordDone}
            rejections={rejections}
            revealed={stage.revealed}
          />
        )}

        <StatusLine
          message={message}
          result={result}
          guessNumber={guessNumber}
          worth={worth}
          nextLabel={
            !stageDone
              ? "Next word"
              : staleDaily
                ? "Play today's daily"
                : daily
                  ? "Back to endless"
                  : `Start stage ${stage.number + 1}`
          }
          onNext={advance}
          onGiveUp={() => dispatch({ type: "giveUp" })}
        />

        <HintBar
          canReveal={
            !wordDone &&
            nextReveal(answer, stage.guesses, stage.revealed) !== null
          }
          eliminateCount={
            wordDone
              ? 0
              : nextEliminations(answer, stage.guesses, stage.eliminated).length
          }
          revealCost={hintCost(HINT_STEPS.reveal)}
          eliminateCost={hintCost(HINT_STEPS.eliminate)}
          onReveal={() => dispatch({ type: "revealLetter" })}
          onEliminate={() => dispatch({ type: "eliminateLetters" })}
        />

        <p className="visually-hidden" aria-live="polite">
          {announcement({
            message,
            result,
            lastGuess: stage.guesses.at(-1),
            answer,
          })}
        </p>

        {!(stageDone && wordDone) && (
          <Keyboard
            statuses={withHints(
              keyboardStatuses(stage.guesses, answer),
              answer,
              stage.revealed,
              stage.eliminated,
            )}
            onLetter={typeLetter}
            onEnter={submit}
            onBackspace={backspace}
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
          dayStreak={
            daily
              ? {
                  current: currentStreak(saved.daily, dayNumber()),
                  best: saved.daily.maxStreak,
                }
              : undefined
          }
          unit={daily ? "daily" : "stage"}
        />
        <AchievementList earned={saved.achievements} />
      </Modal>
      <SharedStageDialog
        open={pendingShare !== null}
        stageNumber={saved.stage!.number}
        onAccept={acceptShare}
        onKeep={() => setPendingShare(null)}
      />
    </div>
  );
}

export default App;
