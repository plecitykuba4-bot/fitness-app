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
  datasource: { url: process.env.DATABASE_URL! },
});
