import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
const db = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! }) });
const count = await db.exercise.count();
const byCategory = await db.exercise.groupBy({ by: ["category"], _count: true });
console.log("Celkem cviků:", count);
console.log(byCategory.map(c => c.category + ": " + c._count).join(" | "));
await db.$disconnect();
