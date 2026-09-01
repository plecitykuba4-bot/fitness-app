import Link from "next/link";
import { requireClient } from "@/server/auth/guards";
import { getClientTemplates, getWorkoutHistory, getInProgressWorkout } from "@/server/queries/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/states";
import { ChevronRight, PlayCircle } from "lucide-react";
import { formatDate, pluralWithCount } from "@/lib/format";

export const metadata = { title: "Trénink — Fitness trenér" };

export default async function WorkoutHistoryPage() {
  const client = await requireClient();
  const [history, inProgress, templates] = await Promise.all([
    getWorkoutHistory(client.clientId, 30),
    getInProgressWorkout(client.clientId),
    getClientTemplates(client.clientId),
  ]);

  return (
    <div className="mx-auto w-full max-w-xl">
      <h1 className="mb-2 text-3xl font-bold tracking-tight">Tréninkové plány</h1>
      <p className="mb-5 text-base text-muted-foreground">Otevři plán, zkontroluj série a spusť svůj trénink.</p>

      {inProgress && (
        <Card className="mb-6 border-2 border-primary p-5 text-center">
          <p className="text-lg font-semibold text-muted-foreground">
            ROZCVIČENÝ TRÉNINK
          </p>
          <p className="mt-1 text-2xl font-bold">{inProgress.name}</p>
          <Button asChild size="xl" className="mt-4">
            <Link href={`/trenink/${inProgress.id}`}>
              <PlayCircle aria-hidden="true" />
              Pokračovat v tréninku
            </Link>
          </Button>
        </Card>
      )}

      {templates.length === 0 ? (
        <EmptyState
          title="Zatím nemáte žádný plán"
          description="Váš trenér vám sem brzy připraví první tréninkový plán."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {templates.map((plan) => (
            <li key={plan.id}>
              <Card>
                <Link href={`/plan/${plan.id}`} className="flex min-h-touch items-center gap-4 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xl font-bold">{plan.name}</p>
                      <p className="mt-1 text-base text-muted-foreground">
                        {pluralWithCount(plan._count.exercises, "cvik", "cviky", "cviků")}{plan.estimatedMin ? ` · ${plan.estimatedMin} min` : ""}
                      </p>
                    </div>
                  </div>
                  <ChevronRight aria-hidden="true" className="ml-auto size-5 shrink-0 text-muted-foreground" />
                </Link>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {history.length > 0 && <h2 className="mt-8 mb-3 text-2xl font-bold">Poslední tréninky</h2>}
      {history.slice(0, 3).map((w) => (
        <Link key={w.id} href={`/trenink/${w.id}/souhrn`} className="mb-2 flex min-h-touch items-center justify-between gap-3 rounded-[var(--radius-button)] border border-primary/20 bg-surface-muted px-4 transition-colors hover:bg-primary/10">
          <span><span className="block font-semibold">{w.name}</span><span className="text-sm text-muted-foreground">{formatDate(w.startedAt)}</span></span>
          <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-primary-strong">
            Cviky a váhy
            <ChevronRight aria-hidden="true" className="size-4" />
          </span>
        </Link>
      ))}
    </div>
  );
}
