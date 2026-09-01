import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
const db = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! }) });
const w = await db.workout.findFirst({
  where: { status: "IN_PROGRESS", name: "PUSH A" },
  orderBy: { startedAt: "desc" },
  include: { exercises: { include: { sets: true, targets: true, exercise: true }, orderBy: { sortOrder: "asc" } } },
});
console.log("Workout:", w?.id, w?.name);
for (const e of w?.exercises ?? []) {
  console.log(" ", e.exercise.name, "targets:", e.targets.map(t=>`s${t.setNumber}(${t.reps}x${t.targetWeight})`).join(","), "| logged:", e.sets.map(s=>`s${s.setNumber}=${s.weightKg}x${s.reps}`).join(","));
}
await db.$disconnect();
