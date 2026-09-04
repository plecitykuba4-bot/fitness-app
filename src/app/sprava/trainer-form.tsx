"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { UserPlus } from "lucide-react";
import { createTrainerAction, type AdminActionState } from "@/server/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AdminActionState = {};

function Submit() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}><UserPlus aria-hidden="true" />{pending ? "Vytvářím…" : "Vytvořit trenéra"}</Button>;
}

export function TrainerForm() {
  const [state, action] = useActionState(createTrainerAction, initialState);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Label htmlFor="name">Jméno trenéra</Label>
        <Input id="name" name="name" autoComplete="name" required />
      </div>
      <div>
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div>
        <Label htmlFor="password">Dočasné heslo</Label>
        <Input id="password" name="password" type="password" minLength={12} autoComplete="new-password" required />
      </div>
      {state.error && <p role="alert" className="sm:col-span-2 text-sm font-semibold text-danger">{state.error}</p>}
      {state.success && <p role="status" className="sm:col-span-2 text-sm font-semibold text-success">{state.success}</p>}
      <div className="sm:col-span-2"><Submit /></div>
    </form>
  );
}
