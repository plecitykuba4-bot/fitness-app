"use client";

import { useEffect, useState } from "react";

/**
 * Uplynulé sekundy od `startedAt`.
 *
 * Čas se POKAŽDÉ dopočítává z absolutního `startedAt`, nikdy se nesčítají
 * tiky intervalu. Díky tomu ukazuje správnou hodnotu i po reloadu stránky,
 * po uspání telefonu nebo po přepnutí do jiné aplikace — což jsou přesně
 * situace, které při hodinovém tréninku ve fitku nastanou.
 */
export function useElapsedSeconds(startedAt: Date | string): number {
  const startMs =
    typeof startedAt === "string"
      ? new Date(startedAt).getTime()
      : startedAt.getTime();

  const [elapsed, setElapsed] = useState(() =>
    Math.max(0, Math.floor((Date.now() - startMs) / 1000)),
  );

  useEffect(() => {
    const tick = () =>
      setElapsed(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));

    tick();
    const id = setInterval(tick, 1000);

    // Po návratu z pozadí prohlížeč intervaly škrtí — přepočítáme ihned.
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [startMs]);

  return elapsed;
}
