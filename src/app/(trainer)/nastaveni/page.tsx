import Link from "next/link";
import { LogOut, Users, Dumbbell, ListChecks } from "lucide-react";
import { requireTrainer } from "@/server/auth/guards";
import { logoutAction } from "@/server/auth/actions";
import { db } from "@/server/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatsCard } from "@/components/shared/stats-card";
import { formatDate, formatNumber } from "@/lib/format";

export const metadata = { title: "Můj profil — Fitness trenér" };

export default async function TrainerProfilePage() {
  const session = await requireTrainer();

  const trainer = await db.trainer.findUnique({
    where: { id: session.trainerId },
    include: {
      user: true,
      _count: { select: { clients: true, exercises: true, templates: true } },
    },
  });

  if (!trainer) {
    // Nemělo by nastat — requireTrainer už existenci ověřil.
    return null;
  }

  const activeClients = await db.client.count({
    where: { trainerId: trainer.id, status: "ACTIVE" },
  });

  const rows = [
    { label: "Jméno", value: trainer.user.name },
    { label: "E-mail", value: trainer.user.email },
    { label: "Role", value: "Trenér" },
    { label: "Účet založen", value: formatDate(trainer.createdAt) },
  ];

  return (
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="mb-6 text-3xl font-bold tracking-tight">Můj profil</h1>

      <Card>
        <CardHeader>
          <CardTitle>Vaše údaje</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="divide-y divide-border">
            {rows.map((row) => (
              <div
                key={row.label}
                className="flex flex-wrap items-center justify-between gap-2 py-3"
              >
                <dt className="text-lg text-muted-foreground">{row.label}</dt>
                <dd className="text-lg font-semibold">{row.value}</dd>
              </div>
            ))}
          </dl>

          {trainer.bio && (
            <p className="mt-4 border-t border-border pt-4 text-lg leading-relaxed">
              {trainer.bio}
            </p>
          )}
        </CardContent>
      </Card>

      <h2 className="mt-8 mb-3 text-2xl font-bold">Vaše čísla</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <StatsCard
          label="Aktivní klienti"
          value={formatNumber(activeClients)}
          hint={`z celkem ${formatNumber(trainer._count.clients)}`}
          icon={<Users aria-hidden="true" className="size-6" />}
        />
        <StatsCard
          label="Cviky v databázi"
          value={formatNumber(trainer._count.exercises)}
          icon={<Dumbbell aria-hidden="true" className="size-6" />}
        />
        <StatsCard
          label="Tréninky"
          value={formatNumber(trainer._count.templates)}
          icon={<ListChecks aria-hidden="true" className="size-6" />}
        />
      </div>

      <h2 className="mt-8 mb-3 text-2xl font-bold">Rychlé odkazy</h2>
      <div className="flex flex-col gap-3">
        <Button asChild variant="secondary" size="lg" block>
          <Link href="/klienti/novy">Přidat klienta</Link>
        </Button>
        <Button asChild variant="secondary" size="lg" block>
          <Link href="/cviky/novy">Přidat cvik</Link>
        </Button>
        <Button asChild variant="secondary" size="lg" block>
          <Link href="/treninky/novy">Vytvořit trénink</Link>
        </Button>
      </div>

      <form action={logoutAction} className="mt-8">
        <Button type="submit" variant="secondary" size="lg" block>
          <LogOut aria-hidden="true" />
          Odhlásit se
        </Button>
      </form>
    </div>
  );
}
