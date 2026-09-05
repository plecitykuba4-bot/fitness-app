import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { db } from "@/server/db";
import { hashPassword } from "@/server/auth/session";

const RESET_TTL_MS = 60 * 60 * 1_000;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function publicAppUrl() {
  const value = process.env.APP_URL;
  if (!value?.startsWith("https://")) {
    throw new Error("APP_URL musí být HTTPS adresa veřejné aplikace.");
  }
  return value.replace(/\/$/, "");
}

/** Vytvoří nový odkaz; starší odkazy stejného uživatele okamžitě zneplatní. */
export async function createPasswordReset(email: string): Promise<string | null> {
  const user = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) return null;

  const token = randomBytes(32).toString("base64url");
  await db.$transaction([
    db.passwordResetToken.deleteMany({ where: { userId: user.id } }),
    db.passwordResetToken.create({
      data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + RESET_TTL_MS) },
    }),
  ]);
  return `${publicAppUrl()}/obnovit-heslo?token=${encodeURIComponent(token)}`;
}

/** Token se může použít jen jednou; změna hesla odhlásí všechny staré session. */
export async function resetPassword(token: string, password: string): Promise<boolean> {
  const tokenHash = hashToken(token);
  const reset = await db.passwordResetToken.findUnique({
    where: { tokenHash }, select: { id: true, userId: true, expiresAt: true },
  });
  if (!reset || reset.expiresAt <= new Date()) {
    if (reset) await db.passwordResetToken.delete({ where: { id: reset.id } });
    return false;
  }

  const passwordHash = await hashPassword(password);
  await db.$transaction([
    db.user.update({ where: { id: reset.userId }, data: { passwordHash } }),
    db.session.deleteMany({ where: { userId: reset.userId } }),
    db.passwordResetToken.deleteMany({ where: { userId: reset.userId } }),
  ]);
  return true;
}

/** Odeslání přes Resend HTTP API — klíč zůstává jen v .env na VPS. */
export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    console.error("Password reset email skipped: RESEND_API_KEY nebo EMAIL_FROM není nastaveno.");
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Obnova hesla — Fitness trenér",
      text: `Pro nastavení nového hesla otevřete tento odkaz. Platí jednu hodinu: ${resetUrl}`,
      html: `<p>Pro nastavení nového hesla otevřete tento odkaz. Platí jednu hodinu:</p><p><a href="${resetUrl}">Nastavit nové heslo</a></p>`,
    }),
  });
  if (!response.ok) throw new Error(`Password reset email failed: ${response.status}`);
}
