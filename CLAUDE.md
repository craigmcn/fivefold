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
- **Shared stages:** `src/lib/share.ts` encodes a stage's ten words as
  base36 mixed-radix indices into the alphabetised answer list, prefixed with
  a 2-char checksum of that list (`?stage=<code>`, ~24 chars). Words are
  encoded, not a PRNG seed, because endless stages depend on `served`
  history, so a seed alone can't reproduce them. Regenerating the answer list
  changes the checksum and invalidates old links on purpose. App reads the
  param during init and strips it in an effect (StrictMode-safe). A link
  replaces an untouched or finished stage silently and asks before
  abandoning one in progress. A replacement keeps the stage number, and its
  words count toward `served` like any other.
- **Hints:** `src/lib/hints.ts` (pure, deterministic). Reveal a letter =
  leftmost position not known from guesses or earlier reveals, never the
  last unknown one. Rule out = up to 3 absent, unguessed letters in
  answer-frequency order. Cost is in points-table steps (`HINT_STEPS`:
  reveal 2, rule out 1): a word scores `pointsFor(guesses + hintSteps)`, so
  hints are free once guesses stop scoring. Any hint voids the clean bonus.
  Per-word hint state (`revealed`, `eliminated`, `eliminations`) lives on
  `StageProgress` and resets on `nextWord`; `hintsFor` tags it with its
  cursor so `loadStage` clears hints a pre-hints build carried forward; `WordResult.hints` and
  `Stats.hintsUsed` record usage. Hint buttons `preventDefault` on mousedown
  like the keys.
- **Streaks:** `Stats` (per mode) has `cleanStreak`/`maxCleanStreak`
  (updated in `recordStage`) and `wordStreak`/`maxWordStreak` (words solved
  within 6 guesses, hints allowed, a reveal or unscored solve breaks it;
  updated in `recordWord`). Additive, defaulted by `loadStats`, no version
  bump. Stats shows them in a Streaks table, with daily's consecutive-days
  streak as its first row.
- **Share text:** `src/lib/shareText.ts` builds a spoiler-free summary
  (title, score, one row per word: ⬛ per missed guess then 🟦 scored /
  🟧 unscored / ❌ revealed, points, boss ×N, 💡 per hint, clean bonus line) ending in
  `stageLink` for endless or `appLink` for daily. Blue/orange stand in for
  teal/coral (no teal emoji). `StageSummary`'s Share results button uses
  `navigator.share` where present (AbortError = dismissed, silent), else the
  clipboard.
- **Daily stage:** `src/lib/daily.ts`. `dayNumber()` counts local calendar
  days from 2026-10-01 (Daily #1, also the floor for clocks set earlier)
  via `Date.UTC`, so DST can't skew it;
  `dailyWords(day)` runs `pickStage([], mulberry32(seed))`, ignoring
  `served`, so everyone gets the same words. The stage's `number` is the day
  number. Endless and daily each keep their own stage and `Stats`; both feed
  `served`. Opening the app in daily mode on a later day starts that day's
  stage; a finished daily shows its summary (no share link, which would
  spoil a friend's daily) until then. Streak = consecutive days with a
  completed daily (`recordDailyStreak`); `currentStreak` reads it as 0 once
  a day is missed. Shared links always switch to endless.
- **Game state:** `src/lib/game.ts` is a pure reducer (letter / backspace /
  submit / giveUp / nextWord / newStage). Actions act on the active mode's stage
  (`activeStage`); `setMode`/`startDaily` switch modes. App reads the active
  stage inline, not via `activeStage()`, because the React Compiler lint only
  treats direct reads of reducer state as frozen. `StageProgress.cursor` stays on a
  finished word until "next word" so its board remains visible; a word is
  done when `results.length > cursor`. Randomness (`pickStage`) happens in
  the App event handler, never in the reducer.
- **Persistence:** `src/lib/storage.ts`: one versioned `localStorage` key
  (`fivefold`, `version: 2`) holding the mode, endless stats, served
  answers and stage, and a `daily` block (stage, stats, streak). Version 1
  saves load as endless play with empty daily state. Unknown versions or
  corrupt data reset to empty, and a malformed saved stage or daily field is
  dropped (the rest kept) rather than crashing; bump `VERSION` and add a
  migration if the shape changes incompatibly. Purely additive fields (the
  hint fields) are defaulted in `loadStage` without a bump instead, so older
  cached builds can still read new saves.
- **Evaluation:** `src/lib/evaluate.ts`: two-pass Wordle scoring so
  duplicate letters are handled correctly; `keyboardStatuses` keeps each
  letter's best status for the on-screen keyboard.
- **UI:** `src/App.tsx` wires the reducer to a window `keydown` listener
  (skipped while a `<dialog>` is open, and for Enter/Space on a focused
  button). Components in `src/components/`. On-screen keys and the
  Endless/Daily switch `preventDefault` on mousedown so they never hold
  focus (else Enter re-presses them). `Modal` focuses a `[data-autofocus]`
  child after `showModal()`, since React's `autoFocus` fires while the
  dialog is still closed. The board scrolls
  internally past six rows (`#fivefold` is fixed at `100dvh`).
- **Theming:** `src/index.css` tokens with a `prefers-color-scheme: dark`
  override; no manual toggle. Palette is teal (correct) / coral (present) /
  slate (absent), deliberately not NYT's green/yellow, and a blue–orange
  pairing that stays distinct under common colour blindness. All tile
  text meets 4.5:1.
- **PWA:** `vite-plugin-pwa` (`generateSW`, `autoUpdate`) in
  `vite.config.ts` precaches the whole build, word lists included (they're
  bundled JS), so play is fully offline once the SW has installed; there are
  no CDN dependencies to runtime-cache. `navigateFallback: null` stops the
  Netlify root SW answering `/fivefold/` navigations with its own
  `index.html`. `build:netlify` runs two separate `vite build`s, so each
  output gets its own SW (no copy step, unlike sudoku). Manifest
  `start_url`/`scope` are `.` so one manifest works at both bases. Icons in
  `public/icons/` are rendered from `icon.svg` with `rsvg-convert`
  (maskable/apple-touch variants use a full-bleed square); `favicon.ico`
  via ImageMagick.

## Notes

- `src/test/setup.ts` shims `localStorage` because Node 25+ defines its own
  (undefined without `--localstorage-file`), which blocks happy-dom's. CI
  runs Node 24 per `.node-version`.
- E2E specs seed a known stage via `seed()` in `e2e/seed.ts`
  (`page.addInitScript({ content })`, a string, so DOM globals don't leak
  into the Node-typed e2e tsconfig). The seed is still a version 1 save, so
  it also exercises the v1→v2 migration. The e2e tsconfig can't import
  `src/` (nodenext resolution), so the daily spec pins the date with
  `page.clock.setFixedTime` and reads the day's words from localStorage.
- `*.pwa.spec.ts` run in a separate `pwa` Playwright project against
  `vite preview` of a production build on port 3171 (the SW doesn't exist in
  dev). Wait for `navigator.serviceWorker.controller` before going offline:
  a first load is never served by its own installing worker.
- Deployed to Netlify at https://endearing-blancmange-0cb3b7.netlify.app/
  (`yarn build:netlify`, publish dir `netlify`). No GitHub Pages yet.
- Word lists will drift as NYT adds answers; re-sync `answers.txt` from the
  wordle-helper repo's `words.ts` when needed.

## Open TODOs

Tracked as issues in the [fivefold GitHub Project](https://github.com/users/craigmcn/projects/20):
achievements, hard mode, definitions.
