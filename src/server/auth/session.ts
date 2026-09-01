import "server-only";

import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { db } from "@/server/db";
import { RoleSchema, type Role } from "@/lib/enums";

const COOKIE_NAME = "fitness_session";
const SESSION_DAYS = 30;

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  /** Vyplněno jen pro roli TRAINER. */
  trainerId: string | null;
  /** Vyplněno jen pro roli CLIENT. */
  clientId: string | null;
};

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Vytvoří session v databázi a nastaví httpOnly cookie. */
export async function createSession(userId: string): Promise<void> {
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  const session = await db.session.create({ data: { userId, expiresAt } });

  const store = await cookies();
  store.set(COOKIE_NAME, session.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const id = store.get(COOKIE_NAME)?.value;
  if (id) {
    // Session nemusí existovat (např. už vypršela) — smazání nesmí shodit odhlášení.
    await db.session.deleteMany({ where: { id } });
  }
  store.delete(COOKIE_NAME);
}

/**
 * Načte přihlášeného uživatele, nebo null. Nevyhazuje výjimku —
 * pro vynucení přihlášení použij requireUser/requireTrainer/requireClient.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const sessionId = store.get(COOKIE_NAME)?.value;
  if (!sessionId) return null;

  const session = await db.session.findUnique({
    where: { id: sessionId },
    include: {
      user: { include: { trainer: true, client: true } },
    },
  });

  if (!session) return null;

  if (session.expiresAt.getTime() < Date.now()) {
    await db.session.deleteMany({ where: { id: sessionId } });
    return null;
  }

  const role = RoleSchema.safeParse(session.user.role);
  if (!role.success) return null;

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: role.data,
    trainerId: session.user.trainer?.id ?? null,
    clientId: session.user.client?.id ?? null,
  };
}

/** Smaže expirované sessions. Volat příležitostně, ne na každý request. */
export async function pruneExpiredSessions(): Promise<number> {
  const result = await db.session.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return result.count;
}
