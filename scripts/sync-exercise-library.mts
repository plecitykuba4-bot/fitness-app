import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { EXERCISES } from "../prisma/seed-exercises.ts";

const db = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! }),
});

const trainers = await db.trainer.findMany({ select: { id: true } });
let created = 0;

for (const trainer of trainers) {
  for (const exercise of EXERCISES) {
    const existing = await db.exercise.findUnique({
      where: { trainerId_name: { trainerId: trainer.id, name: exercise.name } },
      select: { id: true },
    });
    if (existing) continue;

    await db.exercise.create({
      data: {
        ...exercise,
        trainerId: trainer.id,
        description: `${exercise.instructions.slice(0, 90)}…`,
        trackingType: /plank|výdrž|wall sit/i.test(exercise.name)
          ? "TIME"
          : "WEIGHT_REPS",
      },
    });
    created += 1;
  }
}

console.log(`Knihovna synchronizována: ${created} nových cviků, celkem ${EXERCISES.length} názvů.`);
await db.$disconnect();
