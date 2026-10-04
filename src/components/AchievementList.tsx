import { ACHIEVEMENTS } from "../lib/achievements";

export function AchievementList({ earned }: { earned: readonly string[] }) {
  const have = new Set(earned);
  const count = ACHIEVEMENTS.filter((a) => have.has(a.id)).length;
  return (
    <>
      <h3>
        Achievements ({count} of {ACHIEVEMENTS.length})
      </h3>
      <ul className="achievements">
        {ACHIEVEMENTS.map((a) => {
          const got = have.has(a.id);
          return (
            <li key={a.id} className={got ? "earned" : undefined}>
              <span className="achievement-mark" aria-hidden="true">
                {got ? "🏆" : "○"}
              </span>
              <span>
                <strong>{a.name}</strong>
                <span className="visually-hidden">
                  {got ? ", earned" : ", not yet earned"}
                </span>
                <br />
                <span className="muted">{a.description}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </>
  );
}
