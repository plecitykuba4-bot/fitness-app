import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Prisma 7 se připojuje přes driver adapter, ne přes URL ve schématu.
 * Vercel/Neon poskytuje DATABASE_URL jako proměnnou prostředí.
 */

function createClient() {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error(
      "Chybí proměnná prostředí DATABASE_URL. Zkopírujte .env.example do .env.",
    );
  }
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
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
