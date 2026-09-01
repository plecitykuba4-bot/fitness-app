import Link from "next/link";
import { ClipboardList, Library, Plus } from "lucide-react";
import { requireTrainer } from "@/server/auth/guards";
import { db } from "@/server/db";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/states";
import { TemplateRow } from "./template-row";
import { ClientTrainingList } from "./client-training-list";

export const metadata = { title: "Tréninky — Fitness trenér" };

export default async function TemplatesPage() {
  const trainer = await requireTrainer();

  const [templates, clients] = await Promise.all([
    db.workoutTemplate.findMany({
      where: { trainerId: trainer.trainerId },
      orderBy: { name: "asc" },
      include: {
        _count: { select: { exercises: true } },
        client: { include: { user: { select: { name: true } } } },
      },
    }),
    db.client.findMany({
      where: { trainerId: trainer.trainerId },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  // Tréninky patří konkrétním klientům, proto je seskupujeme podle nich.
  // Šablony bez klienta tvoří knihovnu, ze které se kopíruje.
  const library = templates.filter((t) => t.clientId === null);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="h-8 w-1.5 rounded-full bg-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Tréninky</h1>
        </div>
        <Button asChild size="lg">
          <Link href="/treninky/novy">
            <Plus aria-hidden="true" />
            Vytvořit trénink
          </Link>
        </Button>
      </div>
      <p className="mb-6 text-lg text-muted-foreground">
        Každý klient má vlastní tréninky. Knihovna dole slouží jako předloha,
        ze které se kopíruje.
      </p>

      {templates.length === 0 ? (
        <EmptyState
          icon={<ClipboardList aria-hidden="true" className="size-12" />}
          title="Zatím nemáte žádný trénink"
          description="Vytvořte klientovi první trénink a pak ho zařaďte do jeho plánu."
          action={
            <Button asChild size="lg">
              <Link href="/treninky/novy">
                <Plus aria-hidden="true" />
                Vytvořit trénink
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <ClientTrainingList
            clients={clients.map((client) => ({
              id: client.id,
              name: client.user.name,
              templates: templates
                .filter((template) => template.clientId === client.id)
                .map((template) => ({
                  id: template.id,
                  name: template.name,
                  estimatedMin: template.estimatedMin,
                  _count: template._count,
                })),
            }))}
          />

          <section className="mt-10 border-t-2 border-primary/30 pt-6">
              <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-2xl font-bold">
                  <Library aria-hidden="true" className="size-6 text-primary-strong" />
                  Knihovna předloh
                </h2>
                <Button asChild size="default">
                  <Link href="/treninky/novy?knihovna=1">
                    <Plus aria-hidden="true" />
                    Nová předloha
                  </Link>
                </Button>
              </div>
              <p className="mb-3 text-lg text-muted-foreground">
                Nepatří žádnému klientovi. Otevřete předlohu a zkopírujte ji
                konkrétnímu klientovi.
              </p>
              {library.length === 0 ? (
                <p className="rounded-xl border border-dashed border-primary/40 bg-primary/[0.05] p-4 text-muted-foreground">
                  Knihovna je zatím prázdná. Vytvořte první předlohu.
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {library.map((t) => (
                    <TemplateRow key={t.id} template={t} />
                  ))}
                </ul>
              )}
          </section>
        </>
      )}
    </div>
  );
}
