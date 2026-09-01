import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireOwnedClient } from "@/server/auth/guards";
import { WeeklyReportView } from "@/components/shared/weekly-report";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Týdenní report — Fitness trenér" };

export default async function TrainerReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Cizí klient => 404.
  const { client } = await requireOwnedClient(id);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <Button asChild variant="ghost" className="mb-4">
        <Link href={`/klienti/${client.id}`}>
          <ArrowLeft aria-hidden="true" />
          Zpět na klienta
        </Link>
      </Button>

      <h1 className="mb-6 text-3xl font-bold tracking-tight">Týdenní report</h1>
      <WeeklyReportView clientId={client.id} clientName={client.user.name} />
    </div>
  );
}
