"use client";

import { useState, useTransition } from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Check,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  moveTemplateExerciseAction,
  removeTemplateExerciseAction,
  updateTemplateExerciseAction,
} from "@/server/actions/template";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatWeight } from "@/lib/format";

export type SetItem = {
  setNumber: number;
  reps: number;
  targetWeight: number | null;
};

export type Item = {
  id: string;
  name: string;
  restSeconds: number;
  note: string | null;
  sets: SetItem[];
  trackingType: string;
};

export function TemplateExerciseList({ items }: { items: Item[] }) {
  if (items.length === 0) {
    return (
      <p className="py-4 text-lg text-muted-foreground">
        Zatím žádný cvik. Přidejte první níže.
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-3">
      {items.map((item, index) => (
        <ExerciseRow
          key={item.id}
          item={item}
          index={index}
          isFirst={index === 0}
          isLast={index === items.length - 1}
        />
      ))}
    </ol>
  );
}

/** Rozepsaná série ve formuláři — hodnoty drží jako text kvůli prázdnému poli. */
type DraftSet = { reps: string; weight: string };

function ExerciseRow({
  item,
  index,
  isFirst,
  isLast,
}: {
  item: Item;
  index: number;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const toDraft = (): DraftSet[] =>
    item.sets.map((s) => ({
      reps: String(s.reps),
      weight: s.targetWeight === null ? "" : String(s.targetWeight),
    }));

  const [draft, setDraft] = useState<DraftSet[]>(toDraft);
  const [rest, setRest] = useState(String(item.restSeconds));
  const [note, setNote] = useState(item.note ?? "");

  const cancel = () => {
    setDraft(toDraft());
    setRest(String(item.restSeconds));
    setNote(item.note ?? "");
    setError(null);
    setEditing(false);
  };

  const save = () => {
    setError(null);
    startTransition(async () => {
      const result = await updateTemplateExerciseAction(item.id, {
        restSeconds: Number(rest),
        note: note.trim() === "" ? null : note.trim(),
        sets: draft.map((s) => ({
          reps: Number(s.reps),
          targetWeight: s.weight === "" ? null : Number(s.weight),
        })),
      });

      if (result.ok) setEditing(false);
      else setError(result.error);
    });
  };

  const updateSet = (i: number, patch: Partial<DraftSet>) =>
    setDraft((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  const addSet = () =>
    setDraft((prev) => [
      ...prev,
      // Nová série vychází z poslední — trenér obvykle jen upraví váhu.
      prev.length > 0 ? { ...prev[prev.length - 1] } : { reps: "10", weight: "" },
    ]);

  const removeSet = (i: number) =>
    setDraft((prev) => prev.filter((_, idx) => idx !== i));

  return (
    <li className="rounded-[var(--radius-button)] bg-surface-muted p-4">
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="tabular mt-0.5 text-xl font-bold text-muted-foreground"
        >
          {index + 1}.
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xl font-bold">{item.name}</p>

          {editing ? (
            <div className="mt-4 flex flex-col gap-4">
              <p className="text-lg font-semibold">Série</p>

              <ul className="flex flex-col gap-3">
                {draft.map((set, i) => (
                  <li
                    key={i}
                    className="rounded-[var(--radius-button)] bg-surface p-3"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-base font-semibold text-muted-foreground">
                        Série {i + 1}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={draft.length <= 1}
                        onClick={() => removeSet(i)}
                      >
                        <Trash2 aria-hidden="true" />
                        Odebrat
                      </Button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label>
                        <span className="mb-1 block text-base font-semibold">
                          {item.trackingType === "TIME" ? "Výdrž (sekundy)" : "Opakování"}
                        </span>
                        <Input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={item.trackingType === "TIME" ? 3600 : 100}
                          value={set.reps}
                          onChange={(e) => updateSet(i, { reps: e.target.value })}
                        />
                      </label>
                      {item.trackingType !== "TIME" && <label>
                        <span className="mb-1 block text-base font-semibold">
                          Váha (kg)
                        </span>
                        <Input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          max={500}
                          step={2.5}
                          value={set.weight}
                          placeholder="vlastní váha"
                          onChange={(e) => updateSet(i, { weight: e.target.value })}
                        />
                      </label>}
                    </div>
                  </li>
                ))}
              </ul>

              <Button type="button" variant="secondary" block onClick={addSet}>
                <Plus aria-hidden="true" />
                Přidat sérii
              </Button>

              <div className="grid gap-4 sm:grid-cols-2">
                <label>
                  <span className="mb-1 block text-lg font-semibold">
                    Pauza (s)
                  </span>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={600}
                    step={15}
                    value={rest}
                    onChange={(e) => setRest(e.target.value)}
                  />
                </label>
                <label>
                  <span className="mb-1 block text-lg font-semibold">
                    Poznámka
                  </span>
                  <Input
                    value={note}
                    placeholder="Nepovinné."
                    onChange={(e) => setNote(e.target.value)}
                  />
                </label>
              </div>

              {error && (
                <p
                  role="alert"
                  className="flex items-start gap-2 text-base font-semibold text-danger"
                >
                  <AlertCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
                  {error}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={save} disabled={pending}>
                  <Check aria-hidden="true" />
                  {pending ? "Ukládám…" : "Uložit změny"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={cancel}
                  disabled={pending}
                >
                  <X aria-hidden="true" />
                  Zrušit
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Série jako samostatné řádky — u pyramidy se váhy liší. */}
              <ul className="mt-2 flex flex-col gap-1">
                {item.sets.map((set) => (
                  <li
                    key={set.setNumber}
                    className="flex items-center justify-between gap-3 rounded-[var(--radius-button)] bg-surface px-3 py-2"
                  >
                    <span className="text-base font-semibold text-muted-foreground">
                      Série {set.setNumber}
                    </span>
                    <span className="tabular text-lg font-bold">
                      {item.trackingType === "TIME"
                        ? `${set.reps} s`
                        : set.targetWeight
                        ? `${set.reps} × ${formatWeight(set.targetWeight)}`
                        : `${set.reps} opakování`}
                    </span>
                  </li>
                ))}
              </ul>

              <p className="mt-2 text-base text-muted-foreground">
                Pauza {item.restSeconds} s
              </p>
              {item.note && (
                <p className="mt-1 text-base">Poznámka: {item.note}</p>
              )}
            </>
          )}
        </div>
      </div>

      {!editing && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" onClick={() => setEditing(true)} disabled={pending}>
            <Pencil aria-hidden="true" />
            Upravit
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={isFirst || pending}
            onClick={() =>
              startTransition(() => moveTemplateExerciseAction(item.id, "up"))
            }
          >
            <ArrowUp aria-hidden="true" />
            Nahoru
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={isLast || pending}
            onClick={() =>
              startTransition(() => moveTemplateExerciseAction(item.id, "down"))
            }
          >
            <ArrowDown aria-hidden="true" />
            Dolů
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={pending}
            onClick={() => {
              if (confirm(`Opravdu odebrat cvik ${item.name} z tohoto tréninku?`)) {
                startTransition(() => removeTemplateExerciseAction(item.id));
              }
            }}
          >
            <Trash2 aria-hidden="true" />
            Odebrat
          </Button>
        </div>
      )}
    </li>
  );
}
