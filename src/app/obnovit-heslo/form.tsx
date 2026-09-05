"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { KeyRound } from "lucide-react";
import { setNewPasswordAction, type NewPasswordState } from "@/server/actions/password-reset";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function Submit() { const { pending } = useFormStatus(); return <Button type="submit" size="xl" disabled={pending}><KeyRound aria-hidden="true" />{pending ? "Ukládám…" : "Nastavit nové heslo"}</Button>; }

export function NewPasswordForm({ token }: { token: string }) {
  const actionWithToken = setNewPasswordAction.bind(null, token);
  const [state, action] = useActionState(actionWithToken, {} as NewPasswordState);
  return <form action={action} className="flex flex-col gap-5"><div><Label htmlFor="password">Nové heslo</Label><Input id="password" name="password" type="password" autoComplete="new-password" minLength={12} required /></div><div><Label htmlFor="passwordConfirmation">Zopakovat heslo</Label><Input id="passwordConfirmation" name="passwordConfirmation" type="password" autoComplete="new-password" minLength={12} required /></div>{state.error && <p role="alert" className="font-semibold text-danger">{state.error}</p>}<Submit /></form>;
}
