import Link from "next/link";
import { ChevronRight, TrendingUp } from "lucide-react";
import { requireTrainer } from "@/server/auth/guards";
import { db } from "@/server/db";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/states";
import { formatRelativeDay, pluralWithCount } from "@/lib/format";

export const metadata = { title: "Analytika — Fitness trenér" };

export default async function AnalyticsPage() {
  const trainer = await requireTrainer();
  const clients = await db.client.findMany({
    where: { trainerId: trainer.trainerId, status: "ACTIVE" },
    orderBy: { user: { name: "asc" } },
    include: {
      user: { select: { name: true } },
      workouts: { where: { status: "COMPLETED" }, orderBy: { startedAt: "desc" }, take: 1, select: { startedAt: true } },
      _count: { select: { workouts: true } },
    },
  });

  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="text-3xl font-bold tracking-tight">Analytika klientů</h1>
      <p className="mb-5 mt-1 text-base text-muted-foreground">Vyber klienta a podívej se, jak se u jednotlivých cviků mění používaná váha.</p>
      {clients.length === 0 ? <EmptyState title="Zatím žádní klienti" description="Po přidání klientů se jejich vývoj zobrazí tady." /> : (
        <ul className="flex flex-col gap-3">
          {clients.map((client) => (
            <li key={client.id}><Card className="transition-colors hover:bg-surface-muted">
              <Link href={`/analytika/${client.id}`} className="flex min-h-touch items-center gap-3 p-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary-strong"><TrendingUp aria-hidden="true" className="size-5" /></span>
                <span className="min-w-0 flex-1"><span className="block text-lg font-bold">{client.user.name}</span><span className="block text-sm text-muted-foreground">{pluralWithCount(client._count.workouts, "trénink", "tréninky", "tréninků")}{client.workouts[0] ? ` · naposledy ${formatRelativeDay(client.workouts[0].startedAt)}` : " · zatím bez tréninku"}</span></span>
                <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
              </Link>
            </Card></li>
          ))}
        </ul>
      )}
    </div>
  );
}
