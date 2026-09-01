"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth/guards";

/** Označí všechna oznámení přihlášeného uživatele jako přečtená. */
export async function markAllNotificationsReadAction(): Promise<void> {
  const user = await requireUser();

  // Filtr podle userId je zásadní — jinak by šlo označit cizí oznámení.
  await db.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });

  revalidatePath("/oznameni");
}
