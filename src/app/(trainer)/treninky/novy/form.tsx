"use client";

import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, Copy, Library } from "lucide-react";
import {
  createTemplateAction,
  duplicateTemplateAction,
  type FormState,
} from "@/server/actions/template";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/shared/field";
import { SearchableSelect } from "@/components/shared/searchable-select";

const LIBRARY_TARGET = "__library__";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="xl" disabled={pending}>
      <ArrowRight aria-hidden="true" />
      {pending ? "Vytvářím…" : "Pokračovat na cviky"}
    </Button>
  );
}

export function NewTemplateForm({
  clients,
  libraryTemplates,
  preselectedClientId,
  navrat,
}: {
  clients: { id: string; name: string }[];
  libraryTemplates: {
    id: string;
    name: string;
    exerciseCount: number;
    estimatedMin: number | null;
  }[];
  preselectedClientId?: string;
  navrat?: string;
}) {
  const [state, action] = useActionState(createTemplateAction, {} as FormState);
  const router = useRouter();
  const [selectedClient, setSelectedClient] = useState(preselectedClientId ?? "");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [copyError, setCopyError] = useState<string | null>(null);
  const [copying, startCopying] = useTransition();

  const copyFromLibrary = () => {
    setCopyError(null);
    if (!selectedClient || selectedClient === LIBRARY_TARGET) {
      setCopyError("Nejdřív vyberte klienta.");
      return;
    }
    if (!selectedTemplate) {
      setCopyError("Vyberte předlohu z knihovny.");
      return;
    }

    startCopying(async () => {
      const result = await duplicateTemplateAction(
        selectedTemplate,
        selectedClient,
      );
      if (result.ok) router.push(`/treninky/${result.newId}`);
      else setCopyError(result.error);
    });
  };

  return (
    <form action={action} autoComplete="off" className="flex flex-col gap-6">
      {navrat && <input type="hidden" name="navrat" value={navrat} />}

      <Field
        id="clientId"
        label="Pro kterého klienta"
        error={state.fieldErrors?.clientId}
        hint="Trénink patří jednomu klientovi. Předloha do knihovny se dá zkopírovat komukoli."
      >
        <SearchableSelect
          id="clientId"
          name="clientId"
          defaultValue={preselectedClientId ?? ""}
          placeholder="Hledat klienta…"
          alwaysOpen
          onValueChange={setSelectedClient}
          options={[
            ...clients.map((client) => ({ value: client.id, label: client.name })),
            { value: LIBRARY_TARGET, label: "Předloha do knihovny (bez klienta)" },
          ]}
        />
      </Field>

      <section className="rounded-[var(--radius-button)] border-2 border-primary/25 bg-primary/[0.06] p-4">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <Library aria-hidden="true" className="size-5 text-primary-strong" />
          Použít předlohu z knihovny
        </h2>
        <p className="mb-4 mt-1 text-sm text-muted-foreground">
          Zkopíruje celý plán včetně cviků, sérií, vah, pauz a poznámek.
        </p>

        {libraryTemplates.length === 0 ? (
          <p className="rounded-lg bg-surface p-3 text-sm text-muted-foreground">
            Knihovna je zatím prázdná. Nový plán můžete vytvořit níže.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            <SearchableSelect
              id="libraryTemplateId"
              placeholder="Hledat předlohu…"
              alwaysOpen
              onValueChange={setSelectedTemplate}
              options={libraryTemplates.map((template) => ({
                value: template.id,
                label: template.name,
                description: `${template.exerciseCount} cviků${
                  template.estimatedMin ? ` · ${template.estimatedMin} min` : ""
                }`,
              }))}
            />
            <Button
              type="button"
              variant="secondary"
              block
              disabled={copying}
              onClick={copyFromLibrary}
            >
              <Copy aria-hidden="true" />
              {copying ? "Kopíruji…" : "Použít vybranou předlohu"}
            </Button>
          </div>
        )}

        {copyError && (
          <p role="alert" className="mt-3 flex items-center gap-2 text-sm font-bold text-danger">
            <AlertCircle aria-hidden="true" className="size-5 shrink-0" />
            {copyError}
          </p>
        )}
      </section>

      <div className="flex items-center gap-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        Nebo vytvořit nový plán
        <span className="h-px flex-1 bg-border" />
      </div>

      <Field id="name" label="Název tréninku" error={state.fieldErrors?.name}>
        <Input id="name" name="name" autoComplete="off" placeholder="Upper body A" required />
      </Field>

      <Field id="description" label="Popis" hint="Nepovinné.">
        <Input id="description" name="description" placeholder="Prsa, ramena, triceps." />
      </Field>

      <Field
        id="estimatedMin"
        label="Odhadovaná délka v minutách"
        error={state.fieldErrors?.estimatedMin}
        hint="Nepovinné. Klient ji uvidí u dnešního tréninku."
      >
        <Input id="estimatedMin" name="estimatedMin" type="number" inputMode="numeric" min={5} max={300} placeholder="55" />
      </Field>

      <Submit />
    </form>
  );
}
