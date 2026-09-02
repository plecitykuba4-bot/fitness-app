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
  onChangeSeconds,
}: {
  seconds: number;
  active: boolean;
  onSkip: () => void;
  onChangeSeconds: (seconds: number) => void;
}) {
  const endsAtRef = useRef(0);
  const vibratedRef = useRef(false);
  const [remaining, setRemaining] = useState(seconds);
  const [editing, setEditing] = useState(false);
  const [draftSeconds, setDraftSeconds] = useState(String(seconds));

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
      <div className="flex items-center gap-3 py-1.5">
        <span className="h-px flex-1 bg-sky-200" />
        {editing ? (
          <input
            autoFocus
            type="number"
            inputMode="numeric"
            min={0}
            max={3600}
            value={draftSeconds}
            aria-label="Délka pauzy v sekundách"
            onChange={(event) => setDraftSeconds(event.target.value)}
            onBlur={() => {
              const next = Math.max(0, Math.min(3600, Math.round(Number(draftSeconds) || 0)));
              onChangeSeconds(next);
              setDraftSeconds(String(next));
              setEditing(false);
            }}
            onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
            className="w-16 rounded border border-primary bg-surface-muted px-1 py-0.5 text-center text-sm font-semibold focus:outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setDraftSeconds(String(seconds));
              setEditing(true);
            }}
            className="text-sm font-semibold text-sky-500 underline-offset-2 hover:text-sky-600 hover:underline"
            aria-label={`Pauza ${formatCountdown(seconds)}. Klepnutím upravit.`}
          >
            Pauza {formatCountdown(seconds)}
          </button>
        )}
        <span className="h-px flex-1 bg-sky-200" />
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
