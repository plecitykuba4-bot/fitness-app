import Link from "next/link";
import { ChevronRight, CreditCard } from "lucide-react";
import { requireTrainer } from "@/server/auth/guards";
import { db } from "@/server/db";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/states";

export const metadata = { title: "Tréninkové karty — Fitness trenér" };

export default async function TrainingCardsPage() {
  const trainer = await requireTrainer();
  const clients = await db.client.findMany({
    where: { trainerId: trainer.trainerId, status: "ACTIVE" },
    orderBy: { user: { name: "asc" } },
    include: { user: { select: { name: true } }, trainingPass: true },
  });

  return <div className="mx-auto w-full max-w-3xl">
    <h1 className="text-3xl font-bold tracking-tight">Tréninkové karty</h1>
    <p className="mb-5 mt-1 text-base text-muted-foreground">Vyber klienta, nastav počet zaplacených tréninků a ručně označ odcvičené.</p>
    {clients.length === 0 ? <EmptyState title="Zatím žádní klienti" description="Karty se zobrazí po přidání klientů." /> : <ul className="flex flex-col gap-3">{clients.map((client) => {
      const total = client.trainingPass?.totalSessions ?? 0;
      const used = client.trainingPass?.usedSessions ?? 0;
      return <li key={client.id}><Card><Link href={`/karty/${client.id}`} className="flex min-h-touch items-center gap-3 p-4"><span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary-strong"><CreditCard aria-hidden="true" className="size-5" /></span><span className="min-w-0 flex-1"><span className="block text-lg font-bold">{client.user.name}</span><span className="block text-sm text-muted-foreground">{total === 0 ? "Karta není nastavená" : `${used} z ${total} odcvičeno · ${total - used} zbývá`}</span></span><ChevronRight aria-hidden="true" className="size-5 text-muted-foreground" /></Link></Card></li>;
    })}</ul>}
  </div>;
}
