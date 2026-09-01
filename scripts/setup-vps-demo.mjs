import { existsSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), ".env");

if (existsSync(envPath)) {
  console.error(".env už existuje — nastavení VPS jsem nezměnil.");
  process.exit(1);
}

const authSecret = randomBytes(48).toString("base64url");

writeFileSync(
  envPath,
  [
    "# Automaticky vytvořeno pro ukázkovou verzi na VPS.",
    'DATABASE_URL="file:./dev.db"',
    `AUTH_SECRET="${authSecret}"`,
    'STORAGE_PUBLIC_URL="/media"',
    "LOCAL_DEMO_DATABASE=true",
    "DEMO_MODE=true",
    "",
  ].join("\n"),
  { encoding: "utf8", mode: 0o600 },
);

console.log("VPS demo je nastavené. Další krok: npm run db:generate && npm run build");
