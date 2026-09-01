import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, Timer } from "lucide-react";
import { requireClient } from "@/server/auth/guards";
import { db } from "@/server/db";
import { getLastPerformance } from "@/server/queries/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StartWorkoutButton } from "@/app/(client)/dnes/start-workout-button";
import { formatWeight, pluralWithCount } from "@/lib/format";

export const metadata = { title: "Trénink — Fitness trenér" };

/**
 * Náhled tréninku před spuštěním.
 * Klient tu vidí přesně, co ho čeká — každou sérii zvlášť — a může trénink
 * spustit kterýkoli den, ne jen v den, na který je naplánovaný.
 */
export default async function PlanTemplatePage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const { templateId } = await params;
  const client = await requireClient();

  // Trénink musí patřit přímo tomuto klientovi — jinak 404.
  const template = await db.workoutTemplate.findFirst({
    where: { id: templateId, clientId: client.clientId },
    include: {
      exercises: {
        orderBy: { sortOrder: "asc" },
        include: {
          exercise: true,
          sets: { orderBy: { setNumber: "asc" } },
        },
      },
    },
  });

  if (!template) notFound();

  const lastPerformance = await getLastPerformance(
    client.clientId,
    template.exercises.map((e) => e.exerciseId),
  );

  const totalSets = template.exercises.reduce(
    (sum, e) => sum + e.sets.length,
    0,
  );

  return (
    <div className="mx-auto w-full max-w-xl">
      <Button asChild variant="ghost" className="mb-4">
        <Link href="/dnes">
          <ArrowLeft aria-hidden="true" />
          Zpět
        </Link>
      </Button>

      <h1 className="text-3xl font-bold tracking-tight">{template.name}</h1>
      <p className="mt-1 text-xl text-muted-foreground">
        {pluralWithCount(template.exercises.length, "cvik", "cviky", "cviků")}
        {` · ${pluralWithCount(totalSets, "série", "série", "sérií")}`}
        {template.estimatedMin ? ` · ${template.estimatedMin} min` : ""}
      </p>

      {/* Hlavní akce je hned nahoře — klient nemusí nic hledat. */}
      <div className="mt-6">
        <StartWorkoutButton templateId={template.id} />
      </div>

      <h2 className="mt-8 mb-3 text-2xl font-bold">Co vás čeká</h2>
      <ol className="flex flex-col gap-3">
        {template.exercises.map((item, index) => {
          const last = lastPerformance.get(item.exerciseId);
          return (
            <li key={item.id}>
              <Card>
                <CardContent className="p-5 pt-5">
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className="tabular text-xl font-bold text-muted-foreground"
                    >
                      {index + 1}.
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xl font-bold">{item.exercise.name}</p>

                      {/* Každá série vlastní řádek — u pyramidy se váhy liší. */}
                      <ul className="mt-3 flex flex-col gap-2">
                        {item.sets.map((set) => (
                          <li
                            key={set.id}
                            className="flex items-center justify-between gap-3 rounded-[var(--radius-button)] bg-surface-muted px-4 py-2"
                          >
                            <span className="text-base font-semibold text-muted-foreground">
                              Série {set.setNumber}
                            </span>
                            <span className="tabular text-lg font-bold">
                              {item.exercise.trackingType === "TIME"
                                ? `${set.reps} s`
                                : set.targetWeight
                                ? `${set.reps} × ${formatWeight(set.targetWeight)}`
                                : `${set.reps} opakování`}
                            </span>
                          </li>
                        ))}
                      </ul>

                      <p className="mt-3 flex items-center gap-2 text-base text-muted-foreground">
                        <Timer aria-hidden="true" className="size-5" />
                        Pauza {item.restSeconds} s
                      </p>

                      {last && (
                        <p className="tabular mt-1 text-base text-muted-foreground">
                          {item.exercise.trackingType === "TIME"
                            ? `Minule: ${last.reps} s`
                            : last.weightKg > 0
                            ? `Minule: ${formatWeight(last.weightKg)} × ${last.reps}`
                            : `Minule: ${last.reps} opakování`}
                        </p>
                      )}

                      {item.note && (
                        <p className="mt-2 text-base font-semibold">
                          Poznámka trenéra: {item.note}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ol>

      <div className="mt-8">
        <StartWorkoutButton templateId={template.id} />
      </div>

      <p className="mt-4 flex items-center justify-center gap-2 text-base text-muted-foreground">
        <Clock aria-hidden="true" className="size-5" />
        Časovač se spustí až po stisknutí tlačítka.
      </p>
    </div>
  );
}
