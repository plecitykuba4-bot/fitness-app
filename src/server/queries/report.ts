import "server-only";

import { db } from "@/server/db";
import { startOfWeek } from "@/lib/format";
import {
  buildWeeklyReport,
  weeklyVolumeSeries,
  type ReportWorkout,
  type WeeklyReport,
} from "@/services/reports";

/**
 * Načte podklady a sestaví týdenní report.
 * `clientId` MUSÍ pocházet z autorizační vrstvy.
 */
export async function getWeeklyReport(
  clientId: string,
  weekStartInput: Date = new Date(),
): Promise<WeeklyReport> {
  const weekStart = startOfWeek(weekStartInput);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const prevStart = new Date(weekStart);
  prevStart.setDate(prevStart.getDate() - 7);

  const [workouts, previousWorkouts] = await Promise.all([
    fetchWorkouts(clientId, weekStart, weekEnd),
    fetchWorkouts(clientId, prevStart, weekStart),
  ]);

  const [currentBests, previousBests] = await Promise.all([
    fetchExerciseBests(clientId, weekStart, weekEnd),
    fetchExerciseBests(clientId, prevStart, weekStart),
  ]);

  const exerciseBests = [...currentBests.entries()].map(
    ([exerciseName, currentBestKg]) => ({
      exerciseName,
      currentBestKg,
      previousBestKg: previousBests.get(exerciseName) ?? null,
    }),
  );

  return buildWeeklyReport({
    weekStart,
    workouts,
    previousWeekWorkouts: previousWorkouts,
    exerciseBests,
  });
}

/** Vývoj objemu po týdnech pro graf. */
export async function getWeeklyVolumeSeries(clientId: string, weeks = 12) {
  const from = startOfWeek(new Date());
  from.setDate(from.getDate() - (weeks - 1) * 7);

  const workouts = await db.workout.findMany({
    where: { clientId, status: "COMPLETED", startedAt: { gte: from } },
    select: {
      startedAt: true,
      durationSec: true,
      totalVolumeKg: true,
      totalSets: true,
      totalReps: true,
    },
    orderBy: { startedAt: "asc" },
  });

  return weeklyVolumeSeries(workouts, weeks);
}

async function fetchWorkouts(
  clientId: string,
  from: Date,
  to: Date,
): Promise<ReportWorkout[]> {
  return db.workout.findMany({
    where: {
      clientId,
      status: "COMPLETED",
      startedAt: { gte: from, lt: to },
    },
    select: {
      startedAt: true,
      durationSec: true,
      totalVolumeKg: true,
      totalSets: true,
      totalReps: true,
    },
    orderBy: { startedAt: "asc" },
  });
}

/** Nejtěžší série každého cviku v daném období. */
async function fetchExerciseBests(
  clientId: string,
  from: Date,
  to: Date,
): Promise<Map<string, number>> {
  const sets = await db.workoutSet.findMany({
    where: {
      workoutExercise: {
        workout: {
          clientId,
          status: "COMPLETED",
          startedAt: { gte: from, lt: to },
        },
      },
    },
    select: {
      weightKg: true,
      workoutExercise: {
        select: { exercise: { select: { name: true } } },
      },
    },
  });

  const best = new Map<string, number>();
  for (const set of sets) {
    if (set.weightKg <= 0) continue;
    const name = set.workoutExercise.exercise.name;
    const current = best.get(name);
    if (current === undefined || set.weightKg > current) {
      best.set(name, set.weightKg);
    }
  }
  return best;
}
