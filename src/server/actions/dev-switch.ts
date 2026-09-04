"use server";

import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { createSession, destroySession } from "@/server/auth/session";
import { isDevSwitchEnabled } from "@/server/dev-switch";

/**
 * ⚠️  VÝVOJOVÁ POMŮCKA — přepnutí účtu bez hesla.
 *
 * Kontrola prostředí je tady na serveru, ne jen ve vykreslování tlačítka.
 * Kdyby někdo akci zavolal přímo, v produkci stejně neprojde.
 */
export async function devSwitchUserAction(userId: string): Promise<void> {
  if (!isDevSwitchEnabled()) {
    throw new Error(
      "Přepínání účtů bez hesla je dostupné pouze ve vývojovém režimu.",
    );
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });
  if (!user) throw new Error("Uživatel nebyl nalezen.");

  // Starou session zahodíme, ať v databázi nezůstávají viset.
  await destroySession();
  await createSession(user.id);

  redirect(user.role === "TRAINER" ? "/prehled" : user.role === "ADMIN" ? "/sprava" : "/dnes");
}
