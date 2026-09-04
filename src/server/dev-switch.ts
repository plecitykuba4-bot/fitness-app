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
  // Nikdy nezapínej přes proměnnou prostředí v nasazené aplikaci. Tohle je
  // schválně dostupné jen při `next dev` na vývojářském počítači.
  return process.env.NODE_ENV === "development";
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
