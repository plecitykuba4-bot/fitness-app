import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

if (process.platform !== "linux" || process.getuid?.() !== 0) throw new Error("Spusťte jako root na VPS.");
const appDirectory = process.cwd();
const service = `[Unit]\nDescription=Fitness app database backup\n\n[Service]\nType=oneshot\nWorkingDirectory=${appDirectory}\nExecStart=/usr/bin/node ${appDirectory}/scripts/backup-postgres.mjs\n`;
const timer = `[Unit]\nDescription=Nightly fitness app backup\n\n[Timer]\nOnCalendar=*-*-* 03:30:00\nPersistent=true\n\n[Install]\nWantedBy=timers.target\n`;
writeFileSync("/etc/systemd/system/fitness-app-backup.service", service, { mode: 0o644 });
writeFileSync("/etc/systemd/system/fitness-app-backup.timer", timer, { mode: 0o644 });
execFileSync("systemctl", ["daemon-reload"], { stdio: "inherit" });
execFileSync("systemctl", ["enable", "--now", "fitness-app-backup.timer"], { stdio: "inherit" });
console.log("Denní záloha je nastavená na 03:30.");
