import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

/**
 * Prisma 7 se připojuje přes driver adapter, ne přes URL ve schématu.
 * Při přechodu na PostgreSQL vyměň adapter za @prisma/adapter-pg
 * a v prisma/schema.prisma změň provider na "postgresql".
 */

function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "Chybí proměnná prostředí DATABASE_URL. Zkopírujte .env.example do .env.",
    );
  }
  return new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url }),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

// V dev módu Next.js hot-reload opakovaně vyhodnocuje moduly. Bez cachování
// by vznikaly desítky připojení k databázi.
const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createClient>;
};

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
