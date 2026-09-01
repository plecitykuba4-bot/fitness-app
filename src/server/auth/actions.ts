"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/server/db";
import {
  createSession,
  destroySession,
  verifyPassword,
} from "@/server/auth/session";

/** Validace probíhá na serveru — klientská validace je jen pohodlí, ne ochrana. */
const LoginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Zadejte e-mail.")
    .email("E-mail nemá správný tvar."),
  password: z.string().min(1, "Zadejte heslo."),
});

export type LoginState = {
  error?: string;
  fieldErrors?: { email?: string; password?: string };
};

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    return {
      fieldErrors: {
        email: flat.email?.[0],
        password: flat.password?.[0],
      },
    };
  }

  const user = await db.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  });

  // Stejná hláška pro neexistující e-mail i špatné heslo — jinak by šlo
  // zjišťovat, které e-maily jsou v systému registrované.
  const genericError = "Nesprávný e-mail nebo heslo.";

  if (!user) {
    // Porovnání i tak provedeme, aby odpověď netrvala nápadně kratší dobu.
    await verifyPassword(parsed.data.password, "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin");
    return { error: genericError };
  }

  const ok = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!ok) return { error: genericError };

  await createSession(user.id);
  redirect(user.role === "TRAINER" ? "/prehled" : "/");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/prihlaseni");
}
