"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createPasswordReset, resetPassword, sendPasswordResetEmail } from "@/server/auth/password-reset";

export type ResetRequestState = { error?: string; success?: string };

const EmailSchema = z.string().trim().email();
const PasswordSchema = z.string().min(12, "Heslo musí mít alespoň 12 znaků.").max(200);

/** Vždy stejná odpověď — útočník nezjistí, které e-maily v aplikaci existují. */
export async function requestPasswordResetAction(_previous: ResetRequestState, formData: FormData): Promise<ResetRequestState> {
  const email = EmailSchema.safeParse(formData.get("email"));
  if (!email.success) return { error: "Zadejte platný e-mail." };
  const normalized = email.data.toLowerCase();
  try {
    const resetUrl = await createPasswordReset(normalized);
    if (resetUrl) await sendPasswordResetEmail(normalized, resetUrl);
  } catch (error) {
    console.error("password reset request", error);
  }
  return { success: "Pokud účet s tímto e-mailem existuje, poslali jsme odkaz pro obnovu hesla." };
}

export type NewPasswordState = { error?: string };

export async function setNewPasswordAction(token: string, _previous: NewPasswordState, formData: FormData): Promise<NewPasswordState> {
  const password = PasswordSchema.safeParse(formData.get("password"));
  const confirmation = String(formData.get("passwordConfirmation") ?? "");
  if (!password.success) return { error: password.error.issues[0]?.message ?? "Neplatné heslo." };
  if (password.data !== confirmation) return { error: "Hesla se neshodují." };
  if (!token || !(await resetPassword(token, password.data))) {
    return { error: "Odkaz je neplatný nebo už vypršel. Vyžádejte si nový." };
  }
  redirect("/prihlaseni?reset=1");
}
