import { useEffect, useState } from "react";

type Definitions = Readonly<Record<string, string>>;

// A separate chunk, so the first load doesn't pay for ~2.3k definitions; the
// service worker still precaches it, so it works offline once installed.
let loading: Promise<Definitions> | null = null;
const loadDefinitions = (): Promise<Definitions> =>
  (loading ??= import("../data/definitions").then((m) => m.DEFINITIONS));

// Undefined until the chunk arrives, and if it can't load (offline before the
// worker has cached it) the definition is simply left out.
export function useDefinition(word: string | undefined): string | undefined {
  const [definitions, setDefinitions] = useState<Definitions | null>(null);

  useEffect(() => {
    if (!word || definitions) return;
    let live = true;
    loadDefinitions().then(
      (loaded) => live && setDefinitions(loaded),
      () => {
        loading = null;
      },
    );
    return () => {
      live = false;
    };
  }, [word, definitions]);

  return word ? definitions?.[word] : undefined;
}
