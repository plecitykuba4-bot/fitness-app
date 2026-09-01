import Link from "next/link";
import { ArrowLeft, Dumbbell, TrendingDown, TrendingUp } from "lucide-react";
import { requireOwnedClient } from "@/server/auth/guards";
import { db } from "@/server/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProgressChart } from "@/components/shared/progress-chart";
import { trendChange } from "@/services/progress";
import { formatPercentChange } from "@/lib/format";

export const metadata = { title: "Vývoj klienta — Fitness trenér" };

type ExerciseProgress = {
  id: string;
  name: string;
  points: { date: string; value: number }[];
};

type PlanProgress = {
  id: string;
  name: string;
  exercises: Map<string, ExerciseProgress>;
};

export default async function ClientAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { client } = await requireOwnedClient(id);
  const entries = await db.workoutExercise.findMany({
    where: {
      workout: { clientId: client.id, status: "COMPLETED" },
      sets: { some: {} },
    },
    orderBy: { workout: { startedAt: "asc" } },
    select: {
      exerciseId: true,
      exercise: { select: { name: true } },
      workout: {
        select: {
          name: true,
          templateId: true,
          startedAt: true,
          template: { select: { name: true } },
        },
      },
      sets: { select: { weightKg: true } },
    },
  });

  const byPlan = new Map<string, PlanProgress>();
  for (const entry of entries) {
    const maxWeight = Math.max(...entry.sets.map((set) => set.weightKg));
    if (maxWeight <= 0) continue;

    const planId = entry.workout.templateId ?? `workout:${entry.workout.name}`;
    const planName = entry.workout.template?.name ?? entry.workout.name;
    const plan = byPlan.get(planId) ?? {
      id: planId,
      name: planName,
      exercises: new Map<string, ExerciseProgress>(),
    };
    const exercise = plan.exercises.get(entry.exerciseId) ?? {
      id: entry.exerciseId,
      name: entry.exercise.name,
      points: [],
    };

    exercise.points.push({
      date: entry.workout.startedAt.toISOString(),
      value: maxWeight,
    });
    plan.exercises.set(entry.exerciseId, exercise);
    byPlan.set(planId, plan);
  }

  const plans = [...byPlan.values()]
    .map((plan) => ({
      ...plan,
      exercises: [...plan.exercises.values()].sort((a, b) =>
        a.name.localeCompare(b.name, "cs"),
      ),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "cs"));

  return (
    <div className="mx-auto w-full max-w-4xl">
      <Button asChild variant="ghost" className="mb-3">
        <Link href="/analytika">
          <ArrowLeft aria-hidden="true" />
          Zpět na klienty
        </Link>
      </Button>

      <h1 className="text-3xl font-bold tracking-tight">{client.user.name}</h1>
      <p className="mb-6 mt-1 text-base text-muted-foreground">
        Vývoj maximální váhy v jednotlivých cvicích podle tréninkového plánu.
      </p>

      {plans.length === 0 ? (
        <Card className="p-5 text-center text-muted-foreground">
          Klient zatím nemá data z dokončených sérií.
        </Card>
      ) : (
        <div className="space-y-7">
          {plans.map((plan) => (
            <section key={plan.id} aria-labelledby={`plan-${plan.id}`}>
              <div className="mb-3 flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-[var(--radius-button)] bg-primary text-primary-foreground">
                  <Dumbbell aria-hidden="true" className="size-5" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-strong">
                    Tréninkový plán
                  </p>
                  <h2 id={`plan-${plan.id}`} className="text-2xl font-bold">
                    {plan.name}
                  </h2>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {plan.exercises.map((exercise) => {
                  const change = trendChange(
                    exercise.points.map((point) => point.value),
                  );

                  return (
                    <Card key={exercise.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between gap-3">
                          <CardTitle>{exercise.name}</CardTitle>
                          <span
                            className={`flex shrink-0 items-center gap-1 text-base font-bold ${
                              change >= 0 ? "text-success" : "text-danger"
                            }`}
                          >
                            {change >= 0 ? (
                              <TrendingUp aria-hidden="true" className="size-4" />
                            ) : (
                              <TrendingDown aria-hidden="true" className="size-4" />
                            )}
                            {formatPercentChange(change)}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <ProgressChart
                          data={exercise.points}
                          unit="kg"
                          ariaLabel={`Vývoj váhy u cviku ${exercise.name} v plánu ${plan.name}`}
                        />
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
