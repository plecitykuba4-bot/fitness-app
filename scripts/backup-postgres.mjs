import "dotenv/config";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const databaseUrl = process.env.POSTGRES_URL_NON_POOLING ?? process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("Chybí DATABASE_URL.");

const backupDirectory = process.env.BACKUP_DIRECTORY ?? "/var/backups/fitness-app";
const retentionDays = Math.max(1, Number(process.env.BACKUP_RETENTION_DAYS ?? 14));
mkdirSync(backupDirectory, { recursive: true, mode: 0o700 });

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const isSqlite = databaseUrl.startsWith("file:");
const databaseFile = path.join(backupDirectory, `database-${stamp}.${isSqlite ? "sqlite" : "dump"}`);

if (isSqlite) {
  const relativePath = databaseUrl.slice("file:".length).split("?")[0];
  const sourceFile = path.resolve(process.cwd(), decodeURIComponent(relativePath));
  if (!existsSync(sourceFile)) throw new Error(`SQLite databáze nebyla nalezena: ${sourceFile}`);

  const database = new Database(sourceFile, { readonly: true, fileMustExist: true });
  try {
    await database.backup(databaseFile);
  } finally {
    database.close();
  }
} else {
  execFileSync("pg_dump", ["--format=custom", "--file", databaseFile, databaseUrl], { stdio: "inherit" });
}

const uploadsDirectory = path.join(process.cwd(), "public", "uploads");
if (existsSync(uploadsDirectory)) {
  execFileSync("tar", ["-czf", path.join(backupDirectory, `uploads-${stamp}.tar.gz`), "-C", path.join(process.cwd(), "public"), "uploads"], { stdio: "inherit" });
}

const cutoff = Date.now() - retentionDays * 86_400_000;
for (const file of readdirSync(backupDirectory, { withFileTypes: true })) {
  if (!file.isFile() || (!file.name.endsWith(".dump") && !file.name.endsWith(".sqlite") && !file.name.endsWith(".tar.gz"))) continue;
  const filePath = path.join(backupDirectory, file.name);
  if (filePath !== databaseFile && statSync(filePath).mtimeMs < cutoff) rmSync(filePath);
}

console.log(`Záloha hotová: ${databaseFile}`);
