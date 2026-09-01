"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Plus } from "lucide-react";
import { createExerciseAction, type FormState } from "@/server/actions/trainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/shared/field";
import { EXERCISE_CATEGORIES } from "@/lib/enums";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="xl" disabled={pending}>
      <Plus aria-hidden="true" />
      {pending ? "Ukládám…" : "Uložit cvik"}
    </Button>
  );
}

export function NewExerciseForm({ navrat }: { navrat?: string }) {
  const [state, action] = useActionState(createExerciseAction, {} as FormState);

  return (
    <form action={action} className="flex flex-col gap-6">
      {navrat && <input type="hidden" name="navrat" value={navrat} />}
      {state.error && (
        <p role="alert" className="flex items-start gap-3 rounded-[var(--radius-button)] bg-danger px-4 py-3 text-lg font-semibold text-danger-foreground">
          <AlertCircle aria-hidden="true" className="mt-0.5 size-6 shrink-0" />
          {state.error}
        </p>
      )}

      <Field id="name" label="Název cviku" error={state.fieldErrors?.name}>
        <Input id="name" name="name" placeholder="Bench press" required />
      </Field>

      <Field id="category" label="Kategorie" error={state.fieldErrors?.category}>
        <select
          id="category"
          name="category"
          required
          defaultValue=""
          className="min-h-touch-lg w-full rounded-[var(--radius-button)] border-2 border-border bg-surface px-4 text-lg text-foreground focus:border-primary focus:outline-none"
        >
          <option value="" disabled>
            Vyberte kategorii
          </option>
          {EXERCISE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Field>

      <Field id="muscleGroup" label="Svalová skupina" error={state.fieldErrors?.muscleGroup}>
        <Input id="muscleGroup" name="muscleGroup" placeholder="Velký prsní sval" required />
      </Field>

      <Field id="trackingType" label="Jak se výkon měří">
        <select
          id="trackingType"
          name="trackingType"
          defaultValue="WEIGHT_REPS"
          className="min-h-touch-lg w-full rounded-[var(--radius-button)] border-2 border-border bg-surface px-4 text-lg text-foreground focus:border-primary focus:outline-none"
        >
          <option value="WEIGHT_REPS">Váha a opakování</option>
          <option value="TIME">Čas v sekundách</option>
        </select>
      </Field>

      <Field id="equipment" label="Vybavení" hint="Nepovinné.">
        <Input id="equipment" name="equipment" placeholder="Velká činka" />
      </Field>

      <Field id="instructions" label="Instrukce k provedení" hint="Nepovinné. Klient je uvidí při tréninku.">
        <textarea
          id="instructions"
          name="instructions"
          rows={5}
          placeholder="Popište správné provedení cviku…"
          className="w-full rounded-[var(--radius-button)] border-2 border-border bg-surface p-4 text-lg text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
        <Field id="mediaKind" label="Typ techniky">
          <select id="mediaKind" name="mediaKind" defaultValue="IMAGE" className="min-h-touch-lg w-full rounded-[var(--radius-button)] border-2 border-border bg-surface px-4 text-base text-foreground focus:border-primary focus:outline-none">
            <option value="IMAGE">Fotka</option>
            <option value="VIDEO">Video</option>
          </select>
        </Field>
        <Field id="mediaUrl" label="Odkaz na fotku nebo video" hint="Nepovinné. Zobrazí se klientovi ve spuštěném tréninku.">
          <Input id="mediaUrl" name="mediaUrl" type="url" placeholder="https://…" />
        </Field>
      </div>

      <Submit />
    </form>
  );
}
