import "dotenv/config";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import path from "node:path";

const databaseUrl = process.env.POSTGRES_URL_NON_POOLING ?? process.env.DATABASE_URL;
if (!databaseUrl || databaseUrl.startsWith("file:")) throw new Error("Záloha vyžaduje PostgreSQL DATABASE_URL.");

const backupDirectory = process.env.BACKUP_DIRECTORY ?? "/var/backups/fitness-app";
const retentionDays = Math.max(1, Number(process.env.BACKUP_RETENTION_DAYS ?? 14));
mkdirSync(backupDirectory, { recursive: true, mode: 0o700 });

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const databaseFile = path.join(backupDirectory, `database-${stamp}.dump`);
execFileSync("pg_dump", ["--format=custom", "--file", databaseFile, databaseUrl], { stdio: "inherit" });

const uploadsDirectory = path.join(process.cwd(), "public", "uploads");
if (existsSync(uploadsDirectory)) {
  execFileSync("tar", ["-czf", path.join(backupDirectory, `uploads-${stamp}.tar.gz`), "-C", path.join(process.cwd(), "public"), "uploads"], { stdio: "inherit" });
}

const cutoff = Date.now() - retentionDays * 86_400_000;
for (const file of readdirSync(backupDirectory, { withFileTypes: true })) {
  if (!file.isFile() || (!file.name.endsWith(".dump") && !file.name.endsWith(".tar.gz"))) continue;
  const filePath = path.join(backupDirectory, file.name);
  if (filePath !== databaseFile && statSync(filePath).mtimeMs < cutoff) rmSync(filePath);
}

console.log(`Záloha hotová: ${databaseFile}`);
