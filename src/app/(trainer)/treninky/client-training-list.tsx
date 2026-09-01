"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TemplateRow, type TemplateWithCounts } from "./template-row";

type ClientWithTemplates = {
  id: string;
  name: string;
  templates: TemplateWithCounts[];
};

export function ClientTrainingList({
  clients,
}: {
  clients: ClientWithTemplates[];
}) {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLocaleLowerCase("cs");
  const filtered = clients.filter((client) =>
    client.name.toLocaleLowerCase("cs").includes(normalized),
  );

  return (
    <>
      <label className="relative mb-5 block">
        <span className="sr-only">Hledat klienta podle jména</span>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-3.5 size-5 text-muted-foreground"
        />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Hledat klienta…"
          className="border-primary/35 bg-surface pl-12"
        />
      </label>

      <p className="mb-3 text-sm text-muted-foreground" aria-live="polite">
        {normalized
          ? `${filtered.length} z ${clients.length} klientů`
          : `${clients.length} klientů`}
      </p>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-primary/40 bg-primary/[0.05] p-5 text-center text-muted-foreground">
          Žádný klient neodpovídá hledání „{query}“.
        </p>
      ) : (
        filtered.map((client) => (
          <section
            key={client.id}
            className="mb-8 rounded-2xl border border-primary/20 bg-primary/[0.035] p-4"
          >
            <h2 className="mb-1 flex items-center gap-2 text-2xl font-bold">
              <span
                aria-hidden="true"
                className="size-2.5 rounded-full bg-primary shadow-[0_0_0_5px_rgb(174_240_0_/_0.14)]"
              />
              {client.name}
            </h2>

            {client.templates.length === 0 ? (
              <p className="text-lg text-muted-foreground">
                Zatím žádný trénink.{" "}
                <Link
                  href={`/treninky/novy?klient=${client.id}`}
                  className="font-semibold text-primary-strong underline"
                >
                  Vytvořit
                </Link>
              </p>
            ) : (
              <ul className="mt-3 flex flex-col gap-3">
                {client.templates.map((template) => (
                  <TemplateRow key={template.id} template={template} />
                ))}
              </ul>
            )}

            <Button
              asChild
              variant="secondary"
              size="default"
              className="mt-3 border-primary/35 bg-primary/10 hover:bg-primary/20"
            >
              <Link href={`/treninky/novy?klient=${client.id}`}>
                <Plus aria-hidden="true" />
                Přidat další trénink
              </Link>
            </Button>
          </section>
        ))
      )}
    </>
  );
}
