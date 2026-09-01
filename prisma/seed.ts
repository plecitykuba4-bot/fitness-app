/**
 * Bootstrap ukázkových dat. Spustí se jen nad prázdnou databází, takže
 * opakovaný deploy nemaže reálné ani již odcvičené tréninky.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import {
  CLIENTS,
  progressionFactor,
  round25,
  makeRandom,
  type ClientSeed,
} from "./seed-clients";
import { EXERCISES } from "./seed-exercises";

const databaseUrl = process.env.DATABASE_URL!;
const db = new PrismaClient({
  // VPS demo běží nad lokální SQLite databází; cloudová produkce dál používá
  // PostgreSQL. Seed musí podporovat obě varianty, aby se čistý server uměl
  // sám naplnit ukázkovými klienty a historií tréninků.
  adapter: databaseUrl.startsWith("file:")
    ? new PrismaBetterSqlite3({ url: databaseUrl })
    : new PrismaPg({ connectionString: databaseUrl }),
});

const DEMO_PASSWORD = "ChangeMe123!";

/**
 * Rozepíše cvik na jednotlivé série.
 *
 * U hlavních cviků (4 série a víc) dělá pyramidu — opakování klesají, váha
 * roste. Právě kvůli tomu jsou série samostatné záznamy: "4 × 8 na jednu
 * váhu" by pyramidu nepopsalo.
 */
function buildSets(
  item: { sets: number; reps: number; weight: number | null },
  strengthFactor: number,
) {
  const base = item.weight ? item.weight * strengthFactor : null;

  return Array.from({ length: item.sets }, (_, index) => {
    const isPyramid = item.sets >= 4 && base !== null;

    // Poslední dvě série pyramidy: o dvě opakování méně, o 5 % víc váhy.
    const step = isPyramid ? Math.min(index, 2) : 0;

    return {
      setNumber: index + 1,
      reps: Math.max(1, item.reps - step),
      targetWeight: base === null ? null : round25(base * (1 + step * 0.05)),
    };
  });
}


type TemplateSeed = {
  name: string;
  description: string;
  estimatedMin: number;
  items: { exercise: string; sets: number; reps: number; weight: number | null; rest: number }[];
};

const TEMPLATES: TemplateSeed[] = [
  {
    name: "PUSH A",
    description: "Prsa, ramena, triceps.",
    estimatedMin: 55,
    items: [
      { exercise: "Bench press", sets: 4, reps: 8, weight: 80, rest: 120 },
      { exercise: "Tlaky s jednoručkami na šikmé lavici", sets: 3, reps: 10, weight: 28, rest: 90 },
      { exercise: "Tlaky na ramena s jednoručkami", sets: 3, reps: 10, weight: 22, rest: 90 },
      { exercise: "Upažování", sets: 3, reps: 12, weight: 10, rest: 60 },
      { exercise: "Tricepsové stahování kladky", sets: 3, reps: 12, weight: 30, rest: 60 },
      { exercise: "Francouzský tlak", sets: 3, reps: 10, weight: 20, rest: 60 },
    ],
  },
  {
    name: "PULL A",
    description: "Záda a biceps.",
    estimatedMin: 55,
    items: [
      { exercise: "Přítahy velké činky v předklonu", sets: 4, reps: 8, weight: 65, rest: 120 },
      { exercise: "Stahování horní kladky", sets: 3, reps: 10, weight: 55, rest: 90 },
      { exercise: "Veslování na spodní kladce", sets: 3, reps: 10, weight: 50, rest: 90 },
      { exercise: "Rozpažování v předklonu", sets: 3, reps: 12, weight: 8, rest: 60 },
      { exercise: "Bicepsový zdvih s velkou činkou", sets: 3, reps: 12, weight: 30, rest: 60 },
      { exercise: "Face pull", sets: 3, reps: 15, weight: 15, rest: 45 },
    ],
  },
  {
    name: "LEGS A",
    description: "Nohy a hýždě.",
    estimatedMin: 60,
    items: [
      { exercise: "Dřep s velkou činkou", sets: 4, reps: 8, weight: 100, rest: 150 },
      { exercise: "Rumunský mrtvý tah", sets: 3, reps: 10, weight: 80, rest: 120 },
      { exercise: "Leg press", sets: 3, reps: 12, weight: 140, rest: 90 },
      { exercise: "Zakopávání na stroji", sets: 3, reps: 12, weight: 35, rest: 60 },
      { exercise: "Plank", sets: 3, reps: 1, weight: null, rest: 60 },
      { exercise: "Výpony ve stoji", sets: 3, reps: 15, weight: 40, rest: 45 },
    ],
  },
  {
    name: "UPPER A",
    description: "Celý horní díl těla.",
    estimatedMin: 50,
    items: [
      { exercise: "Shyby", sets: 4, reps: 6, weight: null, rest: 120 },
      { exercise: "Bench press", sets: 3, reps: 10, weight: 70, rest: 120 },
      { exercise: "Veslování na spodní kladce", sets: 3, reps: 10, weight: 50, rest: 90 },
      { exercise: "Tlaky na ramena s jednoručkami", sets: 3, reps: 10, weight: 20, rest: 90 },
      { exercise: "Kladivové zdvihy", sets: 3, reps: 12, weight: 12, rest: 60 },
    ],
  },
  {
    name: "KARDIO A",
    description: "Kondiční trénink mezi silovými dny.",
    estimatedMin: 35,
    items: [
      { exercise: "Veslovací trenažér", sets: 4, reps: 15, weight: null, rest: 60 },
      { exercise: "Battle ropes", sets: 4, reps: 20, weight: null, rest: 45 },
      { exercise: "Skákání přes švihadlo", sets: 4, reps: 40, weight: null, rest: 45 },
      { exercise: "Horolezec", sets: 3, reps: 20, weight: null, rest: 45 },
      { exercise: "Plank", sets: 3, reps: 1, weight: null, rest: 45 },
    ],
  },
  {
    name: "FULL BODY",
    description: "Celotělový trénink pro začátek týdne.",
    estimatedMin: 45,
    items: [
      { exercise: "Dřep s velkou činkou", sets: 3, reps: 10, weight: 80, rest: 120 },
      { exercise: "Bench press", sets: 3, reps: 10, weight: 65, rest: 120 },
      { exercise: "Stahování horní kladky", sets: 3, reps: 10, weight: 50, rest: 90 },
      { exercise: "Hip thrust", sets: 3, reps: 12, weight: 60, rest: 90 },
      { exercise: "Zkracovačky", sets: 3, reps: 15, weight: null, rest: 45 },
    ],
  },
];


// ---------------------------------------------------------------------------

async function main() {
  const existingUsers = await db.user.count();
  if (existingUsers > 0) {
    console.log("✅ Databáze už obsahuje data — seed se bezpečně přeskočil.");
    return;
  }

  console.log("🌱 Mažu stará data…");
  // Pořadí respektuje cizí klíče.
  await db.notification.deleteMany();
  await db.note.deleteMany();
  await db.workoutSet.deleteMany();
  await db.workoutExercise.deleteMany();
  await db.workout.deleteMany();
  await db.workoutTemplateExercise.deleteMany();
  await db.workoutTemplate.deleteMany();
  await db.personalRecord.deleteMany();
  await db.progressMetric.deleteMany();
  await db.exerciseMedia.deleteMany();
  await db.exercise.deleteMany();
  await db.client.deleteMany();
  await db.trainer.deleteMany();
  await db.session.deleteMany();
  await db.user.deleteMany();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  console.log("👑 Vytvářím trenéra…");
  const trainerUser = await db.user.create({
    data: {
      email: "trainer@example.com",
      passwordHash,
      name: "Milan Eliášek",
      role: "TRAINER",
    },
  });
  const trainer = await db.trainer.create({
    data: {
      userId: trainerUser.id,
      bio: "Osobní trenér se zaměřením na silový trénink.",
    },
  });

  console.log("🏋️  Vytvářím cviky…");
  const exerciseByName = new Map<string, string>();
  for (const ex of EXERCISES) {
    const created = await db.exercise.create({
      data: {
        ...ex,
        trackingType:
          /plank|výdrž|vis|wall sit/i.test(ex.name) ? "TIME" : "WEIGHT_REPS",
        trainerId: trainer.id,
        description: ex.instructions.slice(0, 90) + "…",
      },
    });
    exerciseByName.set(ex.name, created.id);
  }

  console.log("📚 Vytvářím knihovnu šablon trenéra…");
  // Šablony bez klienta = knihovna, ze které trenér kopíruje.
  // Klientské tréninky vznikají níže jako samostatné kopie.
  for (const tpl of TEMPLATES) {
    await db.workoutTemplate.create({
      data: {
        trainerId: trainer.id,
        clientId: null,
        name: tpl.name,
        description: tpl.description,
        estimatedMin: tpl.estimatedMin,
        exercises: {
          create: tpl.items.map((item, index) => ({
            exerciseId: exerciseByName.get(item.exercise)!,
            sortOrder: index,
            restSeconds: item.rest,
            sets: { create: buildSets(item, 1) },
          })),
        },
      },
    });
  }

  console.log("👥 Vytvářím klienty, jejich vlastní tréninky a historii…\n");

  for (const [i, c] of CLIENTS.entries()) {
    const user = await db.user.create({
      data: { email: c.email, passwordHash, name: c.name, role: "CLIENT" },
    });
    const client = await db.client.create({
      data: {
        userId: user.id,
        trainerId: trainer.id,
        birthYear: c.birthYear,
        heightCm: c.heightCm,
        startedAt: weeksAgo(c.weeksOfHistory),
      },
    });

    await db.trainingPass.create({
      data: {
        clientId: client.id,
        totalSessions: 10,
        usedSessions: Math.min(3 + (i % 6), 9),
      },
    });

    // Každý klient má vlastní tréninky, ne sdílené. Váhy jsou rovnou
    // přizpůsobené jeho síle, takže se dvěma klientům nepletou cílové váhy.
    const templateByName = new Map<string, string>();
    for (const tplName of c.plan) {
      const tpl = TEMPLATES.find((t) => t.name === tplName)!;
      const created = await db.workoutTemplate.create({
        data: {
          trainerId: trainer.id,
          clientId: client.id,
          name: tpl.name,
          description: tpl.description,
          estimatedMin: tpl.estimatedMin,
          exercises: {
            create: tpl.items.map((item, index) => ({
              exerciseId: exerciseByName.get(item.exercise)!,
              sortOrder: index,
              restSeconds: item.rest,
              sets: { create: buildSets(item, c.strengthFactor) },
            })),
          },
        },
      });
      templateByName.set(tpl.name, created.id);
    }

    const stats = await seedHistory(
      client.id,
      c,
      exerciseByName,
      templateByName,
      i,
    );

    if (c.trainerNote) {
      await db.note.create({
        data: {
          authorId: trainerUser.id,
          scope: "CLIENT",
          body: c.trainerNote,
          clientId: client.id,
          createdAt: weeksAgo(1),
        },
      });
    }

    if (c.clientNote && stats.recentWorkoutIds.length > 0) {
      const target =
        stats.recentWorkoutIds[
          Math.min(c.clientNote.workoutsAgo, stats.recentWorkoutIds.length - 1)
        ];
      await db.note.create({
        data: {
          authorId: user.id,
          scope: "WORKOUT",
          body: c.clientNote.body,
          workoutId: target,
        },
      });
      await db.notification.create({
        data: {
          userId: trainerUser.id,
          type: "NOTE_ADDED",
          title: "Poznámka k tréninku",
          body: c.name + ": " + c.clientNote.body.slice(0, 100),
          linkHref: "/klienti/" + client.id,
          createdAt: daysAgo(3),
        },
      });
    }

    // Oznámení trenérovi o posledních dokončených trénincích.
    for (const [n, id] of stats.recentWorkoutIds.slice(0, 2).entries()) {
      const w = await db.workout.findUnique({ where: { id } });
      if (!w) continue;
      await db.notification.create({
        data: {
          userId: trainerUser.id,
          type: "WORKOUT_COMPLETED",
          title: "Dokončený trénink",
          body: c.name + " dokončil trénink " + w.name + ".",
          linkHref: "/klienti/" + client.id,
          createdAt: w.completedAt ?? w.startedAt,
          readAt: n === 0 ? null : new Date(),
        },
      });
    }

    console.log(
      "   " +
        c.name.padEnd(18) +
        String(stats.workouts).padStart(3) +
        " tréninků · " +
        c.trajectory.padEnd(10) +
        " · " +
        stats.volume.toLocaleString("cs-CZ") +
        " kg",
    );
  }

  console.log("\n✅ Hotovo.\n");
  console.log("   ⚠️  DEVELOPMENT ONLY — demo přihlašovací údaje:");
  console.log("   Trenér: trainer@example.com / " + DEMO_PASSWORD);
  for (const c of CLIENTS) {
    console.log("   Klient: " + c.email + " / " + DEMO_PASSWORD);
  }
}

/**
 * Vygeneruje historii tréninků podle trajektorie klienta.
 * Vrací souhrn pro výpis do konzole a ID posledních tréninků.
 */
async function seedHistory(
  clientId: string,
  seed: ClientSeed,
  exerciseByName: Map<string, string>,
  templateByName: Map<string, string>,
  clientIndex: number,
): Promise<{ workouts: number; volume: number; recentWorkoutIds: string[] }> {
  const rnd = makeRandom(1000 + clientIndex * 137);
  const bestByExercise = new Map<
    string,
    { weight: number; reps: number; at: Date }
  >();

  let workoutCount = 0;
  let volumeTotal = 0;
  const created: { id: string; at: Date }[] = [];

  const total = seed.weeksOfHistory;

  for (let weekIndex = 0; weekIndex < total; weekIndex++) {
    // weeksBack: total-1 = nejstarší týden, 0 = tento týden
    const weeksBack = total - 1 - weekIndex;

    if (seed.skippedWeeks?.includes(weeksBack)) continue;

    const factor = progressionFactor(seed.trajectory, weekIndex, total);

    for (let dayIndex = 0; dayIndex < seed.plan.length; dayIndex++) {
      // Vynechané tréninky — reálná docházka nikdy není stoprocentní.
      if (rnd() < seed.missRate) continue;

      const tplName = seed.plan[dayIndex];
      const tpl = TEMPLATES.find((t) => t.name === tplName)!;

      const startedAt = workoutDate(weeksBack, dayIndex);
      // Budoucí tréninky negenerujeme.
      if (startedAt.getTime() > Date.now()) continue;

      const durationSec = Math.round((44 + rnd() * 18) * 60);

      let volume = 0;
      let sets = 0;
      let reps = 0;

      const workout = await db.workout.create({
        data: {
          clientId,
          templateId: templateByName.get(tplName)!,
          name: tplName,
          status: "COMPLETED",
          startedAt,
          completedAt: new Date(startedAt.getTime() + durationSec * 1000),
          durationSec,
        },
      });

      for (let i = 0; i < tpl.items.length; i++) {
        const item = tpl.items[i];
        const exerciseId = exerciseByName.get(item.exercise)!;
        const base = item.weight;

        const target = base
          ? round25(base * seed.strengthFactor * factor)
          : null;

        const we = await db.workoutExercise.create({
          data: {
            workoutId: workout.id,
            exerciseId,
            sortOrder: i,
            restSeconds: item.rest,
            targets: {
              create: Array.from({ length: item.sets }, (_, idx) => ({
                setNumber: idx + 1,
                reps: item.reps,
                targetWeight: target,
              })),
            },
          },
        });

        for (let s = 1; s <= item.sets; s++) {
          // Drobný rozptyl mezi sériemi, ať data nevypadají uměle.
          const jitter = base ? (rnd() < 0.25 ? -2.5 : 0) : 0;
          const weight = target ? Math.max(0, target + jitter) : 0;
          const repCount = Math.max(
            1,
            item.reps - (s > 2 ? 1 : 0) - (rnd() < 0.2 ? 1 : 0),
          );

          await db.workoutSet.create({
            data: {
              workoutExerciseId: we.id,
              setNumber: s,
              weightKg: weight,
              reps: repCount,
              completedAt: new Date(startedAt.getTime() + s * 180_000),
              clientKey: "seed-" + workout.id + "-" + i + "-" + s,
            },
          });

          volume += weight * repCount;
          sets += 1;
          reps += repCount;

          const best = bestByExercise.get(exerciseId);
          if (weight > 0 && (!best || weight > best.weight)) {
            bestByExercise.set(exerciseId, {
              weight,
              reps: repCount,
              at: startedAt,
            });
          }
        }
      }

      await db.workout.update({
        where: { id: workout.id },
        data: {
          totalVolumeKg: Math.round(volume * 10) / 10,
          totalSets: sets,
          totalReps: reps,
        },
      });

      workoutCount += 1;
      volumeTotal += volume;
      created.push({ id: workout.id, at: startedAt });
    }
  }

  for (const [exerciseId, best] of bestByExercise) {
    await db.personalRecord.create({
      data: {
        clientId,
        exerciseId,
        bestWeightKg: best.weight,
        repsAtBest: best.reps,
        achievedAt: best.at,
      },
    });
  }

  created.sort((a, b) => b.at.getTime() - a.at.getTime());

  return {
    workouts: workoutCount,
    volume: Math.round(volumeTotal),
    recentWorkoutIds: created.map((c) => c.id),
  };
}

/** Datum tréninku: daný počet týdnů zpět, posunutý podle dne v plánu. */
function workoutDate(weeksBack: number, dayIndex: number): Date {
  const d = new Date();
  d.setHours(17, 30, 0, 0);
  // Pondělí daného týdne.
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  d.setDate(d.getDate() - weeksBack * 7);
  // PLAN_WEEKDAYS = Po, St, Pá, Ne → posun 0, 2, 4, 6 dnů
  d.setDate(d.getDate() + dayIndex * 2);
  return d;
}

function weeksAgo(weeks: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - weeks * 7);
  return d;
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

main()
  .catch((e) => {
    console.error("❌ Seed selhal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
