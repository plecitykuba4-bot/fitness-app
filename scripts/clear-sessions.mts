/** Vývojová pomůcka — odhlásí všechny uživatele. */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const db = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! }),
});
const r = await db.session.deleteMany();
console.log("Smazáno sessions:", r.count);
await db.$disconnect();
