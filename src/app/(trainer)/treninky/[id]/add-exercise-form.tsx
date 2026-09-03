"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, AlertCircle } from "lucide-react";
import {
  quickAddTemplateExerciseAction,
} from "@/server/actions/template";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/shared/field";
import { SearchableSelect } from "@/components/shared/searchable-select";

export function AddExerciseForm({
  templateId,
  exercises,
}: {
  templateId: string;
  exercises: { id: string; name: string; category: string; trackingType: string }[];
}) {
  const categories = [...new Set(exercises.map((exercise) => exercise.category))];
  const [selectedExerciseId, setSelectedExerciseId] = useState("");
  const [selectResetKey, setSelectResetKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const selectedExercise = exercises.find((exercise) => exercise.id === selectedExerciseId);

  const addExercise = () => {
    if (!selectedExerciseId) return;
    setError(null);
    startTransition(async () => {
      const result = await quickAddTemplateExerciseAction(templateId, selectedExerciseId);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      setSelectedExerciseId("");
      setSelectResetKey((key) => key + 1);
      router.replace(`/treninky/${templateId}?edit=${result.itemId}#cviky`, { scroll: false });
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <p role="alert" className="flex items-start gap-3 rounded-[var(--radius-button)] bg-danger px-4 py-3 text-lg font-semibold text-danger-foreground">
          <AlertCircle aria-hidden="true" className="mt-0.5 size-6 shrink-0" />
          {error}
        </p>
      )}

      <Field id="exerciseId" label="Vyberte cvik">
        <div className="flex flex-col gap-3">
          <SearchableSelect
            id="exerciseId"
            name="exerciseId"
            placeholder="Napište název cviku…"
            emptyLabel="Žádný cvik neodpovídá"
            categories={categories}
            onValueChange={setSelectedExerciseId}
            resetKey={selectResetKey}
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

      {selectedExercise && (
        <p className="rounded-lg bg-surface-muted px-3 py-2 text-sm text-muted-foreground">
          Po vložení nastavíte série, {selectedExercise.trackingType === "TIME" ? "čas" : "váhu a opakování"} i pauzu přímo u cviku.
        </p>
      )}

      <Button type="button" size="lg" block disabled={!selectedExerciseId || pending} onClick={addExercise}>
        <Plus aria-hidden="true" />
        {pending ? "Vkládám…" : "Vložit cvik a upravit"}
      </Button>
    </div>
  );
}
