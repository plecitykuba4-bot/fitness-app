"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, UserPlus } from "lucide-react";
import { createClientAction, type FormState } from "@/server/actions/trainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/shared/field";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="xl" disabled={pending}>
      <UserPlus aria-hidden="true" />
      {pending ? "Vytvářím…" : "Vytvořit klienta"}
    </Button>
  );
}

export function NewClientForm() {
  const [state, action] = useActionState(createClientAction, {} as FormState);

  return (
    <form action={action} className="flex flex-col gap-6">
      {state.error && (
        <p role="alert" className="flex items-start gap-3 rounded-[var(--radius-button)] bg-danger px-4 py-3 text-lg font-semibold text-danger-foreground">
          <AlertCircle aria-hidden="true" className="mt-0.5 size-6 shrink-0" />
          {state.error}
        </p>
      )}

      <Field id="name" label="Jméno a příjmení" error={state.fieldErrors?.name}>
        <Input id="name" name="name" placeholder="Petr Novák" required />
      </Field>

      <Field id="email" label="E-mail" error={state.fieldErrors?.email}>
        <Input id="email" name="email" type="email" placeholder="petr@email.cz" required />
      </Field>

      <Field
        id="password"
        label="Heslo pro první přihlášení"
        error={state.fieldErrors?.password}
        hint="Alespoň 8 znaků. Heslo klientovi předejte osobně."
      >
        <Input id="password" name="password" type="password" minLength={8} required />
      </Field>

      <Submit />
    </form>
  );
}
