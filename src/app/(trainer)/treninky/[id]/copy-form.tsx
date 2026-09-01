"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Copy } from "lucide-react";
import { duplicateTemplateAction } from "@/server/actions/template";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/shared/field";
import { SearchableSelect } from "@/components/shared/searchable-select";

/**
 * Kopie tréninku jinému klientovi.
 * Tréninky se nesdílí, takže bez kopírování by trenér stejnou sestavu
 * musel u každého klienta naklikat znovu.
 */
export function CopyTemplateForm({
  templateId,
  clients,
  currentClientId,
}: {
  templateId: string;
  clients: { id: string; name: string }[];
  currentClientId: string | null;
}) {
  const router = useRouter();
  const [target, setTarget] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const others = clients.filter((c) => c.id !== currentClientId);

  const copy = () => {
    setError(null);
    startTransition(async () => {
      const result = await duplicateTemplateAction(
        templateId,
        target === "" ? null : target,
      );
      if (result.ok) {
        router.push(`/treninky/${result.newId}`);
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <Field
        id="copyTarget"
        label="Zkopírovat komu"
        hint="Vytvoří se samostatná kopie. Pozdější úpravy se mezi klienty nepřenášejí."
      >
        <SearchableSelect
          id="copyTarget"
          defaultValue=""
          placeholder="Hledat klienta…"
          onValueChange={setTarget}
          options={[
            { value: "", label: "Do knihovny předloh" },
            ...others.map((client) => ({ value: client.id, label: client.name })),
          ]}
        />
      </Field>

      {error && (
        <p role="alert" className="flex items-start gap-2 text-base font-semibold text-danger">
          <AlertCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          {error}
        </p>
      )}

      <Button type="button" variant="secondary" size="lg" block onClick={copy} disabled={pending}>
        <Copy aria-hidden="true" />
        {pending ? "Kopíruji…" : "Vytvořit kopii"}
      </Button>
    </div>
  );
}
