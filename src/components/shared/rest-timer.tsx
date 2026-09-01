"use client";

import { useEffect, useRef, useState } from "react";
import { Timer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCountdown } from "@/lib/format";

/**
 * Odpočet pauzy mezi sériemi.
 * Stejně jako hlavní časovač počítá z absolutního času konce, ne z tiků —
 * uspaný telefon nesmí pauzu zastavit.
 */
export function RestTimer({
  seconds,
  onDone,
  onCancel,
}: {
  seconds: number;
  onDone?: () => void;
  onCancel: () => void;
}) {
  // Čas konce se nastavuje až v efektu — volat Date.now() při renderu je
  // nečistá operace a při opakovaném renderu by dala nestabilní výsledek.
  const endsAtRef = useRef(0);
  const [remaining, setRemaining] = useState(seconds);
  const [finished, setFinished] = useState(false);
  const doneRef = useRef(false);

  useEffect(() => {
    endsAtRef.current = Date.now() + seconds * 1000;

    const tick = () => {
      const left = Math.ceil((endsAtRef.current - Date.now()) / 1000);
      setRemaining(Math.max(0, left));

      if (left <= 0 && !doneRef.current) {
        doneRef.current = true;
        setFinished(true);
        vibrate();
        onDone?.();
      }
    };

    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [onDone, seconds]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-[var(--radius-card)] border-2 border-primary bg-surface p-5 text-center"
    >
      {finished ? (
        <>
          <p className="text-2xl font-bold text-success">PAUZA SKONČILA</p>
          <p className="mt-1 text-lg text-muted-foreground">
            Můžete pokračovat další sérií.
          </p>
        </>
      ) : (
        <>
          <p className="flex items-center justify-center gap-2 text-lg font-semibold text-muted-foreground">
            <Timer aria-hidden="true" className="size-5" />
            Pauza
          </p>
          <p className="tabular mt-1 text-6xl font-bold">
            {formatCountdown(remaining)}
          </p>
        </>
      )}

      <Button
        type="button"
        variant="secondary"
        size="lg"
        block
        className="mt-4"
        onClick={onCancel}
      >
        <X aria-hidden="true" />
        {finished ? "Zavřít" : "Přeskočit pauzu"}
      </Button>
    </div>
  );
}

/** Krátká vibrace na konci pauzy — ve fitku je hluk a displej se nesleduje. */
function vibrate() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate?.([200, 100, 200]);
  }
}
