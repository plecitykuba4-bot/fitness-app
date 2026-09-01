"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/server/db";
import { requireClient } from "@/server/auth/guards";
import { setVolume } from "@/services/progress";

/**
 * Akce workout módu.
 * Každá znovu ověřuje vlastnictví tréninku — klient nesmí zapsat sérii
 * do cizího tréninku ani podvrženým ID.
 */

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const GENERIC_ERROR =
  "Nepodařilo se uložit data. Zkuste to prosím znovu.";

/** Založí trénink podle šablony a vrátí jeho ID. */
export async function startWorkoutAction(
  templateId: string,
): Promise<ActionResult<{ workoutId: string }>> {
  try {
    const client = await requireClient();

    // Trénink musí patřit přímo tomuto klientovi — každý má vlastní.
    const template = await db.workoutTemplate.findFirst({
      where: { id: templateId, clientId: client.clientId },
      include: {
        exercises: {
          orderBy: { sortOrder: "asc" },
          include: { sets: { orderBy: { setNumber: "asc" } } },
        },
      },
    });

    if (!template) {
      return { ok: false, error: "Tento trénink není dostupný." };
    }

    // Rozcvičený trénink nezakládáme podruhé — vrátíme ten stávající.
    const existing = await db.workout.findFirst({
      where: { clientId: client.clientId, status: "IN_PROGRESS" },
    });
    if (existing) return { ok: true, data: { workoutId: existing.id } };

    const workout = await db.workout.create({
      data: {
        clientId: client.clientId,
        templateId: template.id,
        name: template.name,
        status: "IN_PROGRESS",
        startedAt: new Date(),
        exercises: {
          create: template.exercises.map((item) => ({
            exerciseId: item.exerciseId,
            sortOrder: item.sortOrder,
            restSeconds: item.restSeconds,
            tempo: item.tempo,
            note: item.note,
            // Snapshot předpisu — pozdější úprava šablony trenérem už
            // nezmění trénink, který klient právě cvičí.
            targets: {
              create: item.sets.map((set) => ({
                setNumber: set.setNumber,
                reps: set.reps,
                targetWeight: set.targetWeight,
              })),
            },
          })),
        },
      },
    });

    revalidatePath("/dnes");
    return { ok: true, data: { workoutId: workout.id } };
  } catch (error) {
    console.error("startWorkoutAction", error);
    return { ok: false, error: GENERIC_ERROR };
  }
}

const LogSetSchema = z.object({
  workoutExerciseId: z.string().min(1),
  setNumber: z.number().int().min(1).max(20),
  weightKg: z.number().min(0).max(500),
  reps: z.number().int().min(0).max(3600),
  /** Klientem generovaný klíč — umožňuje bezpečné opakované odeslání. */
  clientKey: z.string().min(1).max(100),
});

export type LogSetInput = z.infer<typeof LogSetSchema>;

/**
 * Zapíše sérii. Idempotentní: opakované odeslání se stejným `clientKey`
 * existující záznam přepíše místo vytvoření duplicity. Díky tomu může
 * klient bez následků odeslat sérii znovu po výpadku sítě.
 */
export async function logSetAction(
  input: LogSetInput,
): Promise<ActionResult<{ setId: string }>> {
  try {
    const client = await requireClient();
    const parsed = LogSetSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: "Zadané hodnoty nejsou platné." };
    }

    // Cvik musí patřit do tréninku tohoto klienta.
    const workoutExercise = await db.workoutExercise.findFirst({
      where: {
        id: parsed.data.workoutExerciseId,
        workout: { clientId: client.clientId, status: "IN_PROGRESS" },
      },
      select: { id: true, exerciseId: true, workoutId: true },
    });

    if (!workoutExercise) {
      return { ok: false, error: "Tento trénink už není otevřený." };
    }

    const set = await db.workoutSet.upsert({
      where: {
        workoutExerciseId_clientKey: {
          workoutExerciseId: workoutExercise.id,
          clientKey: parsed.data.clientKey,
        },
      },
      create: {
        workoutExerciseId: workoutExercise.id,
        setNumber: parsed.data.setNumber,
        weightKg: parsed.data.weightKg,
        reps: parsed.data.reps,
        clientKey: parsed.data.clientKey,
      },
      update: {
        weightKg: parsed.data.weightKg,
        reps: parsed.data.reps,
      },
    });

    await updatePersonalRecord(
      client.clientId,
      workoutExercise.exerciseId,
      parsed.data.weightKg,
      parsed.data.reps,
    );

    return { ok: true, data: { setId: set.id } };
  } catch (error) {
    console.error("logSetAction", error);
    return { ok: false, error: GENERIC_ERROR };
  }
}

/** Uzavře trénink a spočítá souhrn. */
export async function finishWorkoutAction(
  workoutId: string,
): Promise<ActionResult<{ workoutId: string }>> {
  try {
    const client = await requireClient();

    const workout = await db.workout.findFirst({
      where: { id: workoutId, clientId: client.clientId },
      include: {
        exercises: {
          include: {
            sets: true,
            exercise: { select: { trackingType: true } },
          },
        },
      },
    });

    if (!workout) return { ok: false, error: "Trénink nebyl nalezen." };
    if (workout.status === "COMPLETED") {
      return { ok: true, data: { workoutId: workout.id } };
    }

    const sets = workout.exercises.flatMap((e) => e.sets);
    const completedAt = new Date();

    await db.workout.update({
      where: { id: workout.id },
      data: {
        status: "COMPLETED",
        completedAt,
        durationSec: Math.round(
          (completedAt.getTime() - workout.startedAt.getTime()) / 1000,
        ),
        totalSets: sets.length,
        totalReps: workout.exercises.reduce(
          (sum, item) =>
            sum +
            (item.exercise.trackingType === "TIME"
              ? 0
              : item.sets.reduce((setSum, set) => setSum + set.reps, 0)),
          0,
        ),
        totalVolumeKg:
          Math.round(sets.reduce((sum, s) => sum + setVolume(s), 0) * 10) / 10,
      },
    });

    // Trenér se má o dokončeném tréninku dozvědět.
    const trainerUser = await db.client.findUnique({
      where: { id: client.clientId },
      select: { trainer: { select: { userId: true } } },
    });

    if (trainerUser) {
      await db.notification.create({
        data: {
          userId: trainerUser.trainer.userId,
          type: "WORKOUT_COMPLETED",
          title: "Dokončený trénink",
          body: `${client.name} dokončil trénink ${workout.name}.`,
          linkHref: `/klienti/${client.clientId}`,
        },
      });
    }

    revalidatePath("/dnes");
    revalidatePath("/historie");
    revalidatePath("/pokrok");

    // Dokončený trénink se zobrazuje také v trenérském přehledu,
    // seznamu klientů, detailu klienta a analytice. Bez explicitního
    // zneplatnění mohly tyto stránky po přepnutí účtu ukazovat stará data.
    revalidatePath("/prehled");
    revalidatePath("/klienti");
    revalidatePath(`/klienti/${client.clientId}`);
    revalidatePath("/analytika");
    revalidatePath(`/analytika/${client.clientId}`);
    return { ok: true, data: { workoutId: workout.id } };
  } catch (error) {
    console.error("finishWorkoutAction", error);
    return { ok: false, error: GENERIC_ERROR };
  }
}

/**
 * Smaže zapsanou sérii (odškrtnutí zpět).
 * Skutečné smazání v DB, ne jen skrytí v UI — jinak by se po reloadu
 * série znovu tvářila jako hotová.
 */
export async function deleteLoggedSetAction(
  workoutExerciseId: string,
  setNumber: number,
): Promise<ActionResult> {
  try {
    const client = await requireClient();

    const workoutExercise = await db.workoutExercise.findFirst({
      where: {
        id: workoutExerciseId,
        workout: { clientId: client.clientId, status: "IN_PROGRESS" },
      },
      select: { id: true },
    });
    if (!workoutExercise) {
      return { ok: false, error: "Tento trénink už není otevřený." };
    }

    await db.workoutSet.deleteMany({
      where: { workoutExerciseId, setNumber },
    });

    return { ok: true, data: undefined };
  } catch (error) {
    console.error("deleteLoggedSetAction", error);
    return { ok: false, error: GENERIC_ERROR };
  }
}

const EditSetSchema = z.object({
  workoutExerciseId: z.string().min(1),
  setNumber: z.number().int().min(1).max(50),
  reps: z.number().int().min(0).max(3600),
  weightKg: z.number().min(0).max(500),
});

/**
 * Přepíše hodnoty série — reps a váhu. Pokud už je série zapsaná jako
 * hotová, upraví zapsaný výkon. Pokud ještě hotová není, upraví předpis
 * (co má klient udělat), tak aby po dokončení sedělo zobrazené číslo.
 */
export async function editSetValueAction(
  input: z.infer<typeof EditSetSchema>,
): Promise<ActionResult> {
  try {
    const client = await requireClient();
    const parsed = EditSetSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: "Zadané hodnoty nejsou platné." };
    }

    const { workoutExerciseId, setNumber, reps, weightKg } = parsed.data;

    const workoutExercise = await db.workoutExercise.findFirst({
      where: {
        id: workoutExerciseId,
        workout: { clientId: client.clientId, status: "IN_PROGRESS" },
      },
      select: { id: true },
    });
    if (!workoutExercise) {
      return { ok: false, error: "Tento trénink už není otevřený." };
    }

    const loggedSet = await db.workoutSet.findUnique({
      where: { workoutExerciseId_setNumber: { workoutExerciseId, setNumber } },
    });

    if (loggedSet) {
      await db.workoutSet.update({
        where: { id: loggedSet.id },
        data: { reps, weightKg },
      });
    } else {
      await db.workoutExerciseTarget.updateMany({
        where: { workoutExerciseId, setNumber },
        data: { reps, targetWeight: weightKg > 0 ? weightKg : null },
      });
    }

    return { ok: true, data: undefined };
  } catch (error) {
    console.error("editSetValueAction", error);
    return { ok: false, error: GENERIC_ERROR };
  }
}

/** Přidá další sérii k rozcvičenému cviku — kopíruje hodnoty z poslední série. */
export async function addSetToWorkoutExerciseAction(
  workoutExerciseId: string,
): Promise<ActionResult> {
  try {
    const client = await requireClient();

    const workoutExercise = await db.workoutExercise.findFirst({
      where: {
        id: workoutExerciseId,
        workout: { clientId: client.clientId, status: "IN_PROGRESS" },
      },
      include: { targets: { orderBy: { setNumber: "desc" }, take: 1 } },
    });
    if (!workoutExercise) {
      return { ok: false, error: "Tento trénink už není otevřený." };
    }

    const last = workoutExercise.targets[0];

    await db.workoutExerciseTarget.create({
      data: {
        workoutExerciseId,
        setNumber: (last?.setNumber ?? 0) + 1,
        reps: last?.reps ?? 10,
        targetWeight: last?.targetWeight ?? null,
      },
    });

    return { ok: true, data: undefined };
  } catch (error) {
    console.error("addSetToWorkoutExerciseAction", error);
    return { ok: false, error: GENERIC_ERROR };
  }
}

/**
 * Odebere jednu sérii z rozcvičeného cviku — smaže předpis i případně
 * zapsaný výkon. Cvik musí mít po odebrání alespoň jednu sérii.
 */
export async function removeSetFromWorkoutExerciseAction(
  workoutExerciseId: string,
  setNumber: number,
): Promise<ActionResult> {
  try {
    const client = await requireClient();

    const workoutExercise = await db.workoutExercise.findFirst({
      where: {
        id: workoutExerciseId,
        workout: { clientId: client.clientId, status: "IN_PROGRESS" },
      },
      include: { targets: true },
    });
    if (!workoutExercise) {
      return { ok: false, error: "Tento trénink už není otevřený." };
    }

    if (workoutExercise.targets.length <= 1) {
      return {
        ok: false,
        error:
          "Cvik musí mít alespoň jednu sérii. Chcete-li ho úplně vynechat, odeberte celý cvik.",
      };
    }

    await db.$transaction([
      db.workoutExerciseTarget.deleteMany({
        where: { workoutExerciseId, setNumber },
      }),
      db.workoutSet.deleteMany({ where: { workoutExerciseId, setNumber } }),
    ]);

    return { ok: true, data: undefined };
  } catch (error) {
    console.error("removeSetFromWorkoutExerciseAction", error);
    return { ok: false, error: GENERIC_ERROR };
  }
}

/**
 * Přidá cvik do rozcvičeného tréninku. Cvik musí patřit trenérovi tohoto
 * klienta — klient si nemůže přidat cizí cvik.
 */
export async function addExerciseToWorkoutAction(
  workoutId: string,
  exerciseId: string,
): Promise<ActionResult> {
  try {
    const client = await requireClient();

    const workout = await db.workout.findFirst({
      where: { id: workoutId, clientId: client.clientId, status: "IN_PROGRESS" },
      include: { exercises: { orderBy: { sortOrder: "desc" }, take: 1 } },
    });
    if (!workout) return { ok: false, error: "Tento trénink už není otevřený." };

    const clientRow = await db.client.findUnique({
      where: { id: client.clientId },
      select: { trainerId: true },
    });
    if (!clientRow) return { ok: false, error: GENERIC_ERROR };

    const exercise = await db.exercise.findFirst({
      where: { id: exerciseId, trainerId: clientRow.trainerId },
      select: { id: true, trackingType: true },
    });
    if (!exercise) return { ok: false, error: "Cvik nebyl nalezen." };

    const nextOrder = (workout.exercises[0]?.sortOrder ?? -1) + 1;

    await db.workoutExercise.create({
      data: {
        workoutId,
        exerciseId: exercise.id,
        sortOrder: nextOrder,
        restSeconds: 90,
        targets: {
          create: [
            {
              setNumber: 1,
              reps: exercise.trackingType === "TIME" ? 60 : 10,
              targetWeight: null,
            },
          ],
        },
      },
    });

    return { ok: true, data: undefined };
  } catch (error) {
    console.error("addExerciseToWorkoutAction", error);
    return { ok: false, error: GENERIC_ERROR };
  }
}

/**
 * Odebere cvik z rozcvičeného tréninku úplně. Trénink musí mít po odebrání
 * alespoň jeden cvik.
 */
export async function removeExerciseFromWorkoutAction(
  workoutExerciseId: string,
): Promise<ActionResult> {
  try {
    const client = await requireClient();

    const workoutExercise = await db.workoutExercise.findFirst({
      where: {
        id: workoutExerciseId,
        workout: { clientId: client.clientId, status: "IN_PROGRESS" },
      },
      include: { workout: { include: { exercises: true } } },
    });
    if (!workoutExercise) {
      return { ok: false, error: "Tento trénink už není otevřený." };
    }

    if (workoutExercise.workout.exercises.length <= 1) {
      return {
        ok: false,
        error: "Trénink musí mít alespoň jeden cvik.",
      };
    }

    await db.workoutExercise.delete({ where: { id: workoutExercise.id } });

    return { ok: true, data: undefined };
  } catch (error) {
    console.error("removeExerciseFromWorkoutAction", error);
    return { ok: false, error: GENERIC_ERROR };
  }
}

/** Aktualizuje osobní rekord, pokud je váha vyšší než dosavadní maximum. */
async function updatePersonalRecord(
  clientId: string,
  exerciseId: string,
  weightKg: number,
  reps: number,
): Promise<void> {
  if (weightKg <= 0) return;

  const existing = await db.personalRecord.findUnique({
    where: { clientId_exerciseId: { clientId, exerciseId } },
  });

  if (existing && existing.bestWeightKg >= weightKg) return;

  await db.personalRecord.upsert({
    where: { clientId_exerciseId: { clientId, exerciseId } },
    create: {
      clientId,
      exerciseId,
      bestWeightKg: weightKg,
      repsAtBest: reps,
      achievedAt: new Date(),
    },
    update: {
      bestWeightKg: weightKg,
      repsAtBest: reps,
      achievedAt: new Date(),
    },
  });
}
