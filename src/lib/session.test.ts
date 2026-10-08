import { describe, expect, it } from "vitest";
import { seededState, STAGE_WORDS } from "../test/fixtures";
import { dailyWords } from "./daily";
import { isReplaceable, sameWords, startSession } from "./session";
import { emptyDaily, emptyState, type StageProgress } from "./storage";

const SHARED = [...STAGE_WORDS].reverse();
const TODAY = 5;

const withProgress = (stage: StageProgress, guesses: string[]) => ({
  ...stage,
  guesses,
});

describe("sameWords", () => {
  it("compares words in order", () => {
    expect(sameWords(["stand", "party"], ["stand", "party"])).toBe(true);
    expect(sameWords(["stand", "party"], ["party", "stand"])).toBe(false);
  });
});

describe("isReplaceable", () => {
  const stage = seededState().stage!;

  it("allows no stage, an untouched one or a finished one", () => {
    expect(isReplaceable(null)).toBe(true);
    expect(isReplaceable(stage)).toBe(true);
    const results = STAGE_WORDS.map((answer) => ({
      answer,
      guesses: 1,
      points: 60,
      gaveUp: false,
      hints: 0,
    }));
    expect(isReplaceable({ ...stage, results })).toBe(true);
  });

  it("protects a stage with guesses or finished words", () => {
    expect(isReplaceable(withProgress(stage, ["crane"]))).toBe(false);
    const result = {
      answer: "stand",
      guesses: 2,
      points: 50,
      gaveUp: false,
      hints: 0,
    };
    expect(isReplaceable({ ...stage, results: [result] })).toBe(false);
  });
});

describe("startSession", () => {
  it("picks a fresh stage when nothing is saved", () => {
    const { state, pendingShare } = startSession(emptyState(), null, TODAY);
    expect(state.saved.stage?.words).toHaveLength(10);
    expect(state.saved.stage?.number).toBe(1);
    expect(state.message).toBeNull();
    expect(pendingShare).toBeNull();
  });

  it("resumes a saved stage untouched", () => {
    const saved = seededState();
    const { state } = startSession(saved, null, TODAY);
    expect(state.saved).toBe(saved);
  });

  it("swaps a shared link in for an untouched stage without asking", () => {
    const { state, pendingShare } = startSession(
      seededState(),
      { words: SHARED },
      TODAY,
    );
    expect(state.saved.stage?.words).toEqual(SHARED);
    expect(state.saved.stage?.number).toBe(1);
    expect(pendingShare).toBeNull();
  });

  it("asks before a shared link replaces a stage in progress", () => {
    const saved = seededState();
    saved.stage = withProgress(saved.stage!, ["crane"]);
    const { state, pendingShare } = startSession(
      saved,
      { words: SHARED },
      TODAY,
    );
    expect(state.saved.stage?.guesses).toEqual(["crane"]);
    expect(pendingShare).toEqual(SHARED);
  });

  it("ignores a link to the stage already being played", () => {
    const saved = seededState();
    saved.stage = withProgress(saved.stage!, ["crane"]);
    const { state, pendingShare } = startSession(
      saved,
      { words: STAGE_WORDS },
      TODAY,
    );
    expect(state.saved.stage?.guesses).toEqual(["crane"]);
    expect(pendingShare).toBeNull();
  });

  it("switches to endless for a shared link", () => {
    const { state } = startSession(
      seededState({ mode: "daily" }),
      { words: SHARED },
      TODAY,
    );
    expect(state.saved.mode).toBe("endless");
    expect(state.saved.daily.stage).toBeNull();
  });

  it("reports an invalid link and keeps the saved stage", () => {
    const saved = seededState();
    const { state, pendingShare } = startSession(
      saved,
      { invalid: true },
      TODAY,
    );
    expect(state.message).toBe("That stage link isn't valid");
    expect(state.saved.stage).toBe(saved.stage);
    expect(pendingShare).toBeNull();
  });

  it("moves daily play on to today's stage", () => {
    const yesterday = { ...seededState().stage!, number: TODAY - 1 };
    const saved = seededState({
      mode: "daily",
      daily: { ...emptyDaily(), stage: yesterday },
    });
    const { state } = startSession(saved, { invalid: true }, TODAY);
    expect(state.saved.daily.stage?.number).toBe(TODAY);
    expect(state.saved.daily.stage?.words).toEqual(dailyWords(TODAY));
    // The link message outlives the daily switch.
    expect(state.message).toBe("That stage link isn't valid");
  });

  it("keeps an earlier day's daily that's under way", () => {
    const yesterday = {
      ...seededState().stage!,
      number: TODAY - 1,
      guesses: ["crane"],
    };
    const saved = seededState({
      mode: "daily",
      daily: { ...emptyDaily(), stage: yesterday },
    });
    const { state } = startSession(saved, null, TODAY);
    expect(state.saved.mode).toBe("daily");
    expect(state.saved.daily.stage).toBe(yesterday);
  });

  it("keeps today's daily stage", () => {
    const today = { ...seededState().stage!, number: TODAY };
    const saved = seededState({
      mode: "daily",
      daily: { ...emptyDaily(), stage: today },
    });
    expect(startSession(saved, null, TODAY).state.saved).toBe(saved);
  });
});
