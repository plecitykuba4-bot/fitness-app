"use client";

import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, Trash2 } from "lucide-react";
import {
  updateExerciseAction,
  deleteExerciseAction,
  type FormState,
} from "@/server/actions/trainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/shared/field";
import { EXERCISE_CATEGORIES } from "@/lib/enums";
import { pluralWithCount } from "@/lib/format";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="xl" disabled={pending}>
      <Check aria-hidden="true" />
      {pending ? "Ukládám…" : "Uložit změny"}
    </Button>
  );
}

export function EditExerciseForm({
  exercise,
  usedInTemplates,
  usedInWorkouts,
}: {
  exercise: {
    id: string;
    name: string;
    category: string;
    muscleGroup: string;
    equipment: string | null;
    instructions: string | null;
    trackingType: string;
    media: { kind: string; storageKey: string }[];
  };
  usedInTemplates: number;
  usedInWorkouts: number;
}) {
  const router = useRouter();
  const [state, action] = useActionState(updateExerciseAction, {} as FormState);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selectClass =
    "min-h-touch-lg w-full rounded-[var(--radius-button)] border-2 border-border bg-surface px-4 text-lg text-foreground focus:border-primary focus:outline-none";

  const remove = () => {
    if (!confirm(`Opravdu smazat cvik ${exercise.name}?`)) return;
    setDeleteError(null);
    startTransition(async () => {
      const result = await deleteExerciseAction(exercise.id);
      if (result.ok) {
        router.push("/cviky");
      } else {
        setDeleteError(result.error);
      }
    });
  };

  return (
    <div className="flex flex-col gap-8">
      <form action={action} className="flex flex-col gap-6">
        <input type="hidden" name="id" value={exercise.id} />

        {state.error && (
          <p role="alert" className="flex items-start gap-3 rounded-[var(--radius-button)] bg-danger px-4 py-3 text-lg font-semibold text-danger-foreground">
            <AlertCircle aria-hidden="true" className="mt-0.5 size-6 shrink-0" />
            {state.error}
          </p>
        )}

        <Field id="name" label="Název cviku" error={state.fieldErrors?.name}>
          <Input id="name" name="name" defaultValue={exercise.name} required />
        </Field>

        <Field id="category" label="Kategorie" error={state.fieldErrors?.category}>
          <select
            id="category"
            name="category"
            required
            defaultValue={exercise.category}
            className={selectClass}
          >
            {EXERCISE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>

        <Field
          id="muscleGroup"
          label="Svalová skupina"
          error={state.fieldErrors?.muscleGroup}
        >
          <Input
            id="muscleGroup"
            name="muscleGroup"
            defaultValue={exercise.muscleGroup}
            required
          />
        </Field>

        <Field id="equipment" label="Vybavení" hint="Nepovinné.">
          <Input
            id="equipment"
            name="equipment"
            defaultValue={exercise.equipment ?? ""}
          />
        </Field>

        <Field id="trackingType" label="Jak se výkon měří">
          <select
            id="trackingType"
            name="trackingType"
            defaultValue={exercise.trackingType}
            className={selectClass}
          >
            <option value="WEIGHT_REPS">Váha a opakování</option>
            <option value="TIME">Čas v sekundách</option>
          </select>
        </Field>

        <Field
          id="instructions"
          label="Instrukce k provedení"
          hint="Klient je uvidí při tréninku."
        >
          <textarea
            id="instructions"
            name="instructions"
            rows={5}
            defaultValue={exercise.instructions ?? ""}
            className="w-full rounded-[var(--radius-button)] border-2 border-border bg-surface p-4 text-lg text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
          <Field id="mediaKind" label="Typ techniky">
            <select id="mediaKind" name="mediaKind" defaultValue={exercise.media[0]?.kind ?? "IMAGE"} className={selectClass}>
              <option value="IMAGE">Fotka</option>
              <option value="VIDEO">Video</option>
            </select>
          </Field>
          <Field id="mediaUrl" label="Odkaz na fotku nebo video" hint="Nepovinné. Zobrazí se klientovi ve spuštěném tréninku.">
            <Input id="mediaUrl" name="mediaUrl" type="url" defaultValue={exercise.media[0]?.storageKey ?? ""} placeholder="https://…" />
          </Field>
        </div>

        <Submit />
      </form>

      <div className="border-t border-border pt-6">
        <h2 className="mb-2 text-2xl font-bold">Smazat cvik</h2>

        {usedInWorkouts > 0 ? (
          <p className="text-lg text-muted-foreground">
            Cvik už klienti odcvičili
            {` (${pluralWithCount(usedInWorkouts, "trénink", "tréninky", "tréninků")})`}
            , proto ho nelze smazat — přišli byste o jejich historii.
          </p>
        ) : usedInTemplates > 0 ? (
          <p className="text-lg text-muted-foreground">
            Cvik je použitý v{" "}
            {pluralWithCount(usedInTemplates, "tréninku", "trénincích", "trénincích")}
            . Nejdřív ho odtud odeberte.
          </p>
        ) : (
          <>
            <p className="mb-4 text-lg text-muted-foreground">
              Cvik zatím nikde nepoužíváte, smazání je bezpečné.
            </p>
            <Button
              type="button"
              variant="danger"
              size="lg"
              block
              onClick={remove}
              disabled={pending}
            >
              <Trash2 aria-hidden="true" />
              {pending ? "Mažu…" : "Smazat cvik"}
            </Button>
          </>
        )}

        {deleteError && (
          <p role="alert" className="mt-3 flex items-start gap-2 text-base font-semibold text-danger">
            <AlertCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
            {deleteError}
          </p>
        )}
      </div>
    </div>
  );
}
