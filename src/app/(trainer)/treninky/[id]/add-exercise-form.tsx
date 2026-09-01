"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Plus, AlertCircle } from "lucide-react";
import {
  addTemplateExerciseAction,
  type FormState,
} from "@/server/actions/template";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/shared/field";
import { SearchableSelect } from "@/components/shared/searchable-select";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" block disabled={pending}>
      <Plus aria-hidden="true" />
      {pending ? "Přidávám…" : "Přidat cvik do tréninku"}
    </Button>
  );
}

export function AddExerciseForm({
  templateId,
  exercises,
}: {
  templateId: string;
  exercises: { id: string; name: string; category: string; trackingType: string }[];
}) {
  const categories = [...new Set(exercises.map((exercise) => exercise.category))];
  const [selectedExerciseId, setSelectedExerciseId] = useState("");
  const isTimed =
    exercises.find((exercise) => exercise.id === selectedExerciseId)
      ?.trackingType === "TIME";
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useActionState(
    async (prev: FormState, formData: FormData) => {
      const result = await addTemplateExerciseAction(prev, formData);
      // Po úspěchu vyprázdni formulář, ať jde rovnou přidat další cvik.
      if (!result.error && !result.fieldErrors) formRef.current?.reset();
      return result;
    },
    {} as FormState,
  );

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-5">
      <input type="hidden" name="templateId" value={templateId} />

      {state.error && (
        <p role="alert" className="flex items-start gap-3 rounded-[var(--radius-button)] bg-danger px-4 py-3 text-lg font-semibold text-danger-foreground">
          <AlertCircle aria-hidden="true" className="mt-0.5 size-6 shrink-0" />
          {state.error}
        </p>
      )}

      <Field id="exerciseId" label="Cvik" error={state.fieldErrors?.exerciseId}>
        <div className="flex flex-col gap-3">
          <SearchableSelect
            id="exerciseId"
            name="exerciseId"
            placeholder="Napište název cviku…"
            emptyLabel="Žádný cvik neodpovídá"
            categories={categories}
            onValueChange={setSelectedExerciseId}
            options={exercises.map((exercise) => ({
              value: exercise.id,
              label: exercise.name,
              description: exercise.category,
              keywords: exercise.category,
              category: exercise.category,
            }))}
          />
          <Button asChild type="button" variant="secondary" block>
            <Link
              href={`/cviky/novy?navrat=${encodeURIComponent(`/treninky/${templateId}`)}`}
            >
              <Plus aria-hidden="true" />
              Cvik v seznamu není? Vytvořit nový
            </Link>
          </Button>
        </div>
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="sets" label="Počet sérií" error={state.fieldErrors?.sets}>
          <Input id="sets" name="sets" type="number" inputMode="numeric" min={1} max={20} defaultValue={3} required />
        </Field>
        <Field
          id="reps"
          label={isTimed ? "Výdrž (sekundy)" : "Počet opakování"}
          error={state.fieldErrors?.reps}
        >
          <Input
            key={isTimed ? "time" : "reps"}
            id="reps"
            name="reps"
            type="number"
            inputMode="numeric"
            min={1}
            max={isTimed ? 3600 : 100}
            step={isTimed ? 5 : 1}
            defaultValue={isTimed ? 90 : 10}
            required
          />
        </Field>
        {isTimed ? (
          <input type="hidden" name="targetWeight" value="" />
        ) : (
          <Field id="targetWeight" label="Cílová váha (kg)" hint="Nepovinné.">
            <Input id="targetWeight" name="targetWeight" type="number" inputMode="decimal" step={2.5} min={0} max={500} placeholder="80" />
          </Field>
        )}
        <Field id="restSeconds" label="Pauza (sekundy)">
          <Input id="restSeconds" name="restSeconds" type="number" inputMode="numeric" min={0} max={600} step={15} defaultValue={90} required />
        </Field>
      </div>

      <Field id="note" label="Poznámka ke cviku" hint="Nepovinné. Klient ji uvidí při tréninku.">
        <Input id="note" name="note" placeholder="Poslední série do selhání." />
      </Field>

      <Submit />
    </form>
  );
}
