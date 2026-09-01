import "server-only";

import { db } from "@/server/db";
import { startOfWeek } from "@/lib/format";
import { completionRate, trendChange } from "@/services/progress";

/**
 * Dotazy pro trenérský přehled.
 * Všechny jsou vždy omezené na `trainerId` — nikdy nečti napříč trenéry.
 */

const INACTIVE_DAYS = 10;

export async function getTrainerOverview(trainerId: string) {
  const weekStart = startOfWeek(new Date());

  const [activeClients, allClients, weekWorkouts] = await Promise.all([
    db.client.count({ where: { trainerId, status: "ACTIVE" } }),
    db.client.findMany({
      where: { trainerId },
      select: { id: true, user: { select: { name: true } } },
    }),
    db.workout.findMany({
      where: {
        client: { trainerId },
        startedAt: { gte: weekStart },
      },
      select: { id: true, status: true, clientId: true },
    }),
  ]);

  const completed = weekWorkouts.filter((w) => w.status === "COMPLETED").length;

  // Poslední trénink každého klienta — pro odhalení těch, kdo vypadli.
  const lastWorkouts = await db.workout.findMany({
    where: { client: { trainerId }, status: "COMPLETED" },
    orderBy: { startedAt: "desc" },
    select: {
      id: true,
      name: true,
      startedAt: true,
      clientId: true,
      client: { select: { user: { select: { name: true } } } },
    },
    take: 200,
  });

  const lastByClient = new Map<string, (typeof lastWorkouts)[number]>();
  for (const w of lastWorkouts) {
    if (!lastByClient.has(w.clientId)) lastByClient.set(w.clientId, w);
  }

  const threshold = Date.now() - INACTIVE_DAYS * 86_400_000;
  const inactiveClients = allClients
    .map((c) => ({
      id: c.id,
      name: c.user.name,
      lastWorkoutAt: lastByClient.get(c.id)?.startedAt ?? null,
    }))
    .filter(
      (c) =>
        c.lastWorkoutAt === null || c.lastWorkoutAt.getTime() < threshold,
    );

  return {
    activeClients,
    weekWorkoutCount: weekWorkouts.length,
    completionRate: completionRate(completed, weekWorkouts.length),
    averageProgress: await getAverageProgress(trainerId),
    inactiveClients,
    recentActivity: lastWorkouts.slice(0, 8).map((w) => ({
      id: w.id,
      clientId: w.clientId,
      clientName: w.client.user.name,
      workoutName: w.name,
      startedAt: w.startedAt,
    })),
  };
}

/**
 * Průměrná změna objemu mezi prvním a posledním tréninkovým týdnem
 * napříč všemi klienty trenéra.
 */
async function getAverageProgress(trainerId: string): Promise<number> {
  const workouts = await db.workout.findMany({
    where: { client: { trainerId }, status: "COMPLETED" },
    select: { clientId: true, startedAt: true, totalVolumeKg: true },
    orderBy: { startedAt: "asc" },
  });

  const byClient = new Map<string, number[]>();
  for (const w of workouts) {
    if (w.totalVolumeKg == null) continue;
    const list = byClient.get(w.clientId) ?? [];
    list.push(w.totalVolumeKg);
    byClient.set(w.clientId, list);
  }

  const changes = [...byClient.values()]
    .filter((values) => values.length >= 2)
    .map((values) => trendChange(values));

  if (changes.length === 0) return 0;
  return (
    Math.round((changes.reduce((a, b) => a + b, 0) / changes.length) * 10) / 10
  );
}

export async function getTrainerClients(trainerId: string) {
  const clients = await db.client.findMany({
    where: { trainerId },
    orderBy: { createdAt: "asc" },
    include: {
      user: { select: { name: true, email: true, avatarKey: true } },
      _count: {
        select: {
          templates: true,
          workouts: { where: { status: "COMPLETED" } },
        },
      },
    },
  });

  const lastWorkouts = await db.workout.findMany({
    where: { client: { trainerId }, status: "COMPLETED" },
    orderBy: { startedAt: "desc" },
    select: { clientId: true, startedAt: true, name: true },
  });

  const lastByClient = new Map<string, { startedAt: Date; name: string }>();
  for (const w of lastWorkouts) {
    if (!lastByClient.has(w.clientId)) lastByClient.set(w.clientId, w);
  }

  return clients.map((c) => ({
    id: c.id,
    name: c.user.name,
    email: c.user.email,
    status: c.status,
    planCount: c._count.templates,
    workoutCount: c._count.workouts,
    lastWorkout: lastByClient.get(c.id) ?? null,
  }));
}
