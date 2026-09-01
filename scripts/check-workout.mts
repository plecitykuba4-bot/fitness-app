import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const db = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! }),
});

const w = await db.workout.findFirst({
  where: { status: "IN_PROGRESS" },
  include: { exercises: { include: { sets: true, exercise: true }, orderBy: { sortOrder: "asc" } } },
});
console.log("Trénink:", w?.name, "| status:", w?.status, "| start:", w?.startedAt.toISOString());
for (const e of w?.exercises ?? []) {
  if (e.sets.length) console.log(` ${e.exercise.name}:`, e.sets.map(s => `s${s.setNumber} ${s.weightKg}kg×${s.reps} key=${s.clientKey.slice(-12)}`).join(", "));
}
const pr = await db.personalRecord.findFirst({
  where: { exercise: { name: "Bench press" }, client: { user: { email: "petr.novak@example.com" } } },
});
console.log("PR bench:", pr?.bestWeightKg, "kg ×", pr?.repsAtBest);
await db.$disconnect();
