import Link from "next/link";
import {
  CalendarCheck2,
  ChevronRight,
  CreditCard,
  Dumbbell,
  PlayCircle,
} from "lucide-react";
import { requireClient } from "@/server/auth/guards";
import { getClientTemplates, getInProgressWorkout } from "@/server/queries/client";
import { db } from "@/server/db";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/states";
import {
  formatDateLong,
  formatRelativeDay,
  pluralWithCount,
  startOfWeek,
} from "@/lib/format";
import { ThemeToggle } from "@/components/shared/theme-toggle";

export const metadata = { title: "Domů — Fitness trenér" };

/**
 * Domovská obrazovka klienta.
 *
 * Žádný pevný rozvrh podle dne v týdnu — klient si vždycky vybírá sám,
 * který ze svých tréninků dnes chce cvičit. Rozcvičený trénink má přednost
 * před vším ostatním.
 */
export default async function TodayPage() {
  const client = await requireClient();
  const [inProgress, templates, lastWorkout, workoutsThisWeek, pass] =
    await Promise.all([
    getInProgressWorkout(client.clientId),
    getClientTemplates(client.clientId),
    db.workout.findFirst({
      where: { clientId: client.clientId, status: "COMPLETED" },
      orderBy: { startedAt: "desc" },
      select: {
        id: true,
        name: true,
        startedAt: true,
        _count: { select: { exercises: true } },
      },
    }),
    db.workout.count({
      where: {
        clientId: client.clientId,
        status: "COMPLETED",
        startedAt: { gte: startOfWeek(new Date()) },
      },
    }),
    db.trainingPass.findUnique({
      where: { clientId: client.clientId },
      select: { totalSessions: true, usedSessions: true },
    }),
  ]);

  const sessionsLeft = Math.max(
    (pass?.totalSessions ?? 0) - (pass?.usedSessions ?? 0),
    0,
  );

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-lg text-muted-foreground">{formatDateLong(new Date())}</p>
        <ThemeToggle />
      </div>
      <span aria-hidden="true" className="mt-4 block h-1 w-12 rounded-full bg-primary" />
      <h1 className="mt-2 text-3xl font-bold tracking-tight">
        Vítej, {firstName(client.name)}
      </h1>
      <p className="mb-6 mt-2 rounded-[var(--radius-button)] border-l-4 border-primary bg-primary/10 px-4 py-3 text-base italic text-muted-foreground">
        „Malé kroky každý den vedou k velkým výsledkům.“
      </p>

      <section className="mb-7" aria-labelledby="quick-overview">
        <h2 id="quick-overview" className="mb-3 text-2xl font-bold">
          Rychlý přehled
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <Card className="relative overflow-hidden p-4">
            <span className="absolute inset-y-0 left-0 w-1 bg-primary" />
            <CalendarCheck2
              aria-hidden="true"
              className="mb-3 size-6 text-primary-strong"
            />
            <p className="text-3xl font-extrabold">{workoutsThisWeek}</p>
            <p className="text-sm font-semibold text-muted-foreground">
              {workoutsThisWeek === 1
                ? "trénink tento týden"
                : "tréninky tento týden"}
            </p>
          </Card>

          <Link href="/karta" className="block">
            <Card className="relative h-full overflow-hidden p-4 transition-colors hover:bg-primary/10">
              <span className="absolute inset-y-0 left-0 w-1 bg-primary" />
              <CreditCard
                aria-hidden="true"
                className="mb-3 size-6 text-primary-strong"
              />
              <p className="text-3xl font-extrabold">{sessionsLeft}</p>
              <p className="text-sm font-semibold text-muted-foreground">
                tréninků na kartě
              </p>
            </Card>
          </Link>
        </div>

        {lastWorkout && (
          <Card className="mt-3 overflow-hidden">
            <Link
              href={`/trenink/${lastWorkout.id}/souhrn`}
              className="flex min-h-touch items-center gap-3 p-4 transition-colors hover:bg-primary/10"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Dumbbell aria-hidden="true" className="size-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-bold uppercase tracking-wider text-primary-strong">
                  Poslední trénink · {formatRelativeDay(lastWorkout.startedAt)}
                </span>
                <span className="block text-xl font-bold">{lastWorkout.name}</span>
                <span className="block text-sm text-muted-foreground">
                  {pluralWithCount(
                    lastWorkout._count.exercises,
                    "cvik",
                    "cviky",
                    "cviků",
                  )}{" "}
                  · zobrazit váhy a série
                </span>
              </span>
              <ChevronRight
                aria-hidden="true"
                className="size-6 shrink-0 text-primary-strong"
              />
            </Link>
          </Card>
        )}
      </section>

      {inProgress && (
        <Card className="mb-8 border-2 border-primary p-6 text-center">
          <p className="text-lg font-semibold text-muted-foreground">
            MÁTE ROZCVIČENÝ TRÉNINK
          </p>
          <p className="mt-2 text-3xl font-bold">{inProgress.name}</p>
          <Button asChild size="xl" className="mt-6">
            <Link href={`/trenink/${inProgress.id}`}>
              <PlayCircle aria-hidden="true" />
              Pokračovat v tréninku
            </Link>
          </Button>
        </Card>
      )}

      <h2 className="mb-1 text-2xl font-bold">
        {inProgress ? "Další tréninkové plány" : "Vyber si tréninkový plán"}
      </h2>
      <p className="mb-3 text-base text-muted-foreground">
        Klepnutím uvidíte všechny série a můžete rovnou začít.
      </p>

      {templates.length === 0 ? (
        <EmptyState
          title="Zatím nemáte žádný trénink"
          description="Váš trenér vám zatím nepřipravil žádný trénink. Jakmile ho přidá, uvidíte ho tady."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {templates.map((t) => (
            <li key={t.id}>
              <Card className="transition-colors hover:bg-surface-muted">
                <Link
                  href={`/plan/${t.id}`}
                  className="flex min-h-touch items-center gap-4 p-4"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-xl font-bold">{t.name}</span>
                    <span className="mt-1 block text-base text-muted-foreground">
                      {pluralWithCount(
                        t._count.exercises,
                        "cvik",
                        "cviky",
                        "cviků",
                      )}
                      {t.estimatedMin ? ` · ${t.estimatedMin} min` : ""}
                    </span>
                  </span>
                  <ChevronRight
                    aria-hidden="true"
                    className="size-6 shrink-0 text-muted-foreground"
                  />
                </Link>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function firstName(name: string): string {
  return name.split(" ")[0] ?? name;
}
