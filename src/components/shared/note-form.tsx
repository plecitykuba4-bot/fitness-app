"use client";

import { useActionState, useRef } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { NoteState } from "@/server/actions/note";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" block disabled={pending}>
      <MessageSquarePlus aria-hidden="true" />
      {pending ? "Ukládám…" : label}
    </Button>
  );
}

/** Sdílený formulář pro poznámky. Konkrétní akci dodává rodič. */
export function NoteForm({
  action,
  hiddenField,
  label,
  placeholder,
  submitLabel,
}: {
  action: (prev: NoteState, formData: FormData) => Promise<NoteState>;
  hiddenField: { name: string; value: string };
  label: string;
  placeholder: string;
  submitLabel: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(
    async (prev: NoteState, formData: FormData) => {
      const result = await action(prev, formData);
      if (!result.error) formRef.current?.reset();
      return result;
    },
    {} as NoteState,
  );

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name={hiddenField.name} value={hiddenField.value} />

      {state.error && (
        <p role="alert" className="flex items-start gap-3 rounded-[var(--radius-button)] bg-danger px-4 py-3 text-lg font-semibold text-danger-foreground">
          <AlertCircle aria-hidden="true" className="mt-0.5 size-6 shrink-0" />
          {state.error}
        </p>
      )}

      <label>
        <span className="mb-2 block text-lg font-semibold">{label}</span>
        <textarea
          name="body"
          rows={4}
          required
          maxLength={2000}
          placeholder={placeholder}
          className="w-full rounded-[var(--radius-button)] border-2 border-border bg-surface p-4 text-lg text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
      </label>

      <Submit label={submitLabel} />
    </form>
  );
}
