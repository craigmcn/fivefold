import { useEffect } from "react";
import { achievementName } from "../lib/achievements";

interface AchievementToastProps {
  ids: readonly string[];
  onDone: () => void;
}

const SHOW_MS = 4000;

// Keyed on the count, not array identity: the timer restarts only when more
// badges arrive, so a stale toast can't linger across later words.
export function AchievementToast({ ids, onDone }: AchievementToastProps) {
  const count = ids.length;
  useEffect(() => {
    if (count === 0) return;
    const timer = window.setTimeout(onDone, SHOW_MS);
    return () => window.clearTimeout(timer);
  }, [count, onDone]);

  return (
    <div className="toast-region" role="status">
      {ids.length > 0 && (
        <p className="toast">
          <span aria-hidden="true">🏆 </span>
          Achievement unlocked: {ids.map(achievementName).join(", ")}
        </p>
      )}
    </div>
  );
}
