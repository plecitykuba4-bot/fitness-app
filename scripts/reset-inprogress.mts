import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
const db = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! }) });
const r = await db.workout.deleteMany({ where: { status: "IN_PROGRESS" } });
console.log("Smazano rozcvicenych treninku:", r.count);
await db.$disconnect();
