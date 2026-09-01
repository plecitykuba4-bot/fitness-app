import Link from "next/link";
import { ArrowLeft, ChevronRight, ClipboardList, FileText, Trophy } from "lucide-react";
import { requireOwnedClient } from "@/server/auth/guards";
import { db } from "@/server/db";
import { getWorkoutHistory } from "@/server/queries/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NoteForm } from "@/components/shared/note-form";
import { NoteList } from "@/components/shared/note-list";
import { addClientNoteAction } from "@/server/actions/note";
import {
  formatDate,
  formatDurationHuman,
  formatWeight,
} from "@/lib/format";

export const metadata = { title: "Klient — Fitness trenér" };

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Ověří, že klient patří přihlášenému trenérovi. Cizí klient => 404.
  const { client } = await requireOwnedClient(id);

  const [workouts, records, templates] = await Promise.all([
    getWorkoutHistory(client.id, 100),
    db.personalRecord.findMany({
      where: { clientId: client.id },
      orderBy: { bestWeightKg: "desc" },
      take: 6,
      include: { exercise: { select: { name: true } } },
    }),
    db.workoutTemplate.findMany({
      where: { clientId: client.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const notes = await db.note.findMany({
    where: { clientId: client.id, scope: "CLIENT" },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { author: { select: { name: true } } },
  });

  return (
    <div className="mx-auto w-full max-w-3xl">
      <Button asChild variant="ghost" className="mb-4">
        <Link href="/klienti">
          <ArrowLeft aria-hidden="true" />
          Zpět na klienty
        </Link>
      </Button>

      <h1 className="text-3xl font-bold tracking-tight">{client.user.name}</h1>
      <p className="mt-1 text-lg text-muted-foreground">{client.user.email}</p>

      <Button asChild size="lg" className="mt-4 mb-6">
        <Link href={`/klienti/${client.id}/report`}>
          <FileText aria-hidden="true" />
          Týdenní report
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Tréninky ({templates.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <p className="text-lg text-muted-foreground">
              Klient zatím nemá žádný trénink.{" "}
              <Link
                href={`/treninky/novy?klient=${client.id}`}
                className="font-semibold text-primary-strong underline"
              >
                Vytvořit
              </Link>
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {templates.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/treninky/${t.id}`}
                    className="flex min-h-touch items-center justify-between gap-3 rounded-[var(--radius-button)] bg-surface-muted px-4 py-3 hover:bg-border"
                  >
                    <span className="text-lg font-semibold">{t.name}</span>
                    <ChevronRight
                      aria-hidden="true"
                      className="size-5 shrink-0 text-muted-foreground"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <Button asChild variant="secondary" size="default" className="mt-3">
            <Link href={`/treninky/novy?klient=${client.id}`}>
              <ClipboardList aria-hidden="true" />
              Přidat další trénink
            </Link>
          </Button>
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Osobní rekordy</CardTitle>
          </CardHeader>
          <CardContent>
            {records.length === 0 ? (
              <p className="text-lg text-muted-foreground">Zatím žádný rekord.</p>
            ) : (
              <ul className="divide-y divide-border">
                {records.map((r) => (
                  <li key={r.id} className="flex justify-between gap-4 py-3">
                    <span className="flex items-center gap-2 text-lg font-semibold">
                      <Trophy aria-hidden="true" className="size-5 text-warning" />
                      {r.exercise.name}
                    </span>
                    <span className="tabular text-lg font-bold">
                      {formatWeight(r.bestWeightKg)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Historie tréninků</CardTitle>
          </CardHeader>
          <CardContent>
            {workouts.length === 0 ? (
              <p className="text-lg text-muted-foreground">
                Klient zatím nic neodcvičil.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {workouts.slice(0, 8).map((w) => (
                  <li key={w.id}>
                    <Link href={`/klienti/${client.id}/historie/${w.id}`} className="flex min-h-touch items-center justify-between gap-4 py-3">
                    <span>
                      <span className="block text-lg font-semibold">{w.name}</span>
                      <span className="block text-base text-muted-foreground">
                        {formatDate(w.startedAt)}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2 text-base text-muted-foreground">
                      <span className="tabular">{formatDurationHuman(w.durationSec ?? 0)}</span>
                      <ChevronRight aria-hidden="true" className="size-5" />
                    </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Poznámky ke klientovi</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <NoteForm
            action={addClientNoteAction}
            hiddenField={{ name: "clientId", value: client.id }}
            label="Nová poznámka"
            placeholder="Např. bolest ramene, změna techniky, cíl na příští měsíc…"
            submitLabel="Uložit poznámku"
          />
          <NoteList
            notes={notes.map((n) => ({
              id: n.id,
              body: n.body,
              authorName: n.author.name,
              createdAt: n.createdAt,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
