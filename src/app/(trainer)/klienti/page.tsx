import Link from "next/link";
import { UserPlus } from "lucide-react";
import { requireTrainer } from "@/server/auth/guards";
import { getTrainerClients } from "@/server/queries/trainer";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/states";
import { ClientList } from "./client-list";

export const metadata = { title: "Klienti — Fitness trenér" };

export default async function ClientsPage() {
  const trainer = await requireTrainer();
  const clients = await getTrainerClients(trainer.trainerId);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Klienti</h1>
        <Button asChild size="lg">
          <Link href="/klienti/novy">
            <UserPlus aria-hidden="true" />
            Přidat klienta
          </Link>
        </Button>
      </div>

      {clients.length === 0 ? (
        <EmptyState
          title="Zatím nemáte žádné klienty"
          description="Přidejte prvního klienta a můžete mu rovnou sestavit tréninkový plán."
          action={
            <Button asChild size="lg">
              <Link href="/klienti/novy">
                <UserPlus aria-hidden="true" />
                Přidat klienta
              </Link>
            </Button>
          }
        />
      ) : (
        <ClientList clients={clients} />
      )}
    </div>
  );
}
