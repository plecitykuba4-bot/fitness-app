import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Dumbbell } from "lucide-react";
import { requireClient } from "@/server/auth/guards";
import { getWorkoutDetail } from "@/server/queries/client";
import { db } from "@/server/db";
import { NoteForm } from "@/components/shared/note-form";
import { NoteList } from "@/components/shared/note-list";
import { addWorkoutNoteAction } from "@/server/actions/note";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WorkoutCelebration } from "@/components/shared/workout-celebration";
import {
  formatDurationHuman,
  formatNumber,
  formatWeight,
} from "@/lib/format";

export const metadata = { title: "Trénink dokončen — Fitness trenér" };

export default async function SummaryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ oslavit?: string }>;
}) {
  const { id } = await params;
  const { oslavit } = await searchParams;
  const client = await requireClient();

  const workout = await getWorkoutDetail(id, client.clientId);
  if (!workout) notFound();

  const notes = await db.note.findMany({
    where: { workoutId: workout.id },
    orderBy: { createdAt: "desc" },
    include: { author: { select: { name: true } } },
  });

  const rows = [
    { label: "Délka", value: formatDurationHuman(workout.durationSec ?? 0) },
    { label: "Cviky", value: formatNumber(workout.exercises.length) },
    { label: "Série", value: formatNumber(workout.totalSets) },
    { label: "Opakování", value: formatNumber(workout.totalReps) },
    {
      label: "Celková zvednutá váha",
      value: formatWeight(workout.totalVolumeKg ?? 0),
    },
  ];

  return (
    <div className="mx-auto w-full max-w-xl">
      {oslavit === "1" && <WorkoutCelebration workoutName={workout.name} />}
      <Card className="p-6 text-center">
        <CheckCircle2 aria-hidden="true" className="mx-auto size-16 text-success" />
        <h1 className="mt-4 text-3xl font-bold tracking-tight">
          Trénink dokončen
        </h1>
        <p className="mt-1 text-xl text-muted-foreground">{workout.name}</p>
      </Card>

      <ul className="mt-6 flex flex-col gap-3">
        {rows.map((row) => (
          <li
            key={row.label}
            className="flex items-center justify-between gap-4 rounded-[var(--radius-card)] bg-surface px-5 py-4"
          >
            <span className="text-lg text-muted-foreground">{row.label}</span>
            <span className="tabular text-2xl font-bold">{row.value}</span>
          </li>
        ))}
      </ul>

      <h2 className="mb-3 mt-8 text-2xl font-bold">Odcvičené cviky</h2>
      <div className="flex flex-col gap-4">
        {workout.exercises.map((item, index) => (
          <Card key={item.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-extrabold text-primary-foreground">
                  {index + 1}
                </span>
                <Dumbbell aria-hidden="true" className="size-5 text-primary-strong" />
                {item.exercise.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {item.sets.length === 0 ? (
                <p className="text-base text-muted-foreground">
                  Cvik nebyl dokončen.
                </p>
              ) : (
                <div className="overflow-hidden rounded-[var(--radius-button)] border border-border">
                  <div className={`grid ${item.exercise.trackingType === "TIME" ? "grid-cols-[0.8fr_2.2fr]" : "grid-cols-[0.8fr_1.2fr_1fr]"} bg-primary/10 px-3 py-2 text-sm font-bold text-muted-foreground`}>
                    <span>Série</span>
                    {item.exercise.trackingType === "TIME" ? (
                      <span>Čas</span>
                    ) : (
                      <>
                        <span>Váha</span>
                        <span>Opakování</span>
                      </>
                    )}
                  </div>
                  {item.sets.map((set) => (
                    <div
                      key={set.id}
                      className={`grid min-h-touch ${item.exercise.trackingType === "TIME" ? "grid-cols-[0.8fr_2.2fr]" : "grid-cols-[0.8fr_1.2fr_1fr]"} items-center border-t border-border px-3 text-base`}
                    >
                      <span className="flex size-7 items-center justify-center rounded-full bg-primary/15 font-bold text-primary-strong">
                        {set.setNumber}
                      </span>
                      {item.exercise.trackingType === "TIME" ? (
                        <span className="tabular font-extrabold">{set.reps} sekund</span>
                      ) : (
                        <>
                          <span className="tabular font-extrabold">
                            {set.weightKg > 0
                              ? formatWeight(set.weightKg)
                              : "Vlastní váha"}
                          </span>
                          <span className="tabular font-semibold">{set.reps}×</span>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {item.note && (
                <p className="mt-3 rounded-lg bg-surface-muted px-3 py-2 text-sm">
                  <strong>Poznámka trenéra:</strong> {item.note}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Poznámka k tréninku</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <NoteForm
            action={addWorkoutNoteAction}
            hiddenField={{ name: "workoutId", value: workout.id }}
            label="Jak trénink probíhal?"
            placeholder="Např. u poslední série jsem cítil bolest ramene."
            submitLabel="Odeslat trenérovi"
          />
          <NoteList
            notes={notes.map((n) => ({
              id: n.id,
              body: n.body,
              authorName: n.author.name,
              createdAt: n.createdAt,
            }))}
          />
        </CardContent>
      </Card>

      <div className="mt-8 flex flex-col gap-3">
        <Button asChild size="xl">
          <Link href="/pokrok">Zobrazit výsledky</Link>
        </Button>
        <Button asChild variant="secondary" size="lg" block>
          <Link href="/dnes">Zpět na domů</Link>
        </Button>
      </div>
    </div>
  );
}
