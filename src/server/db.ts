import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { copyFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

/**
 * Prisma 7 se připojuje přes driver adapter, ne přes URL ve schématu.
 * Při přechodu na PostgreSQL vyměň adapter za @prisma/adapter-pg
 * a v prisma/schema.prisma změň provider na "postgresql".
 */

function createClient() {
  let url = process.env.DATABASE_URL;

  // Prezentační nasazení na Vercelu používá dočasnou kopii ukázkové databáze.
  // Zápisy fungují v rámci instance, ale nejsou trvalé — to je pro demo záměr.
  if (process.env.DEMO_MODE === "true") {
    const demoTarget = path.join(tmpdir(), "fitness-app-demo.db");
    if (!existsSync(demoTarget)) {
      copyFileSync(path.join(process.cwd(), "prisma", "demo.db"), demoTarget);
    }
    url = `file:${demoTarget}`;
  }

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
