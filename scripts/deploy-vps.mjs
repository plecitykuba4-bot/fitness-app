import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

if (process.platform !== "linux" || process.getuid?.() !== 0) {
  console.error("Tento příkaz spusťte jako root přímo na Linux VPS.");
  process.exit(1);
}

const appDirectory = process.cwd();
const npmPath = resolve(dirname(process.execPath), "npm");
const service = `[Unit]
Description=Fitness trenér webová aplikace
After=network.target

[Service]
Type=simple
WorkingDirectory=${appDirectory}
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOSTNAME=127.0.0.1
ExecStart=${npmPath} run start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
`;

writeFileSync("/etc/systemd/system/fitness-app.service", service, {
  encoding: "utf8",
  mode: 0o644,
});

execFileSync("systemctl", ["daemon-reload"], { stdio: "inherit" });
execFileSync("systemctl", ["enable", "--now", "fitness-app"], {
  stdio: "inherit",
});
execFileSync("systemctl", ["--no-pager", "--full", "status", "fitness-app"], {
  stdio: "inherit",
});
