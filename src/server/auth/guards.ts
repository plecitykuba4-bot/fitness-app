import "server-only";

import { redirect, notFound } from "next/navigation";
import { db } from "@/server/db";
import { getSessionUser, type SessionUser } from "@/server/auth/session";

/**
 * AUTORIZAČNÍ VRSTVA — jediná povolená cesta k datům klienta.
 *
 * Pravidlo, které NESMÍ být obcházeno: každý server-side přístup k datům
 * konkrétního klienta musí projít `requireOwnedClient()`. Nikdy nečti data
 * podle `params.id` přímo z databáze bez této kontroly — jinak vzniká IDOR
 * (klient si změní /clients/123 na /clients/124 a vidí cizí data).
 *
 * Při cizím zdroji vracíme 404, ne 403 — 403 by prozradilo, že daný záznam
 * existuje.
 */

export type TrainerSession = SessionUser & { trainerId: string };
export type ClientSession = SessionUser & { clientId: string };

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/prihlaseni");
  return user;
}

export async function requireTrainer(): Promise<TrainerSession> {
  const user = await requireUser();
  if (user.role !== "TRAINER" || !user.trainerId) redirect("/");
  return user as TrainerSession;
}

export async function requireClient(): Promise<ClientSession> {
  const user = await requireUser();
  if (user.role !== "CLIENT" || !user.clientId) redirect("/");
  return user as ClientSession;
}

/**
 * Ověří, že klient `clientId` patří přihlášenému trenérovi.
 * Vrací klienta včetně uživatelských údajů, jinak 404.
 */
export async function requireOwnedClient(clientId: string) {
  const trainer = await requireTrainer();

  const client = await db.client.findFirst({
    where: { id: clientId, trainerId: trainer.trainerId },
    include: { user: true },
  });

  if (!client) notFound();
  return { trainer, client };
}

/**
 * Vrátí id klienta, ke kterému má aktuální uživatel přístup.
 * Trenér přes vlastnictví, klient vždy jen sám sebe.
 * Používej tam, kde stránku sdílí obě role (progres, historie, report).
 */
export async function resolveAccessibleClientId(
  requestedClientId?: string,
): Promise<string> {
  const user = await requireUser();

  if (user.role === "CLIENT") {
    if (!user.clientId) redirect("/prihlaseni");
    // Klient nesmí načíst nikoho jiného — případný parametr ignorujeme,
    // a pokud cílí na cizí id, končíme 404.
    if (requestedClientId && requestedClientId !== user.clientId) notFound();
    return user.clientId;
  }

  if (!requestedClientId) notFound();
  const { client } = await requireOwnedClient(requestedClientId);
  return client.id;
}

/** Ověří, že trénink patří danému klientovi. Jinak 404. */
export async function requireOwnedWorkout(workoutId: string, clientId: string) {
  const workout = await db.workout.findFirst({
    where: { id: workoutId, clientId },
  });
  if (!workout) notFound();
  return workout;
}

/** Ověří, že cvik patří přihlášenému trenérovi. Jinak 404. */
export async function requireOwnedExercise(exerciseId: string) {
  const trainer = await requireTrainer();
  const exercise = await db.exercise.findFirst({
    where: { id: exerciseId, trainerId: trainer.trainerId },
    include: { media: { orderBy: { sortOrder: "asc" } } },
  });
  if (!exercise) notFound();
  return { trainer, exercise };
}

/** Ověří, že šablona tréninku patří přihlášenému trenérovi. Jinak 404. */
export async function requireOwnedTemplate(templateId: string) {
  const trainer = await requireTrainer();
  const template = await db.workoutTemplate.findFirst({
    where: { id: templateId, trainerId: trainer.trainerId },
    include: {
      exercises: {
        orderBy: { sortOrder: "asc" },
        include: {
          exercise: { include: { media: { orderBy: { sortOrder: "asc" } } } },
          sets: { orderBy: { setNumber: "asc" } },
        },
      },
    },
  });
  if (!template) notFound();
  return { trainer, template };
}
