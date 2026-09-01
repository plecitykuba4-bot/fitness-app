import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
const db = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! }) });
const client = await db.client.findFirst({ where: { user: { email: "eva.horakova@example.com" } } });
console.log("Eva client id:", client!.id);
await db.$disconnect();
