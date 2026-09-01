import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";

/**
 * Konfigurace Prisma CLI (migrace, introspekce).
 * Runtime připojení řeší driver adapter v src/server/db.ts — sem nepatří.
 */
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  // SQLite migrace z původního lokálního dema zůstávají zachované v
  // prisma/migrations. PostgreSQL začíná samostatným baselinem.
  migrations: {
    path: path.join("prisma", "migrations-postgres"),
    // Seed je idempotentní: naplní jen zcela prázdnou produkční databázi.
    seed: "tsx prisma/seed.ts",
  },
  // Vercel/Neon dodává oddělenou přímou URL pro administrativní operace.
  // Migrace přes pooler mohou čekat na advisory lock, proto jim dáme přednost.
  // Lokálně zůstává zpětně kompatibilní DATABASE_URL.
  datasource: {
    url: process.env.POSTGRES_URL_NON_POOLING ?? process.env.DATABASE_URL!,
  },
});
