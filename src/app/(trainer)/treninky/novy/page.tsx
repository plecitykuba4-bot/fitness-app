import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireTrainer } from "@/server/auth/guards";
import { db } from "@/server/db";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NewTemplateForm } from "./form";

export const metadata = { title: "Nový trénink — Fitness trenér" };

export default async function NewTemplatePage({
  searchParams,
}: {
  searchParams: Promise<{ klient?: string; navrat?: string; knihovna?: string }>;
}) {
  const { klient, navrat, knihovna } = await searchParams;
  const trainer = await requireTrainer();

  const [clients, libraryTemplates] = await Promise.all([
    db.client.findMany({
      where: { trainerId: trainer.trainerId, status: "ACTIVE" },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    db.workoutTemplate.findMany({
      where: { trainerId: trainer.trainerId, clientId: null },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        estimatedMin: true,
        _count: { select: { exercises: true } },
      },
    }),
  ]);

  // Předvolba z odkazu „Vytvořit" u konkrétního klienta.
  const preselected =
    knihovna === "1"
      ? "__library__"
      : clients.some((c) => c.id === klient)
        ? klient
        : undefined;

  // Když sem trenér přišel z rozpracovaného plánu (plán ještě neměl žádný
  // trénink na výběr), po dokončení cviků ho vrátíme zpátky tam, ne na
  // obecný seznam tréninků.
  const backHref = navrat && navrat.startsWith("/") ? navrat : "/treninky";

  return (
    <div className="mx-auto w-full max-w-xl">
      <Button asChild variant="ghost" className="mb-4">
        <Link href={backHref}>
          <ArrowLeft aria-hidden="true" />
          Zpět
        </Link>
      </Button>

      <h1 className="mb-2 text-3xl font-bold tracking-tight">
        {knihovna === "1" ? "Nová předloha" : "Nový trénink"}
      </h1>
      <p className="mb-6 text-lg text-muted-foreground">
        {knihovna === "1"
          ? "Vytvořte nový plán do knihovny. Cviky přidáte v dalším kroku."
          : "Vyberte klienta a trénink pojmenujte. Cviky přidáte v dalším kroku."}
      </p>

      <Card>
        <CardContent className="pt-5">
          <NewTemplateForm
            clients={clients.map((c) => ({ id: c.id, name: c.user.name }))}
            libraryTemplates={libraryTemplates.map((template) => ({
              id: template.id,
              name: template.name,
              exerciseCount: template._count.exercises,
              estimatedMin: template.estimatedMin,
            }))}
            preselectedClientId={preselected}
            navrat={navrat}
          />
        </CardContent>
      </Card>
    </div>
  );
}
