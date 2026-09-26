# fivefold

A forgiving, endless Wordle-style game played in 10-word stages. React 19,
Vite 8, TypeScript 6 (strict). Built from the wordle-helper tooling base.

## Commands

```bash
yarn dev             # dev server (http://localhost:3170)
yarn build           # tsc -b + production build → dist/
yarn build:netlify   # dual build: netlify/ (root) + netlify/fivefold/ (GH Pages)
yarn test            # vitest watch mode
yarn test:coverage   # vitest run --coverage
yarn test:e2e        # Playwright headless E2E
yarn lint            # ESLint (src, e2e, scripts)
yarn format:check    # Prettier check
yarn words           # regenerate src/data/{answers,guesses}.ts from scripts/data/
```

## Architecture

- **Word data (generated):** `scripts/build-words.ts` builds
  `src/data/answers.ts` (answers grouped into easy/medium/hard/brutal tiers)
  and `src/data/guesses.ts` (~12.9k acceptable guesses). Never edit those
  by hand; edit the inputs in `scripts/data/` and run `yarn words`.
  - Difficulty is a weighted percentile blend: one-letter-neighbour count
    among answers (0.35, the `_IGHT`/`_OUND` trap), rare letters by
    positional + overall frequency (0.2), repeated letters (0.15), and
    unfamiliarity via wordfreq Zipf (0.3). Tier cut-offs at 40/70/90%.
  - Answers below Zipf 1.8 (e.g. "gayly", "wooer") are excluded as unfair
    but remain valid guesses.
  - `blocklist.txt` blocks guesses and answers; `answer-exclude.txt` only
    keeps words out of the answer pool (crude words, and ones NYT retired).
- **Stage shape:** `src/lib/stage.ts` `STAGE_TIERS` = easy, easy, medium,
  medium, **hard**, easy, medium, medium, medium, **brutal**. `pickStage` prefers unserved words; when a tier runs
  dry it clears only that tier's history (a new cycle) and returns the
  updated served list, which the `newStage` action stores. This keeps
  repeat-avoidance working forever and `served` bounded.
- **Scoring:** `src/lib/scoring.ts`: 60/50/40/30/20/10 for guesses 1–6,
  0 after (still solvable, unlimited guesses). Boss multipliers ×2 (word 5)
  and ×3 (word 10). +100 clean-stage bonus if all ten words solved in ≤6
  guesses with no reveals. "Reveal the word" appears only once guesses stop
  scoring.
- **Game state:** `src/lib/game.ts` is a pure reducer (letter / backspace /
  submit / giveUp / nextWord / newStage). `StageProgress.cursor` stays on a
  finished word until "next word" so its board remains visible; a word is
  done when `results.length > cursor`. Randomness (`pickStage`) happens in
  the App event handler, never in the reducer.
- **Persistence:** `src/lib/storage.ts`: one versioned `localStorage` key
  (`fivefold`, `version: 1`) holding stats, served answers and the stage in
  progress. Unknown versions or corrupt data reset to empty, and a
  malformed saved stage is dropped (stats kept) rather than crashing; bump `VERSION` and add a migration if the shape changes.
- **Evaluation:** `src/lib/evaluate.ts`: two-pass Wordle scoring so
  duplicate letters are handled correctly; `keyboardStatuses` keeps each
  letter's best status for the on-screen keyboard.
- **UI:** `src/App.tsx` wires the reducer to a window `keydown` listener
  (skipped while a `<dialog>` is open, and for Enter/Space on a focused
  button). Components in `src/components/`. On-screen keys
  `preventDefault` on mousedown so they never hold focus. The board scrolls
  internally past six rows (`#fivefold` is fixed at `100dvh`).
- **Theming:** `src/index.css` tokens with a `prefers-color-scheme: dark`
  override; no manual toggle. Palette is teal (correct) / coral (present) /
  slate (absent), deliberately not NYT's green/yellow, and a blue–orange
  pairing that stays distinct under common colour blindness. All tile
  text meets 4.5:1.

## Notes

- `src/test/setup.ts` shims `localStorage` because Node 25+ defines its own
  (undefined without `--localstorage-file`), which blocks happy-dom's. CI
  runs Node 24 per `.node-version`.
- E2E specs seed a known stage via `page.addInitScript({ content })` (a
  string, so DOM globals don't leak into the Node-typed e2e tsconfig).
- Word lists will drift as NYT adds answers; re-sync `answers.txt` from the
  wordle-helper repo's `words.ts` when needed.

## Open TODOs

Tracked as issues in the [fivefold GitHub Project](https://github.com/users/craigmcn/projects/20):
PWA/offline, hints, seeded/shareable stages, daily stage, share text,
achievements, streaks, hard mode, definitions.
