"use client";

import { useEffect, useRef, useState } from "react";
import { formatCountdown } from "@/lib/format";

/**
 * Tenká oddělovací čárka mezi sériemi s délkou pauzy uprostřed —
 * stejný vzor jako v Strong/Hevy. V klidu jen ukazuje nastavenou délku,
 * při aktivní pauze odpočítává.
 */
export function RestSeparator({
  seconds,
  active,
  onSkip,
}: {
  seconds: number;
  active: boolean;
  onSkip: () => void;
}) {
  const endsAtRef = useRef(0);
  const vibratedRef = useRef(false);
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (!active) return;

    endsAtRef.current = Date.now() + seconds * 1000;
    vibratedRef.current = false;

    const tick = () => {
      const left = Math.ceil((endsAtRef.current - Date.now()) / 1000);
      setRemaining(Math.max(0, left));
      if (left <= 0 && !vibratedRef.current) {
        vibratedRef.current = true;
        vibrate();
      }
    };

    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [active, seconds]);

  if (!active) {
    return (
      <div className="flex items-center gap-3 py-1.5" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        <span className="text-sm text-muted-foreground">
          Pauza {formatCountdown(seconds)}
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>
    );
  }

  const done = remaining <= 0;

  return (
    <button
      type="button"
      onClick={onSkip}
      className="flex w-full items-center gap-3 py-1.5"
      aria-label={
        done
          ? "Pauza skončila — klepnutím zavřít"
          : `Pauza — zbývá ${formatCountdown(remaining)}. Klepnutím přeskočit.`
      }
    >
      <span className="h-px flex-1 bg-primary" />
      <span
        role="status"
        aria-live="polite"
        className={
          done
            ? "tabular text-base font-bold text-success"
            : "tabular text-base font-bold text-primary-strong"
        }
      >
        {done ? "Pauza skončila" : formatCountdown(remaining)}
      </span>
      <span className="h-px flex-1 bg-primary" />
    </button>
  );
}

function vibrate() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate?.([200, 100, 200]);
  }
}
