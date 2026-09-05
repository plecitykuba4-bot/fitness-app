"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Mail } from "lucide-react";
import { requestPasswordResetAction, type ResetRequestState } from "@/server/actions/password-reset";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function Submit() { const { pending } = useFormStatus(); return <Button type="submit" size="xl" disabled={pending}><Mail aria-hidden="true" />{pending ? "Odesílám…" : "Poslat odkaz"}</Button>; }

export function ForgotPasswordForm() {
  const [state, action] = useActionState(requestPasswordResetAction, {} as ResetRequestState);
  return <form action={action} className="flex flex-col gap-5"><div><Label htmlFor="email">E-mail</Label><Input id="email" name="email" type="email" autoComplete="email" required placeholder="vas@email.cz" /></div>{state.error && <p role="alert" className="font-semibold text-danger">{state.error}</p>}{state.success && <p role="status" className="font-semibold text-success">{state.success}</p>}<Submit /></form>;
}
