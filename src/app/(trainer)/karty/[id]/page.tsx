import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireOwnedClient } from "@/server/auth/guards";
import { db } from "@/server/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrainingPassCard } from "@/components/shared/training-pass-card";
import { updateTrainingPassAction } from "@/server/actions/trainer";

export const metadata = { title: "Karta klienta — Fitness trenér" };

export default async function TrainingCardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { client } = await requireOwnedClient(id);
  const pass = await db.trainingPass.findUnique({ where: { clientId: client.id } });
  const total = pass?.totalSessions ?? 0;
  const used = pass?.usedSessions ?? 0;
  return <div className="mx-auto w-full max-w-xl">
    <Button asChild variant="ghost" className="mb-3"><Link href="/karty"><ArrowLeft aria-hidden="true" />Zpět na karty</Link></Button>
    <TrainingPassCard name={client.user.name} total={total} used={used} editable clientId={client.id} />
    <Card className="mt-5"><CardHeader><CardTitle>Nastavení karty</CardTitle></CardHeader><CardContent><form action={updateTrainingPassAction} className="flex items-end gap-3"><input type="hidden" name="clientId" value={client.id} /><input type="hidden" name="usedSessions" value={Math.min(used, total)} /><label className="flex-1 text-base font-semibold">Počet zaplacených tréninků<input className="mt-1 min-h-touch w-full rounded-[var(--radius-button)] border-2 bg-surface px-3" name="totalSessions" type="number" min="0" max="50" defaultValue={total} /></label><Button type="submit">Uložit</Button></form></CardContent></Card>
  </div>;
}
