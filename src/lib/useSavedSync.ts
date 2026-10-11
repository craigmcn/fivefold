import { useEffect } from "react";
import { dayNumber } from "./daily";
import type { PlayableSave } from "./game";
import { startSession } from "./session";
import { loadState, STORAGE_KEY } from "./storage";

// Keeps this tab in step with saves from other tabs (or the installed PWA
// beside a browser tab). The storage event only fires in the other tabs.
export function useSavedSync(onChange: (saved: PlayableSave) => void) {
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.storageArea !== window.localStorage) return;
      // A null key means storage was cleared, e.g. "Reset game data".
      if (e.key !== STORAGE_KEY && e.key !== null) return;
      // Through startSession, so a cleared save still gets a stage and a
      // stale daily rolls over, just as on a fresh load.
      onChange(startSession(loadState(), null, dayNumber()).state.saved);
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [onChange]);
}
