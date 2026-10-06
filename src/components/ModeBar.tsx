import type { Mode } from "../lib/storage";

interface ModeBarProps {
  mode: Mode;
  hardMode: boolean;
  // Whether the stage on screen is hard; differs from hardMode while a
  // change waits for the next stage.
  stageHard: boolean;
  onMode: (mode: Mode) => void;
  onHardMode: (on: boolean) => void;
}

export function ModeBar({
  mode,
  hardMode,
  stageHard,
  onMode,
  onHardMode,
}: ModeBarProps) {
  return (
    <>
      <div className="mode-switch" role="group" aria-label="Game mode">
        {(["endless", "daily"] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={mode === option}
            // Like the on-screen keys: a clicked mode button mustn't keep
            // focus, or Enter would press it again instead of submitting.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onMode(option)}
          >
            {option === "daily" ? "Daily" : "Endless"}
          </button>
        ))}
      </div>
      <div className="hard-toggle">
        <label>
          <input
            type="checkbox"
            role="switch"
            checked={hardMode}
            onChange={(e) => onHardMode(e.target.checked)}
          />{" "}
          Hard mode
        </label>
        {hardMode !== stageHard && (
          <span className="muted"> · from your next stage</span>
        )}
      </div>
    </>
  );
}
