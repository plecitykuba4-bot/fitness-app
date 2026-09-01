import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock, Dumbbell } from "lucide-react";
import { requireOwnedClient } from "@/server/auth/guards";
import { db } from "@/server/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatDurationHuman, formatWeight } from "@/lib/format";

export const metadata = { title: "Historie tréninku — Fitness trenér" };

export default async function TrainerWorkoutHistoryPage({
  params,
}: {
  params: Promise<{ id: string; workoutId: string }>;
}) {
  const { id, workoutId } = await params;
  const { client } = await requireOwnedClient(id);
  const workout = await db.workout.findFirst({
    where: { id: workoutId, clientId: client.id, status: "COMPLETED" },
    include: {
      exercises: {
        orderBy: { sortOrder: "asc" },
        include: {
          exercise: { select: { name: true, trackingType: true } },
          sets: { orderBy: { setNumber: "asc" } },
          targets: { orderBy: { setNumber: "asc" } },
        },
      },
    },
  });
  if (!workout) notFound();

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Button asChild variant="ghost" className="mb-3">
        <Link href={`/klienti/${client.id}`}><ArrowLeft aria-hidden="true" />Zpět na klienta</Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-base font-semibold text-primary-strong">{client.user.name}</p>
          <h1 className="text-3xl font-bold tracking-tight">{workout.name}</h1>
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-base text-muted-foreground">
            <span className="flex items-center gap-2"><CalendarDays aria-hidden="true" className="size-4" />{formatDate(workout.startedAt)}</span>
            <span className="flex items-center gap-2"><Clock aria-hidden="true" className="size-4" />{formatDurationHuman(workout.durationSec ?? 0)}</span>
          </p>
        </div>
        {workout.templateId && <Button asChild variant="secondary"><Link href={`/treninky/${workout.templateId}`}>Otevřít dnešní plán</Link></Button>}
      </div>

      <h2 className="mb-3 mt-7 text-2xl font-bold">Odcvičené cviky</h2>
      <div className="flex flex-col gap-4">
        {workout.exercises.map((item, index) => (
          <Card key={item.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Dumbbell aria-hidden="true" className="size-5 text-primary-strong" />{index + 1}. {item.exercise.name}</CardTitle>
            </CardHeader>
            <CardContent>
              {item.sets.length === 0 ? <p className="text-base text-muted-foreground">Cvik nebyl dokončen.</p> : (
                <div className="overflow-hidden rounded-[var(--radius-button)] border border-border">
                  <div className={`grid ${item.exercise.trackingType === "TIME" ? "grid-cols-[1fr_2.2fr]" : "grid-cols-[1fr_1.2fr_1fr]"} bg-surface-muted px-3 py-2 text-sm font-semibold text-muted-foreground`}><span>Série</span>{item.exercise.trackingType === "TIME" ? <span>Čas</span> : <><span>Váha</span><span>Opakování</span></>}</div>
                  {item.sets.map((set) => {
                    const target = item.targets.find((entry) => entry.setNumber === set.setNumber);
                    return <div key={set.id} className={`grid min-h-touch ${item.exercise.trackingType === "TIME" ? "grid-cols-[1fr_2.2fr]" : "grid-cols-[1fr_1.2fr_1fr]"} items-center border-t border-border px-3 text-base`}><span>{set.setNumber}.</span>{item.exercise.trackingType === "TIME" ? <span className="tabular font-bold">{set.reps} s{target && target.reps !== set.reps ? <small className="ml-1 text-muted-foreground">(plán {target.reps} s)</small> : null}</span> : <><span className="tabular font-bold">{set.weightKg > 0 ? formatWeight(set.weightKg) : "Vlastní váha"}</span><span className="tabular">{set.reps}×{target && target.reps !== set.reps ? <small className="ml-1 text-muted-foreground">(plán {target.reps})</small> : null}</span></>}</div>;
                  })}
                </div>
              )}
              {item.note && <p className="mt-3 rounded-lg bg-surface-muted px-3 py-2 text-sm"><strong>Poznámka:</strong> {item.note}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
