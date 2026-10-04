import { ELIMINATE_COUNT } from "../lib/hints";
import {
  BOSS_MULTIPLIERS,
  CLEAN_STAGE_BONUS,
  HARD_MULTIPLIER,
  HINT_STEPS,
  POINTS_BY_GUESS,
  SCORED_GUESSES,
  STAGE_LENGTH,
} from "../lib/scoring";

export function HowToPlay() {
  const bosses = Object.entries(BOSS_MULTIPLIERS)
    .map(([i, m]) => `word ${Number(i) + 1} (×${m})`)
    .join(" and ");
  return (
    <div className="how-to-play">
      <p>Guess the five-letter word. After each guess, the tiles show:</p>
      <ul>
        <li>
          <span className="tile tile--correct tile--small">a</span> right
          letter, right spot
        </li>
        <li>
          <span className="tile tile--present tile--small">b</span> in the word,
          wrong spot
        </li>
        <li>
          <span className="tile tile--absent tile--small">c</span> not in the
          word
        </li>
      </ul>
      <p>
        Words come in stages of {STAGE_LENGTH}. Solving in 1 guess scores{" "}
        {POINTS_BY_GUESS[0]} points, dropping to {POINTS_BY_GUESS.at(-1)} points
        on guess {SCORED_GUESSES}.
      </p>
      <p>
        There's no guess limit: after {SCORED_GUESSES} you can keep going for no
        points, or reveal the word and move on.
      </p>
      <p>
        Stuck? Hints cost points as if you'd taken extra guesses, without using
        a row: revealing a letter counts as {HINT_STEPS.reveal} guesses, ruling
        out {ELIMINATE_COUNT} letters as {HINT_STEPS.eliminate}. Once guesses
        stop scoring, hints are free.
      </p>
      <p>
        Boss words are harder and worth more: {bosses}. Solve every word in a
        stage within {SCORED_GUESSES} guesses, without hints, for a{" "}
        {CLEAN_STAGE_BONUS}-point bonus.
      </p>
      <p>
        Hard mode: every clue you&apos;ve found must be used in later guesses
        (green letters stay put, yellow letters and revealed hints must appear),
        for {HARD_MULTIPLIER}× points. It applies from your next stage, or
        straight away if you haven&apos;t started this one.
      </p>
      <p>
        Achievements for milestones and great solves are listed under Stats.
      </p>
      <p>
        Daily mode gives everyone the same stage each day, with its own stats
        and a streak for every day in a row you finish it.
      </p>
      <p>
        After any stage you can share a spoiler-free summary of your results.
        Finished endless stages also come with a link: send it to a friend and
        they play the same {STAGE_LENGTH} words.
      </p>
      <p className="credits">
        Definitions are shortened from{" "}
        <a href="licenses/wordnet.txt">WordNet 3.1</a> (© Princeton University)
        and <a href="https://en.wiktionary.org/">Wiktionary</a> (
        <a href="https://creativecommons.org/licenses/by-sa/4.0/">
          CC BY-SA 4.0
        </a>
        ), with some written for Fivefold.
      </p>
    </div>
  );
}
