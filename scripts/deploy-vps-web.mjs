import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, readlinkSync, unlinkSync, writeFileSync } from "node:fs";

if (process.platform !== "linux" || process.getuid?.() !== 0) {
  console.error("Tento příkaz spusťte jako root přímo na Linux VPS.");
  process.exit(1);
}

execFileSync("apt-get", ["update"], { stdio: "inherit" });
execFileSync("apt-get", ["install", "-y", "nginx"], { stdio: "inherit" });

const defaultLink = "/etc/nginx/sites-enabled/default";
if (existsSync(defaultLink)) {
  if (!lstatSync(defaultLink).isSymbolicLink() || readlinkSync(defaultLink) !== "../sites-available/default") {
    console.error("Výchozí Nginx konfigurace byla změněna — nic jsem nepřepsal.");
    process.exit(1);
  }
  unlinkSync(defaultLink);
}

writeFileSync(
  "/etc/nginx/sites-available/fitness-app",
  `server {
  listen 80 default_server;
  listen [::]:80 default_server;
  server_name _;

  # Rezerva pro multipart obálku kolem fotografie; aplikace samotná povolí 15 MB.
  client_max_body_size 20M;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }
}
`,
  "utf8",
);

execFileSync("ln", ["-sfn", "/etc/nginx/sites-available/fitness-app", "/etc/nginx/sites-enabled/fitness-app"], {
  stdio: "inherit",
});
execFileSync("nginx", ["-t"], { stdio: "inherit" });
execFileSync("systemctl", ["enable", "--now", "nginx"], { stdio: "inherit" });
execFileSync("systemctl", ["reload", "nginx"], { stdio: "inherit" });

console.log("Webová brána běží. Otevřete: http://81.2.242.27");
