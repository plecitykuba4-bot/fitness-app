import { defineConfig } from "vitest/config";

const src = new URL("./src", import.meta.url).pathname;

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Testy sahající na databázi potřebují DATABASE_URL z .env.
    setupFiles: ["dotenv/config"],
  },
  resolve: {
    alias: {
      "@": src,
      // "server-only" je strážce proti importu do klienta a mimo Next.js selže.
      "server-only": new URL("./tests/stubs/server-only.ts", import.meta.url)
        .pathname,
    },
  },
});
