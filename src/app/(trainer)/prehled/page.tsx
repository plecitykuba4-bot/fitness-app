import Link from "next/link";
import { Users, CalendarCheck, CheckCircle2, TrendingUp } from "lucide-react";
import { requireTrainer } from "@/server/auth/guards";
import { getTrainerOverview } from "@/server/queries/trainer";
import { StatsCard } from "@/components/shared/stats-card";
import { EmptyState } from "@/components/shared/states";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import {
  formatNumber,
  formatPercent,
  formatPercentChange,
  formatRelativeDay,
  pluralWithCount,
} from "@/lib/format";

export const metadata = { title: "Přehled — Fitness trenér" };

export default async function OverviewPage() {
  const trainer = await requireTrainer();
  const data = await getTrainerOverview(trainer.trainerId);

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <span aria-hidden="true" className="mb-2 block h-1 w-12 rounded-full bg-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Přehled</h1>
        </div>
        <ThemeToggle />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label="Aktivní klienti"
          value={formatNumber(data.activeClients)}
          icon={<Users aria-hidden="true" className="size-6" />}
        />
        <StatsCard
          label="Tréninky tento týden"
          value={formatNumber(data.weekWorkoutCount)}
          icon={<CalendarCheck aria-hidden="true" className="size-6" />}
        />
        <StatsCard
          label="Dokončené tréninky"
          value={formatPercent(data.completionRate)}
          icon={<CheckCircle2 aria-hidden="true" className="size-6" />}
        />
        <StatsCard
          label="Průměrný pokrok"
          value={formatPercentChange(data.averageProgress)}
          tone={data.averageProgress >= 0 ? "success" : "danger"}
          icon={<TrendingUp aria-hidden="true" className="size-6" />}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Poslední aktivita</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentActivity.length === 0 ? (
              <p className="text-lg text-muted-foreground">
                Zatím žádný dokončený trénink.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {data.recentActivity.map((item) => (
                  <li key={item.id} className="py-3">
                    <Link
                      href={`/klienti/${item.clientId}`}
                      className="flex min-h-touch items-center justify-between gap-4"
                    >
                      <span>
                        <span className="block text-lg font-semibold">
                          {item.clientName}
                        </span>
                        <span className="block text-base text-muted-foreground">
                          {item.workoutName}
                        </span>
                      </span>
                      <span className="shrink-0 text-base text-muted-foreground">
                        {formatRelativeDay(item.startedAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dlouho necvičili</CardTitle>
          </CardHeader>
          <CardContent>
            {data.inactiveClients.length === 0 ? (
              <p className="text-lg text-muted-foreground">
                Všichni klienti trénují pravidelně.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {data.inactiveClients.map((client) => (
                  <li key={client.id} className="py-3">
                    <Link
                      href={`/klienti/${client.id}`}
                      className="flex min-h-touch items-center justify-between gap-4"
                    >
                      <span className="text-lg font-semibold">{client.name}</span>
                      <span className="shrink-0 text-base text-muted-foreground">
                        {client.lastWorkoutAt
                          ? formatRelativeDay(client.lastWorkoutAt)
                          : "Nikdy"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {data.activeClients === 0 && (
        <div className="mt-8">
          <EmptyState
            title="Zatím nemáte žádné klienty"
            description="Přidejte prvního klienta a sestavte mu tréninkový plán."
            action={
              <Button asChild size="lg">
                <Link href="/klienti">Přejít na klienty</Link>
              </Button>
            }
          />
        </div>
      )}

      <p className="sr-only">
        {pluralWithCount(data.activeClients, "aktivní klient", "aktivní klienti", "aktivních klientů")}
      </p>
    </div>
  );
}
