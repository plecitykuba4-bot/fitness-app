import "server-only";

import { db } from "@/server/db";

/**
 * ⚠️  VÝVOJOVÁ POMŮCKA — podklady pro přepínač účtů.
 *
 * Tyhle funkce nejsou server actions (soubor nemá "use server"), protože
 * modul označený "use server" smí exportovat výhradně async funkce.
 * Samotná akce, která mění session, je v src/server/actions/dev-switch.ts.
 */

export function isDevSwitchEnabled(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.DEMO_MODE === "true";
}

export type DevUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

/** Seznam účtů pro přepínač. V produkci vrací prázdný seznam. */
export async function listDevUsers(): Promise<DevUser[]> {
  if (!isDevSwitchEnabled()) return [];

  return db.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: { id: true, name: true, email: true, role: true },
    take: 30,
  });
}
