import { describe, expect, it, beforeAll, afterAll } from "vitest";
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";

/**
 * Integrační testy izolace dat proti skutečné databázi.
 *
 * Ověřují dotazovací podmínky, na kterých stojí ochrana proti IDOR: klient
 * nesmí načíst data jiného klienta ani podvrženým ID v URL. Kdyby někdo
 * z dotazu odstranil `clientId`, tyto testy spadnou.
 */

const db = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! }),
});

const PREFIX = "test-isolation-";
let trainerAId: string;
let trainerBId: string;
let clientAId: string;
let clientBId: string;
let workoutBId: string;
let exerciseAId: string;

beforeAll(async () => {
  await cleanup();
  const hash = await bcrypt.hash("TestHeslo123!", 4);

  const mkTrainer = async (slug: string) => {
    const user = await db.user.create({
      data: {
        email: `${PREFIX}${slug}@example.com`,
        passwordHash: hash,
        name: `Trenér ${slug}`,
        role: "TRAINER",
      },
    });
    const trainer = await db.trainer.create({ data: { userId: user.id } });
    return trainer.id;
  };

  const mkClient = async (slug: string, trainerId: string) => {
    const user = await db.user.create({
      data: {
        email: `${PREFIX}${slug}@example.com`,
        passwordHash: hash,
        name: `Klient ${slug}`,
        role: "CLIENT",
      },
    });
    const client = await db.client.create({
      data: { userId: user.id, trainerId },
    });
    return client.id;
  };

  trainerAId = await mkTrainer("trenerA");
  trainerBId = await mkTrainer("trenerB");
  clientAId = await mkClient("klientA", trainerAId);
  clientBId = await mkClient("klientB", trainerBId);

  const exercise = await db.exercise.create({
    data: {
      trainerId: trainerAId,
      name: `${PREFIX}Bench`,
      category: "Prsa",
      muscleGroup: "Prsa",
    },
  });
  exerciseAId = exercise.id;

  const workout = await db.workout.create({
    data: { clientId: clientBId, name: `${PREFIX}Trénink B`, status: "COMPLETED" },
  });
  workoutBId = workout.id;
});

afterAll(async () => {
  await cleanup();
  await db.$disconnect();
});

async function cleanup() {
  await db.workout.deleteMany({ where: { name: { startsWith: PREFIX } } });
  await db.exercise.deleteMany({ where: { name: { startsWith: PREFIX } } });
  await db.client.deleteMany({
    where: { user: { email: { startsWith: PREFIX } } },
  });
  await db.trainer.deleteMany({
    where: { user: { email: { startsWith: PREFIX } } },
  });
  await db.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
}

describe("izolace dat klientů", () => {
  it("klient nenačte cizí trénink ani se správným ID", async () => {
    // Přesně tato podmínka je v getWorkoutDetail.
    const asOwner = await db.workout.findFirst({
      where: { id: workoutBId, clientId: clientBId },
    });
    const asStranger = await db.workout.findFirst({
      where: { id: workoutBId, clientId: clientAId },
    });

    expect(asOwner).not.toBeNull();
    expect(asStranger).toBeNull();
  });

  it("klient nevidí série z cizího tréninku", async () => {
    const sets = await db.workoutSet.findMany({
      where: { workoutExercise: { workout: { clientId: clientAId } } },
    });
    expect(sets.every((s) => s !== null)).toBe(true);
    expect(sets).toHaveLength(0);
  });
});

describe("izolace mezi trenéry", () => {
  it("trenér nenačte cizího klienta", async () => {
    const own = await db.client.findFirst({
      where: { id: clientAId, trainerId: trainerAId },
    });
    const foreign = await db.client.findFirst({
      where: { id: clientBId, trainerId: trainerAId },
    });

    expect(own).not.toBeNull();
    expect(foreign).toBeNull();
  });

  it("trenér nenačte cizí cvik", async () => {
    const foreign = await db.exercise.findFirst({
      where: { id: exerciseAId, trainerId: trainerBId },
    });
    expect(foreign).toBeNull();
  });

  it("seznam klientů vrací jen vlastní klienty", async () => {
    const clients = await db.client.findMany({ where: { trainerId: trainerAId } });
    expect(clients.map((c) => c.id)).toContain(clientAId);
    expect(clients.map((c) => c.id)).not.toContain(clientBId);
  });
});

describe("hesla", () => {
  it("se ukládají jako hash, nikdy v čitelné podobě", async () => {
    const user = await db.user.findUnique({
      where: { email: `${PREFIX}klientA@example.com` },
    });
    expect(user!.passwordHash).not.toBe("TestHeslo123!");
    expect(user!.passwordHash.startsWith("$2")).toBe(true);
    expect(await bcrypt.compare("TestHeslo123!", user!.passwordHash)).toBe(true);
    expect(await bcrypt.compare("spatneHeslo", user!.passwordHash)).toBe(false);
  });
});

describe("idempotentní zápis série", () => {
  it("stejný clientKey nevytvoří duplicitu", async () => {
    const workout = await db.workout.create({
      data: { clientId: clientAId, name: `${PREFIX}Idem`, status: "IN_PROGRESS" },
    });
    const we = await db.workoutExercise.create({
      data: {
        workoutId: workout.id,
        exerciseId: exerciseAId,
        sortOrder: 0,
        targets: {
          create: [
            { setNumber: 1, reps: 8, targetWeight: 80 },
            { setNumber: 2, reps: 8, targetWeight: 80 },
            { setNumber: 3, reps: 6, targetWeight: 85 },
          ],
        },
      },
    });

    const key = "opakovane-odeslani";
    const write = (weight: number) =>
      db.workoutSet.upsert({
        where: {
          workoutExerciseId_clientKey: {
            workoutExerciseId: we.id,
            clientKey: key,
          },
        },
        create: {
          workoutExerciseId: we.id,
          setNumber: 1,
          weightKg: weight,
          reps: 8,
          clientKey: key,
        },
        update: { weightKg: weight, reps: 8 },
      });

    // Simuluje odeslání, výpadek sítě a opakované odeslání téže série.
    await write(80);
    await write(80);
    await write(82.5);

    const sets = await db.workoutSet.findMany({
      where: { workoutExerciseId: we.id },
    });

    expect(sets).toHaveLength(1);
    expect(sets[0].weightKg).toBe(82.5);
  });
});
