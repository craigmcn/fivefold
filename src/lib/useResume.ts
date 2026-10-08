import { useEffect } from "react";

// Fires when the page comes back into view: an installed PWA can sit in
// memory overnight, so this is where a new day is noticed. pageshow covers
// a page restored from the back/forward cache, which skips visibilitychange.
export function useResume(onResume: () => void) {
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") onResume();
    }
    function onPageShow(e: PageTransitionEvent) {
      if (e.persisted) onResume();
    }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [onResume]);
}
