import {
  BOSS_MULTIPLIERS,
  CLEAN_STAGE_BONUS,
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
        Words come in stages of {STAGE_LENGTH}. Solving in 1 guess scores 60
        points, dropping by 10 each guess down to 10 points on guess{" "}
        {SCORED_GUESSES}.
      </p>
      <p>
        There's no guess limit: after {SCORED_GUESSES} you can keep going for no
        points, or reveal the word and move on.
      </p>
      <p>
        Boss words are harder and worth more: {bosses}. Solve every word in a
        stage within {SCORED_GUESSES} guesses for a {CLEAN_STAGE_BONUS}-point
        bonus.
      </p>
    </div>
  );
}
