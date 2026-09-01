import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
const db = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! }) });
const t = await db.workoutTemplate.findFirst({ where: { name: "UPPER B" } });
console.log(t);
await db.$disconnect();
