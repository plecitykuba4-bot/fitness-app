"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CLIENT_STATUS_LABELS, ClientStatusSchema } from "@/lib/enums";
import { formatRelativeDay, pluralWithCount } from "@/lib/format";

type ClientItem = {
  id: string;
  name: string;
  email: string;
  status: string;
  planCount: number;
  workoutCount: number;
  lastWorkout: { startedAt: Date; name: string } | null;
};

export function ClientList({ clients }: { clients: ClientItem[] }) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLocaleLowerCase("cs");
  const filtered = clients.filter((client) =>
    `${client.name} ${client.email}`.toLocaleLowerCase("cs").includes(needle),
  );

  return (
    <>
      <label className="relative mb-4 block">
        <span className="sr-only">Hledat klienta podle jména nebo e-mailu</span>
        <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-3.5 size-5 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Hledat klienta…"
          className="pl-12"
        />
      </label>

      <p className="mb-3 text-sm text-muted-foreground" aria-live="polite">
        {filtered.length === clients.length
          ? pluralWithCount(clients.length, "klient", "klienti", "klientů")
          : `${filtered.length} z ${clients.length} klientů`}
      </p>

      {filtered.length === 0 ? (
        <Card className="p-6 text-center text-muted-foreground">
          Žádný klient neodpovídá hledání „{query}“.
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((client) => {
            const status = ClientStatusSchema.catch("ACTIVE").parse(client.status);
            return (
              <li key={client.id}>
                <Card className="transition-colors hover:bg-surface-muted">
                  <Link href={`/klienti/${client.id}`} className="flex min-h-touch-lg items-center gap-4 p-5">
                    <span aria-hidden="true" className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
                      {initials(client.name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-xl font-bold">{client.name}</span>
                        {status !== "ACTIVE" && <Badge>{CLIENT_STATUS_LABELS[status]}</Badge>}
                      </span>
                      <span className="mt-1 block truncate text-base text-muted-foreground">{client.email}</span>
                      <span className="mt-1 block text-base text-muted-foreground">
                        {pluralWithCount(
                          client.planCount,
                          "tréninkový plán",
                          "tréninkové plány",
                          "tréninkových plánů",
                        )}
                        {" · "}
                        {pluralWithCount(
                          client.workoutCount,
                          "odcvičený trénink",
                          "odcvičené tréninky",
                          "odcvičených tréninků",
                        )}
                        {client.lastWorkout && ` · naposledy ${formatRelativeDay(client.lastWorkout.startedAt)}`}
                      </span>
                    </span>
                    <ChevronRight aria-hidden="true" className="size-6 shrink-0 text-muted-foreground" />
                  </Link>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function initials(name: string): string {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
}
