import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

/**
 * Prisma 7 se připojuje přes driver adapter, ne přes URL ve schématu.
 * Produkce používá Vercel/Neon, lokální demo souborovou SQLite databázi.
 */

function createClient() {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error(
      "Chybí proměnná prostředí DATABASE_URL. Zkopírujte .env.example do .env.",
    );
  }
  const adapter = url.startsWith("file:")
    ? new PrismaBetterSqlite3({ url })
    : new PrismaPg({ connectionString: url });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

// V dev módu Next.js hot-reload opakovaně vyhodnocuje moduly. Bez cachování
// by vznikaly desítky připojení k databázi.
const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createClient>;
};

export const db = globalForPrisma.prisma ?? createClient();

globalForPrisma.prisma = db;
