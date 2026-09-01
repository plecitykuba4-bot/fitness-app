import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";

/**
 * Konfigurace Prisma CLI (migrace, introspekce).
 * Runtime připojení řeší driver adapter v src/server/db.ts — sem nepatří.
 */
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: { path: path.join("prisma", "migrations") },
  datasource: { url: process.env.DATABASE_URL! },
});
