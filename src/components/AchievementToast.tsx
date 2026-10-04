import { useEffect } from "react";
import { achievementName } from "../lib/achievements";

interface AchievementToastProps {
  ids: readonly string[];
  onDone: () => void;
}

const SHOW_MS = 4000;

// Restarts its timer whenever more badges arrive, so a burst (e.g. a stage
// that earns two at once) stays up long enough to read.
export function AchievementToast({ ids, onDone }: AchievementToastProps) {
  useEffect(() => {
    if (ids.length === 0) return;
    const timer = window.setTimeout(onDone, SHOW_MS);
    return () => window.clearTimeout(timer);
  }, [ids, onDone]);

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
