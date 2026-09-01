import "server-only";

import { db } from "@/server/db";

/**
 * Dotazy pro klientskou část.
 * Každý z nich přijímá `clientId`, který MUSÍ pocházet z autorizační vrstvy
 * (requireClient / resolveAccessibleClientId), nikdy přímo z URL.
 */

/**
 * Všechny tréninky klienta k výběru. Žádný pevný rozvrh — klient si
 * vybírá, co bude dnes cvičit, sám.
 */
export async function getClientTemplates(clientId: string) {
  return db.workoutTemplate.findMany({
    where: { clientId },
    orderBy: { name: "asc" },
    include: { _count: { select: { exercises: true } } },
  });
}

/** Rozcvičený trénink, pokud nějaký zůstal otevřený. */
export async function getInProgressWorkout(clientId: string) {
  return db.workout.findFirst({
    where: { clientId, status: "IN_PROGRESS" },
    orderBy: { startedAt: "desc" },
  });
}

/**
 * Kompletní stav běžícího tréninku pro workout mode.
 * `startedAt` se posílá do klienta a časovač se z něj dopočítává —
 * proto přežije reload stránky i návrat z pozadí.
 */
export async function getWorkoutDetail(workoutId: string, clientId: string) {
  return db.workout.findFirst({
    where: { id: workoutId, clientId },
    include: {
      exercises: {
        orderBy: { sortOrder: "asc" },
        include: {
          exercise: {
            include: { media: { orderBy: { sortOrder: "asc" } } },
          },
          // Předpis sérií (snapshot ze šablony) a skutečně zapsané série.
          targets: { orderBy: { setNumber: "asc" } },
          sets: { orderBy: { setNumber: "asc" } },
        },
      },
    },
  });
}

/**
 * Poslední zaznamenaný výkon klienta u daných cviků.
 * Slouží k předvyplnění vah — klient nemusí nic psát, jen potvrdit.
 */
export async function getLastPerformance(
  clientId: string,
  exerciseIds: string[],
  excludeWorkoutId?: string,
): Promise<Map<string, { weightKg: number; reps: number; date: Date }>> {
  if (exerciseIds.length === 0) return new Map();

  const sets = await db.workoutSet.findMany({
    where: {
      workoutExercise: {
        exerciseId: { in: exerciseIds },
        workout: {
          clientId,
          status: "COMPLETED",
          ...(excludeWorkoutId ? { id: { not: excludeWorkoutId } } : {}),
        },
      },
    },
    orderBy: { completedAt: "desc" },
    select: {
      weightKg: true,
      reps: true,
      completedAt: true,
      workoutExercise: { select: { exerciseId: true } },
    },
    // Strop, aby dotaz nerostl s historií — stačí poslední výkony.
    take: 500,
  });

  const result = new Map<string, { weightKg: number; reps: number; date: Date }>();
  for (const set of sets) {
    const id = set.workoutExercise.exerciseId;
    if (!result.has(id)) {
      result.set(id, {
        weightKg: set.weightKg,
        reps: set.reps,
        date: set.completedAt,
      });
    }
  }
  return result;
}

/** Historie dokončených tréninků. */
export async function getWorkoutHistory(clientId: string, take = 50) {
  return db.workout.findMany({
    where: { clientId, status: "COMPLETED" },
    orderBy: { startedAt: "desc" },
    take,
    select: {
      id: true,
      name: true,
      startedAt: true,
      durationSec: true,
      totalSets: true,
      totalReps: true,
      totalVolumeKg: true,
    },
  });
}
