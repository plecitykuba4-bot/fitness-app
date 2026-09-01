"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Plus,
  Trash2,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RestSeparator } from "@/components/shared/rest-separator";
import { useElapsedSeconds } from "@/hooks/use-elapsed";
import {
  addExerciseToWorkoutAction,
  addSetToWorkoutExerciseAction,
  deleteLoggedSetAction,
  editSetValueAction,
  finishWorkoutAction,
  logSetAction,
  removeExerciseFromWorkoutAction,
  removeSetFromWorkoutExerciseAction,
} from "@/server/actions/workout";
import { cn } from "@/lib/utils";
import { formatDuration, formatWeight, formatRelativeDay } from "@/lib/format";

export type TargetView = {
  setNumber: number;
  reps: number;
  targetWeight: number | null;
};

export type WorkoutExerciseView = {
  id: string;
  exerciseId: string;
  name: string;
  trackingType: string;
  instructions: string | null;
  restSeconds: number;
  note: string | null;
  media: { kind: string; storageKey: string; posterKey: string | null }[];
  /** Předpis sérií — každá může mít jinou váhu i opakování (pyramida). */
  targets: TargetView[];
  /** Série už zapsané v databázi (např. po reloadu stránky). */
  loggedSets: { setNumber: number; weightKg: number; reps: number }[];
  lastPerformance: { weightKg: number; reps: number; date: string } | null;
};

export type AvailableExercise = { id: string; name: string; category: string; trackingType: string };

type Props = {
  workoutId: string;
  workoutName: string;
  startedAt: string;
  exercises: WorkoutExerciseView[];
  availableExercises: AvailableExercise[];
};

type RowValue = { reps: number; weightKg: number };

/**
 * Workout mode klienta — celý trénink na jednu obrazovku ve stylu tabulky
 * (Série / Váha / Opakování / hotovo), jak to znají z Strong nebo Hevy.
 * Váhu i opakování jde přepsat přímo v políčku. Klient může průběžně
 * přidávat i odebírat série i celé cviky.
 */
export function WorkoutMode({
  workoutId,
  workoutName,
  startedAt,
  exercises,
  availableExercises,
}: Props) {
  const router = useRouter();
  const elapsed = useElapsedSeconds(startedAt);

  // Klíč řádku je kombinace cviku a čísla série — stejné číslo série
  // existuje nezávisle u každého cviku.
  const key = (exerciseId: string, setNumber: number) =>
    `${exerciseId}:${setNumber}`;

  const [doneKeys, setDoneKeys] = useState<Set<string>>(
    () => new Set(initialDoneKeys(exercises)),
  );
  const [activeIndex, setActiveIndex] = useState(() => {
    const firstIncomplete = exercises.findIndex((exercise) =>
      exercise.targets.some(
        (target) => !exercise.loggedSets.some((set) => set.setNumber === target.setNumber),
      ),
    );
    return firstIncomplete < 0 ? Math.max(exercises.length - 1, 0) : firstIncomplete;
  });
  const [overrides, setOverrides] = useState<Record<string, RowValue>>({});
  const [resting, setResting] = useState<{
    exerciseId: string;
    afterSetNumber: number;
    seconds: number;
  } | null>(null);
  const [openTechnique, setOpenTechnique] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const activeExercise = exercises[activeIndex];
  const exerciseProgress = exercises.length === 0
    ? 0
    : ((activeIndex + 1) / exercises.length) * 100;

  const getValue = (exercise: WorkoutExerciseView, setNumber: number): RowValue => {
    const k = key(exercise.id, setNumber);
    if (overrides[k]) return overrides[k];

    const logged = exercise.loggedSets.find((s) => s.setNumber === setNumber);
    if (logged) return { reps: logged.reps, weightKg: logged.weightKg };

    const target = exercise.targets.find((t) => t.setNumber === setNumber);
    return { reps: target?.reps ?? 10, weightKg: target?.targetWeight ?? 0 };
  };

  const markDone = (exercise: WorkoutExerciseView, target: TargetView) => {
    setError(null);
    const k = key(exercise.id, target.setNumber);
    const value = getValue(exercise, target.setNumber);
    const clientKey = `${workoutId}-${exercise.id}-${target.setNumber}`;

    setDoneKeys((prev) => new Set(prev).add(k));

    startTransition(async () => {
      const result = await logSetAction({
        workoutExerciseId: exercise.id,
        setNumber: target.setNumber,
        weightKg: value.weightKg,
        reps: value.reps,
        clientKey,
      });

      if (!result.ok) {
        setError(result.error);
        setDoneKeys((prev) => {
          const next = new Set(prev);
          next.delete(k);
          return next;
        });
      }
    });

    // Pauza naskočí, pokud v tomto cviku zbývá ještě nějaká nedokončená série.
    const remaining = exercise.targets.filter(
      (t) => t.setNumber !== target.setNumber && !doneKeys.has(key(exercise.id, t.setNumber)),
    );
    if (exercise.restSeconds > 0 && remaining.length > 0) {
      setResting({
        exerciseId: exercise.id,
        afterSetNumber: target.setNumber,
        seconds: exercise.restSeconds,
      });
    }
  };

  const undoDone = (exercise: WorkoutExerciseView, setNumber: number) => {
    setError(null);
    const k = key(exercise.id, setNumber);
    setDoneKeys((prev) => {
      const next = new Set(prev);
      next.delete(k);
      return next;
    });

    startTransition(async () => {
      const result = await deleteLoggedSetAction(exercise.id, setNumber);
      if (!result.ok) {
        setError(result.error);
        setDoneKeys((prev) => new Set(prev).add(k));
      }
    });
  };

  const saveEdit = (
    exercise: WorkoutExerciseView,
    setNumber: number,
    value: RowValue,
  ) => {
    setError(null);
    const k = key(exercise.id, setNumber);
    const previous = overrides[k];
    setOverrides((prev) => ({ ...prev, [k]: value }));

    startTransition(async () => {
      const result = await editSetValueAction({
        workoutExerciseId: exercise.id,
        setNumber,
        reps: value.reps,
        weightKg: value.weightKg,
      });
      if (!result.ok) {
        setError(result.error);
        setOverrides((prev) => {
          const next = { ...prev };
          if (previous) next[k] = previous;
          else delete next[k];
          return next;
        });
      }
    });
  };

  const addSet = (exercise: WorkoutExerciseView) => {
    setError(null);
    startTransition(async () => {
      const result = await addSetToWorkoutExerciseAction(exercise.id);
      if (result.ok) router.refresh();
      else setError(result.error);
    });
  };

  const removeSet = (exercise: WorkoutExerciseView, setNumber: number) => {
    setError(null);
    startTransition(async () => {
      const result = await removeSetFromWorkoutExerciseAction(
        exercise.id,
        setNumber,
      );
      if (result.ok) router.refresh();
      else setError(result.error);
    });
  };

  const addExercise = (exerciseId: string) => {
    setError(null);
    startTransition(async () => {
      const result = await addExerciseToWorkoutAction(workoutId, exerciseId);
      if (result.ok) router.refresh();
      else setError(result.error);
    });
  };

  const removeExercise = (exercise: WorkoutExerciseView) => {
    if (!confirm(`Opravdu odebrat cvik ${exercise.name} z tréninku?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await removeExerciseFromWorkoutAction(exercise.id);
      if (result.ok) router.refresh();
      else setError(result.error);
    });
  };

  const finish = () => {
    setError(null);
    startTransition(async () => {
      const result = await finishWorkoutAction(workoutId);
      if (result.ok) {
        router.push(`/trenink/${workoutId}/souhrn?oslavit=1`);
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <div className="mx-auto w-full max-w-xl">
      {/* Časovač a tlačítko ukončení zůstávají viditelné po celý trénink. */}
      <div className="sticky top-[var(--app-top-offset)] z-30 -mx-5 mb-5 border-b border-border bg-background/95 px-5 py-3 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-lg font-semibold text-muted-foreground">
            {workoutName}
          </p>
          <p className="tabular shrink-0 text-3xl font-bold" aria-label="Délka tréninku">
            {formatDuration(elapsed)}
          </p>
        </div>
        <div className="mt-1 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-muted-foreground">
            Cvik <span className="text-primary-strong">{Math.min(activeIndex + 1, exercises.length)}</span> z {exercises.length}
          </p>
          <Button
            type="button"
            variant="success"
            size="default"
            onClick={finish}
            disabled={pending}
          >
            <Check aria-hidden="true" />
            {pending ? "…" : "Dokončit"}
          </Button>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{ width: `${exerciseProgress}%` }}
          />
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="mb-4 flex items-start gap-3 rounded-[var(--radius-button)] bg-danger px-4 py-3 text-lg font-semibold text-danger-foreground"
        >
          <CircleAlert aria-hidden="true" className="mt-0.5 size-6 shrink-0" />
          {error}
        </p>
      )}

      {activeExercise ? (
        <>
          <Card className="p-4">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-bold tracking-tight text-foreground">
                    {activeExercise.name}
                  </h2>

                  {activeExercise.note && (
                    <p className="mt-2 rounded-lg border border-primary/25 bg-primary/5 p-3 text-base">
                      <span className="block text-xs font-bold uppercase tracking-wider text-primary-strong">Tip trenéra</span>
                      {activeExercise.note}
                    </p>
                  )}

                  {activeExercise.lastPerformance && (
                    <p className="tabular mt-1 text-sm text-muted-foreground">
                      Minule:{" "}
                      {activeExercise.trackingType === "TIME"
                        ? `${activeExercise.lastPerformance.reps} s`
                        : activeExercise.lastPerformance.weightKg > 0
                        ? `${formatWeight(activeExercise.lastPerformance.weightKg)} × ${activeExercise.lastPerformance.reps}`
                        : `${activeExercise.lastPerformance.reps} opakování`}{" "}
                      ({formatRelativeDay(activeExercise.lastPerformance.date)})
                    </p>
                  )}
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  className="shrink-0"
                  disabled={pending}
                  onClick={() => removeExercise(activeExercise)}
                  aria-label={`Odebrat cvik ${activeExercise.name}`}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>

              {(activeExercise.instructions || activeExercise.media.length > 0) && (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    block
                    className="mt-3"
                    onClick={() =>
                      setOpenTechnique((prev) => {
                        const next = new Set(prev);
                        if (next.has(activeExercise.id)) next.delete(activeExercise.id);
                        else next.add(activeExercise.id);
                        return next;
                      })
                    }
                    aria-expanded={openTechnique.has(activeExercise.id)}
                  >
                    <Video aria-hidden="true" />
                    {openTechnique.has(activeExercise.id)
                      ? "Skrýt techniku"
                      : "Zobrazit techniku"}
                  </Button>

                  {openTechnique.has(activeExercise.id) && (
                    <Card className="mt-3 p-4">
                      {activeExercise.instructions && (
                        <p className="text-lg leading-relaxed">
                          {activeExercise.instructions}
                        </p>
                      )}
                      {activeExercise.media.map((m) => (
                        <div key={m.storageKey} className="mt-4">
                          {m.kind === "VIDEO" ? (
                            <video
                              controls
                              preload="none"
                              poster={m.posterKey ?? undefined}
                              className="w-full rounded-[var(--radius-button)]"
                            >
                              <source src={m.storageKey} />
                              Váš prohlížeč neumí přehrát toto video.
                            </video>
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={m.storageKey}
                              alt={`Technika cviku ${activeExercise.name}`}
                              loading="lazy"
                              className="w-full rounded-[var(--radius-button)]"
                            />
                          )}
                        </div>
                      ))}
                    </Card>
                  )}
                </>
              )}

              {/* Hlavička tabulky — jednou na cvik. */}
              <div className="mt-4 grid grid-cols-[2rem_1fr_1fr_2.75rem] items-center gap-2 px-1 text-sm font-semibold text-muted-foreground">
                <span>Série</span>
                <span>{activeExercise.trackingType === "TIME" ? "Čas" : "Váha (kg)"}</span>
                <span>{activeExercise.trackingType === "TIME" ? "" : "Opakování"}</span>
                <span className="text-center">Hotovo</span>
              </div>

              <div className="mt-1 flex flex-col">
                {activeExercise.targets.map((target, i) => (
                  <div key={target.setNumber}>
                    <SetRow
                      setNumber={target.setNumber}
                      value={getValue(activeExercise, target.setNumber)}
                      done={doneKeys.has(key(activeExercise.id, target.setNumber))}
                      isTimed={activeExercise.trackingType === "TIME"}
                      disabled={pending}
                      canRemove={activeExercise.targets.length > 1}
                      onSave={(value) =>
                        saveEdit(activeExercise, target.setNumber, value)
                      }
                      onComplete={() => markDone(activeExercise, target)}
                      onUndo={() => undoDone(activeExercise, target.setNumber)}
                      onRemove={() => removeSet(activeExercise, target.setNumber)}
                    />

                    {i < activeExercise.targets.length - 1 && (
                      <RestSeparator
                        seconds={activeExercise.restSeconds}
                        active={
                          resting?.exerciseId === activeExercise.id &&
                          resting.afterSetNumber === target.setNumber
                        }
                        onSkip={() => setResting(null)}
                      />
                    )}
                  </div>
                ))}
              </div>

              <Button
                type="button"
                variant="secondary"
                block
                className="mt-3"
                disabled={pending}
                onClick={() => addSet(activeExercise)}
              >
                <Plus aria-hidden="true" />
                Přidat sérii
              </Button>
          </Card>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="secondary"
              disabled={activeIndex === 0}
              onClick={() => setActiveIndex((index) => Math.max(0, index - 1))}
            >
              <ChevronLeft aria-hidden="true" />
              Předchozí cvik
            </Button>
            <Button
              type="button"
              disabled={activeIndex >= exercises.length - 1}
              onClick={() => setActiveIndex((index) => Math.min(exercises.length - 1, index + 1))}
            >
              Další cvik
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
          {activeIndex < exercises.length - 1 && (
            <p className="mt-3 text-center text-sm text-muted-foreground">
              Další: <span className="font-semibold text-foreground">{exercises[activeIndex + 1]?.name}</span>
            </p>
          )}
        </>
      ) : (
        <Card className="p-5 text-center text-muted-foreground">
          V tréninku zatím není žádný cvik.
        </Card>
      )}

      <AddExerciseCard
        exercises={availableExercises}
        disabled={pending}
        onAdd={addExercise}
      />

      <Button
        type="button"
        size="xl"
        className="mt-6"
        onClick={finish}
        disabled={pending}
      >
        <Check aria-hidden="true" />
        {pending ? "Ukončuji…" : "Ukončit trénink"}
      </Button>
    </div>
  );
}

/**
 * Jeden řádek tabulky sérií — váha a opakování se přepisují přímo
 * v políčku, žádný zvláštní režim úprav. Odškrtnutí zezelená celý řádek.
 */
function SetRow({
  setNumber,
  value,
  done,
  isTimed,
  disabled,
  canRemove,
  onSave,
  onComplete,
  onUndo,
  onRemove,
}: {
  setNumber: number;
  value: RowValue;
  done: boolean;
  isTimed: boolean;
  disabled: boolean;
  canRemove: boolean;
  onSave: (value: RowValue) => void;
  onComplete: () => void;
  onUndo: () => void;
  onRemove: () => void;
}) {
  const [weightText, setWeightText] = useState(formatFieldNumber(value.weightKg));
  const [repsText, setRepsText] = useState(String(value.reps));

  const commitWeight = () => {
    const parsed = parseFieldNumber(weightText);
    setWeightText(formatFieldNumber(parsed));
    if (parsed !== value.weightKg) onSave({ ...value, weightKg: parsed });
  };

  const commitReps = () => {
    const parsed = Math.max(0, Math.round(Number(repsText) || 0));
    setRepsText(String(parsed));
    if (parsed !== value.reps) onSave({ ...value, reps: parsed });
  };

  return (
    <div
      className={cn(
        "grid grid-cols-[2rem_1fr_1fr_2.75rem] items-center gap-2 rounded-[var(--radius-button)] px-1 py-1.5 transition-colors",
        done && "bg-primary/[0.05]",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex size-8 items-center justify-center rounded-full text-base font-bold",
          done
            ? "border border-primary bg-transparent text-primary-strong"
            : "bg-primary text-primary-foreground",
        )}
      >
        {setNumber}
      </span>

      {isTimed ? (
        <label
          className={cn(
            "col-span-2 flex min-h-touch min-w-0 items-center justify-center rounded-[var(--radius-button)] border-2 bg-surface-muted px-3 focus-within:border-primary",
            done ? "border-transparent" : "border-primary/65",
          )}
        >
          <input
            type="number"
            inputMode="numeric"
            step={5}
            min={1}
            max={3600}
            value={repsText}
            disabled={disabled}
            onChange={(e) => setRepsText(e.target.value)}
            onBlur={commitReps}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            aria-label={`Série ${setNumber} — čas v sekundách`}
            className="tabular min-w-0 flex-1 bg-transparent text-right text-lg font-bold text-foreground focus:outline-none"
          />
          <span className="ml-1 text-lg font-bold">sekund</span>
        </label>
      ) : (
        <>
          <label
            className={cn(
              "flex min-h-touch min-w-0 items-center justify-center rounded-[var(--radius-button)] border-2 bg-surface-muted px-2 focus-within:border-primary",
              done ? "border-transparent" : "border-primary/65",
            )}
          >
            <input
              type="number"
              inputMode="decimal"
              step={2.5}
              min={0}
              max={500}
              value={weightText}
              disabled={disabled}
              onChange={(e) => setWeightText(e.target.value)}
              onBlur={commitWeight}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              aria-label={`Série ${setNumber} — váha v kg`}
              className="tabular min-w-0 flex-1 bg-transparent text-right text-lg font-bold text-foreground focus:outline-none"
            />
            <span aria-hidden="true" className="ml-1 shrink-0 text-lg font-bold text-foreground">kg</span>
          </label>

          <input
            type="number"
            inputMode="numeric"
            step={1}
            min={0}
            max={100}
            value={repsText}
            disabled={disabled}
            onChange={(e) => setRepsText(e.target.value)}
            onBlur={commitReps}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            aria-label={`Série ${setNumber} — počet opakování`}
            className={cn(
              "tabular min-h-touch w-full rounded-[var(--radius-button)] border-2 px-2 text-center text-lg font-bold focus:border-primary focus:outline-none",
              done ? "border-transparent bg-surface-muted" : "border-primary/65 bg-surface-muted",
            )}
          />
        </>
      )}

      <div className="flex items-center justify-center gap-1">
        <button
          type="button"
          onClick={done ? onUndo : onComplete}
          disabled={disabled}
          aria-label={done ? `Série ${setNumber} — zrušit hotovo` : `Série ${setNumber} — dokončit`}
          className={cn(
            "flex size-touch shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200",
            done
              ? "scale-110 border-primary bg-primary shadow-[0_0_0_6px_rgb(174_240_0_/_0.2),0_4px_14px_rgb(95_133_0_/_0.3)]"
              : "border-border bg-surface-muted hover:border-primary",
          )}
        >
          <Check
            aria-hidden="true"
            className={cn(
              done ? "size-7 stroke-[3] text-primary-foreground" : "size-6 text-muted-foreground",
            )}
          />
        </button>
      </div>

      {canRemove && !done && (
        <div className="col-span-4 flex justify-end">
          <button
            type="button"
            onClick={onRemove}
            disabled={disabled}
            aria-label={`Odebrat sérii ${setNumber}`}
            className="flex items-center gap-1 px-2 py-1 text-sm font-semibold text-muted-foreground hover:text-danger"
          >
            <Trash2 aria-hidden="true" className="size-4" />
            Odebrat sérii
          </button>
        </div>
      )}
    </div>
  );
}

function formatFieldNumber(value: number): string {
  if (value <= 0) return "";
  return Number.isInteger(value) ? String(value) : String(value);
}

function parseFieldNumber(text: string): number {
  const n = Number(text.replace(",", "."));
  if (Number.isNaN(n) || n < 0) return 0;
  return Math.round(n * 100) / 100;
}

/** Přidání dalšího cviku do rozcvičeného tréninku. */
function AddExerciseCard({
  exercises,
  disabled,
  onAdd,
}: {
  exercises: AvailableExercise[];
  disabled: boolean;
  onAdd: (exerciseId: string) => void;
}) {
  const [selected, setSelected] = useState("");

  const grouped = useMemo(() => {
    const map = new Map<string, AvailableExercise[]>();
    for (const ex of exercises) {
      const list = map.get(ex.category) ?? [];
      list.push(ex);
      map.set(ex.category, list);
    }
    return map;
  }, [exercises]);

  if (exercises.length === 0) return null;

  return (
    <Card className="mt-6 p-5">
      <h2 className="mb-3 text-xl font-bold">Přidat cvik do tréninku</h2>
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Vyberte cvik</span>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="min-h-touch-lg w-full rounded-[var(--radius-button)] border-2 border-border bg-surface px-4 text-lg text-foreground focus:border-primary focus:outline-none"
          >
            <option value="">Vyberte cvik</option>
            {[...grouped.entries()].map(([category, items]) => (
              <optgroup key={category} label={category}>
                {items.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <Button
          type="button"
          disabled={disabled || !selected}
          onClick={() => {
            if (selected) {
              onAdd(selected);
              setSelected("");
            }
          }}
        >
          <Plus aria-hidden="true" />
          Přidat
        </Button>
      </div>
    </Card>
  );
}

function initialDoneKeys(exercises: WorkoutExerciseView[]): string[] {
  const keys: string[] = [];
  for (const ex of exercises) {
    for (const s of ex.loggedSets) keys.push(`${ex.id}:${s.setNumber}`);
  }
  return keys;
}
