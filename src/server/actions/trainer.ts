"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/server/db";
import { requireTrainer } from "@/server/auth/guards";
import { hashPassword } from "@/server/auth/session";
import { EXERCISE_CATEGORIES } from "@/lib/enums";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string | undefined>;
};

export async function updateTrainingPassAction(formData: FormData) {
  const trainer = await requireTrainer();
  const clientId = String(formData.get("clientId") ?? "");
  const totalSessions = Number(formData.get("totalSessions") ?? 0);
  const usedSessions = Number(formData.get("usedSessions") ?? 0);
  if (!Number.isInteger(totalSessions) || !Number.isInteger(usedSessions) || totalSessions < 0 || usedSessions < 0 || totalSessions > 50) return;
  const safeUsedSessions = Math.min(usedSessions, totalSessions);
  const client = await db.client.findFirst({ where: { id: clientId, trainerId: trainer.trainerId }, select: { id: true } });
  if (!client) return;
  await db.trainingPass.upsert({ where: { clientId }, create: { clientId, totalSessions, usedSessions: safeUsedSessions }, update: { totalSessions, usedSessions: safeUsedSessions } });
  revalidatePath(`/klienti/${clientId}`);
  revalidatePath("/profil");
  revalidatePath("/karta");
  revalidatePath("/karty");
  revalidatePath(`/karty/${clientId}`);
}

export async function setTrainingPassUsageAction(clientId: string, slot: number) {
  const trainer = await requireTrainer();
  const pass = await db.trainingPass.findFirst({ where: { clientId, client: { trainerId: trainer.trainerId } } });
  if (!pass || !Number.isInteger(slot) || slot < 0 || slot >= pass.totalSessions) return;
  const usedSessions = slot < pass.usedSessions ? slot : slot + 1;
  await db.trainingPass.update({ where: { clientId }, data: { usedSessions } });
  revalidatePath(`/karty/${clientId}`);
  revalidatePath("/karty");
  revalidatePath("/karta");
}

const ClientSchema = z.object({
  name: z.string().trim().min(2, "Zadejte jméno klienta."),
  email: z
    .string()
    .trim()
    .min(1, "Zadejte e-mail.")
    .email("E-mail nemá správný tvar."),
  password: z
    .string()
    .min(8, "Heslo musí mít alespoň 8 znaků.")
    .max(200, "Heslo je příliš dlouhé."),
});

export async function createClientAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const trainer = await requireTrainer();

  const parsed = ClientSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const f = parsed.error.flatten().fieldErrors;
    return {
      fieldErrors: {
        name: f.name?.[0],
        email: f.email?.[0],
        password: f.password?.[0],
      },
    };
  }

  const email = parsed.data.email.toLowerCase();

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return {
      fieldErrors: { email: "Uživatel s tímto e-mailem už existuje." },
    };
  }

  try {
    const user = await db.user.create({
      data: {
        email,
        name: parsed.data.name,
        passwordHash: await hashPassword(parsed.data.password),
        role: "CLIENT",
      },
    });
    await db.client.create({
      data: { userId: user.id, trainerId: trainer.trainerId },
    });
  } catch (error) {
    console.error("createClientAction", error);
    return { error: "Nepodařilo se vytvořit klienta. Zkuste to prosím znovu." };
  }

  revalidatePath("/klienti");
  revalidatePath("/treninky");
  revalidatePath("/treninky/novy");
  redirect("/klienti");
}

const ExerciseSchema = z.object({
  name: z.string().trim().min(2, "Zadejte název cviku."),
  category: z.enum(EXERCISE_CATEGORIES, {
    message: "Vyberte kategorii.",
  }),
  muscleGroup: z.string().trim().min(2, "Zadejte svalovou skupinu."),
  equipment: z.string().trim().optional(),
  instructions: z.string().trim().optional(),
  trackingType: z.enum(["WEIGHT_REPS", "TIME"]),
  mediaKind: z.enum(["IMAGE", "VIDEO"]).optional(),
  mediaUrl: z.union([z.literal(""), z.url("Zadejte platný odkaz na médium.")]).optional(),
});

export async function createExerciseAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const trainer = await requireTrainer();

  const parsed = ExerciseSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category"),
    muscleGroup: formData.get("muscleGroup"),
    equipment: formData.get("equipment") || undefined,
    instructions: formData.get("instructions") || undefined,
    trackingType: formData.get("trackingType"),
    mediaKind: String(formData.get("mediaKind") || "IMAGE"),
    mediaUrl: String(formData.get("mediaUrl") || ""),
  });

  if (!parsed.success) {
    const f = parsed.error.flatten().fieldErrors;
    return {
      fieldErrors: {
        name: f.name?.[0],
        category: f.category?.[0],
        muscleGroup: f.muscleGroup?.[0],
      },
    };
  }

  try {
    await db.exercise.create({
      data: {
        trainerId: trainer.trainerId,
        name: parsed.data.name,
        category: parsed.data.category,
        muscleGroup: parsed.data.muscleGroup,
        equipment: parsed.data.equipment || null,
        instructions: parsed.data.instructions || null,
        trackingType: parsed.data.trackingType,
        description: parsed.data.instructions?.slice(0, 120) ?? null,
        media: parsed.data.mediaUrl
          ? { create: { kind: parsed.data.mediaKind ?? "IMAGE", storageKey: parsed.data.mediaUrl } }
          : undefined,
      },
    });
  } catch (error) {
    // Unikátní index (trainerId, name) — stejný cvik už existuje.
    console.error("createExerciseAction", error);
    return { fieldErrors: { name: "Cvik s tímto názvem už máte založený." } };
  }

  revalidatePath("/cviky");
  revalidatePath("/treninky");
  const navrat = formData.get("navrat");
  redirect(
    typeof navrat === "string" && navrat.startsWith("/treninky/")
      ? navrat
      : "/cviky",
  );
}

export async function updateExerciseAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const trainer = await requireTrainer();
  const id = String(formData.get("id") ?? "");

  const parsed = ExerciseSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category"),
    muscleGroup: formData.get("muscleGroup"),
    equipment: formData.get("equipment") || undefined,
    instructions: formData.get("instructions") || undefined,
    trackingType: formData.get("trackingType"),
    mediaKind: String(formData.get("mediaKind") || "IMAGE"),
    mediaUrl: String(formData.get("mediaUrl") || ""),
  });

  if (!parsed.success) {
    const f = parsed.error.flatten().fieldErrors;
    return {
      fieldErrors: {
        name: f.name?.[0],
        category: f.category?.[0],
        muscleGroup: f.muscleGroup?.[0],
      },
    };
  }

  // Cvik musí patřit přihlášenému trenérovi.
  const existing = await db.exercise.findFirst({
    where: { id, trainerId: trainer.trainerId },
    select: { id: true },
  });
  if (!existing) return { error: "Cvik nebyl nalezen." };

  try {
    await db.exercise.update({
      where: { id: existing.id },
      data: {
        name: parsed.data.name,
        category: parsed.data.category,
        muscleGroup: parsed.data.muscleGroup,
        equipment: parsed.data.equipment || null,
        instructions: parsed.data.instructions || null,
        trackingType: parsed.data.trackingType,
        description: parsed.data.instructions?.slice(0, 120) ?? null,
        media: {
          deleteMany: {},
          ...(parsed.data.mediaUrl
            ? { create: { kind: parsed.data.mediaKind ?? "IMAGE", storageKey: parsed.data.mediaUrl } }
            : {}),
        },
      },
    });
  } catch (error) {
    console.error("updateExerciseAction", error);
    return { fieldErrors: { name: "Cvik s tímto názvem už máte založený." } };
  }

  revalidatePath("/cviky");
  redirect("/cviky");
}

/**
 * Smaže cvik. Cvik použitý v šabloně nebo v odcvičeném tréninku smazat nelze —
 * historii klientů nesmíme rozbít.
 */
export async function deleteExerciseAction(
  exerciseId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trainer = await requireTrainer();

  const exercise = await db.exercise.findFirst({
    where: { id: exerciseId, trainerId: trainer.trainerId },
    select: {
      id: true,
      name: true,
      _count: { select: { templateExercises: true, workoutExercises: true } },
    },
  });
  if (!exercise) return { ok: false, error: "Cvik nebyl nalezen." };

  if (exercise._count.templateExercises > 0) {
    return {
      ok: false,
      error: "Cvik je použitý v tréninku. Nejdřív ho z tréninků odeberte.",
    };
  }
  if (exercise._count.workoutExercises > 0) {
    return {
      ok: false,
      error:
        "Cvik už klienti odcvičili, proto ho nelze smazat — smazáním by zmizela jejich historie.",
    };
  }

  await db.exercise.delete({ where: { id: exercise.id } });
  revalidatePath("/cviky");
  return { ok: true };
}
