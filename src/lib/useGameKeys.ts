import { useEffect } from "react";

interface GameKeys {
  onLetter: (letter: string) => void;
  onEnter: () => void;
  onBackspace: () => void;
}

// Physical keyboard input for the whole window. Skipped while a dialog is
// open, and for Enter/Space on a focused button, which handles its own
// activation.
export function useGameKeys({ onLetter, onEnter, onBackspace }: GameKeys) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (document.querySelector("dialog[open]")) return;
      const onButton =
        e.target instanceof Element && e.target.closest("button");
      if (onButton && (e.key === "Enter" || e.key === " ")) {
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        onEnter();
      } else if (e.key === "Backspace") {
        onBackspace();
      } else if (/^[a-z]$/i.test(e.key)) {
        onLetter(e.key.toLowerCase());
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onLetter, onEnter, onBackspace]);
}
