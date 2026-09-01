import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
const db = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! }) });
const tomas = await db.client.findFirst({ where: { user: { email: "tomas.dvorak@example.com" } } });
const w = await db.workout.findFirst({ where: { clientId: tomas!.id, status: "COMPLETED" } });
console.log("TOMAS_CLIENT_ID=" + tomas!.id);
console.log("TOMAS_WORKOUT_ID=" + w!.id);
await db.$disconnect();
