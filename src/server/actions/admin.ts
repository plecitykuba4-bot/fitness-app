"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/guards";
import { hashPassword } from "@/server/auth/session";

const TrainerSchema = z.object({
  name: z.string().trim().min(2, "Zadejte celé jméno trenéra.").max(100),
  email: z.string().trim().email("E-mail nemá správný tvar.").max(254),
  password: z.string().min(12, "Heslo musí mít alespoň 12 znaků.").max(200),
});

export type AdminActionState = { error?: string; success?: string };

/** Vytvoří účet trenéra i jeho vlastnický profil v jedné transakci. */
export async function createTrainerAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();
  const parsed = TrainerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Neplatné údaje." };

  const email = parsed.data.email.toLowerCase();
  const exists = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (exists) return { error: "Tento e-mail už v aplikaci existuje." };

  const passwordHash = await hashPassword(parsed.data.password);
  await db.user.create({
    data: {
      name: parsed.data.name,
      email,
      passwordHash,
      role: "TRAINER",
      trainer: { create: {} },
    },
  });
  revalidatePath("/sprava");
  return { success: "Účet trenéra byl vytvořen." };
}
