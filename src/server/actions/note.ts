"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/server/db";
import { requireUser, requireOwnedClient } from "@/server/auth/guards";

/**
 * Poznámky. Trenér píše ke klientovi, klient k tréninku.
 * Autor se bere ze session, nikdy z formuláře.
 */

export type NoteState = { error?: string };

const BodySchema = z
  .string()
  .trim()
  .min(1, "Napište text poznámky.")
  .max(2000, "Poznámka je příliš dlouhá.");

export async function addClientNoteAction(
  _prev: NoteState,
  formData: FormData,
): Promise<NoteState> {
  const user = await requireUser();
  const clientId = String(formData.get("clientId") ?? "");

  const parsed = BodySchema.safeParse(formData.get("body"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Poznámku ke klientovi smí psát jen jeho trenér.
  const { client } = await requireOwnedClient(clientId);

  try {
    await db.note.create({
      data: {
        authorId: user.id,
        scope: "CLIENT",
        body: parsed.data,
        clientId: client.id,
      },
    });

    await db.notification.create({
      data: {
        userId: client.userId,
        type: "NOTE_ADDED",
        title: "Nová poznámka od trenéra",
        body: parsed.data.slice(0, 120),
        linkHref: "/profil",
      },
    });
  } catch (error) {
    console.error("addClientNoteAction", error);
    return { error: "Nepodařilo se uložit poznámku. Zkuste to prosím znovu." };
  }

  revalidatePath(`/klienti/${client.id}`);
  revalidatePath("/profil");
  return {};
}

export async function addWorkoutNoteAction(
  _prev: NoteState,
  formData: FormData,
): Promise<NoteState> {
  const user = await requireUser();
  const workoutId = String(formData.get("workoutId") ?? "");

  const parsed = BodySchema.safeParse(formData.get("body"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    // Trénink musí patřit přihlášenému klientovi.
    const workout = await db.workout.findFirst({
      where: { id: workoutId, client: { userId: user.id } },
      select: { id: true, name: true, client: { select: { trainer: { select: { userId: true } } } } },
    });
    if (!workout) return { error: "Trénink nebyl nalezen." };

    await db.note.create({
      data: {
        authorId: user.id,
        scope: "WORKOUT",
        body: parsed.data,
        workoutId: workout.id,
      },
    });

    // Trenér musí poznámku klienta vidět — třeba hlášení bolesti.
    await db.notification.create({
      data: {
        userId: workout.client.trainer.userId,
        type: "NOTE_ADDED",
        title: `Poznámka k tréninku ${workout.name}`,
        body: `${user.name}: ${parsed.data.slice(0, 120)}`,
        linkHref: `/klienti`,
      },
    });
  } catch (error) {
    console.error("addWorkoutNoteAction", error);
    return { error: "Nepodařilo se uložit poznámku. Zkuste to prosím znovu." };
  }

  revalidatePath(`/trenink/${workoutId}/souhrn`);
  return {};
}
