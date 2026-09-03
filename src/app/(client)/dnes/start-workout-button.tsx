"use client";

import { useState, useTransition } from "react";
import { CircleAlert, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startWorkoutAction } from "@/server/actions/workout";

export function StartWorkoutButton({ templateId }: { templateId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const start = () => {
    setError(null);
    startTransition(async () => {
      const result = await startWorkoutAction(templateId);
      if (result.ok) {
        const href = `/trenink/${result.data.workoutId}`;
        // Po založení tréninku vždy načteme jeho URL znovu ze serveru.
        // Zabrání to tomu, aby mobilní prohlížeč ukázal starý RSC stav
        // předchozího (už dokončeného) tréninku.
        window.location.assign(href);
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <>
      {error && (
        <p
          role="alert"
          className="mb-3 flex items-start gap-3 rounded-[var(--radius-button)] bg-danger px-4 py-3 text-lg font-semibold text-danger-foreground"
        >
          <CircleAlert aria-hidden="true" className="mt-0.5 size-6 shrink-0" />
          {error}
        </p>
      )}
      <Button type="button" size="xl" onClick={start} disabled={pending}>
        <PlayCircle aria-hidden="true" />
        {pending ? "Připravuji…" : "Začít trénink"}
      </Button>
    </>
  );
}
