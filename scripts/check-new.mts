import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
const db = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! }) });
console.log("sessions:", await db.session.count());
const ex = await db.exercise.findFirst({ where: { name: { contains: "Testovací" } } });
console.log("novy cvik:", ex ? ex.name + " / " + ex.category : "NEVYTVOREN");
await db.$disconnect();
