import { notFound, redirect } from "next/navigation";
import { requireClient } from "@/server/auth/guards";
import { db } from "@/server/db";
import { getWorkoutDetail, getLastPerformance } from "@/server/queries/client";
import {
  WorkoutMode,
  type WorkoutExerciseView,
} from "@/components/shared/workout-mode";

export const metadata = { title: "Trénink — Fitness trenér" };

export default async function WorkoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await requireClient();

  // Dotaz je omezený na clientId — cizí trénink skončí 404, ne cizími daty.
  const workout = await getWorkoutDetail(id, client.clientId);
  if (!workout) notFound();

  if (workout.status === "COMPLETED") redirect(`/trenink/${workout.id}/souhrn`);

  const [lastPerformance, clientRow] = await Promise.all([
    getLastPerformance(
      client.clientId,
      workout.exercises.map((e) => e.exerciseId),
      workout.id,
    ),
    db.client.findUnique({
      where: { id: client.clientId },
      select: { trainerId: true },
    }),
  ]);

  // Nabídka pro "Přidat cvik" — celá knihovna cviků tohoto trenéra.
  const availableExercises = clientRow
    ? await db.exercise.findMany({
        where: { trainerId: clientRow.trainerId },
        orderBy: [{ category: "asc" }, { name: "asc" }],
        select: { id: true, name: true, category: true, trackingType: true },
      })
    : [];

  const exercises: WorkoutExerciseView[] = workout.exercises.map((we) => {
    const last = lastPerformance.get(we.exerciseId);
    return {
      id: we.id,
      exerciseId: we.exerciseId,
      name: we.exercise.name,
      trackingType: we.exercise.trackingType,
      instructions: we.exercise.instructions,
      restSeconds: we.restSeconds,
      note: we.note,
      media: we.exercise.media.map((m) => ({
        kind: m.kind,
        storageKey: m.storageKey,
        posterKey: m.posterKey,
      })),
      targets: we.targets.map((t) => ({
        setNumber: t.setNumber,
        reps: t.reps,
        targetWeight: t.targetWeight,
      })),
      loggedSets: we.sets.map((s) => ({
        setNumber: s.setNumber,
        weightKg: s.weightKg,
        reps: s.reps,
      })),
      lastPerformance: last
        ? {
            weightKg: last.weightKg,
            reps: last.reps,
            date: last.date.toISOString(),
          }
        : null,
    };
  });

  return (
    <WorkoutMode
      workoutId={workout.id}
      workoutName={workout.name}
      startedAt={workout.startedAt.toISOString()}
      exercises={exercises}
      availableExercises={availableExercises}
    />
  );
}
