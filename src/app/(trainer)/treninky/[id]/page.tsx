import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { requireOwnedTemplate } from "@/server/auth/guards";
import { db } from "@/server/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TemplateExerciseList } from "./exercise-list";
import { AddExerciseForm } from "./add-exercise-form";
import { CopyTemplateForm } from "./copy-form";
import { pluralWithCount } from "@/lib/format";

export const metadata = { title: "Úprava tréninku — Fitness trenér" };

export default async function TemplateDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ navrat?: string; edit?: string }>;
}) {
  const { id } = await params;
  const { navrat, edit } = await searchParams;
  const { trainer, template } = await requireOwnedTemplate(id);

  const backHref = navrat && navrat.startsWith("/") ? navrat : "/treninky";

  // Nabídka cviků je omezená na cviky tohoto trenéra.
  const exercises = await db.exercise.findMany({
    where: { trainerId: trainer.trainerId },
    orderBy: [{ category: "asc" }, { name: "asc" }],
    select: { id: true, name: true, category: true, trackingType: true },
  });

  const [owner, clients] = await Promise.all([
    template.clientId
      ? db.client.findUnique({
          where: { id: template.clientId },
          include: { user: { select: { name: true } } },
        })
      : null,
    db.client.findMany({
      where: { trainerId: trainer.trainerId, status: "ACTIVE" },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Button asChild variant="ghost" className="mb-4">
        <Link href={backHref}>
          <ArrowLeft aria-hidden="true" />
          Zpět
        </Link>
      </Button>

      <h1 className="text-3xl font-bold tracking-tight">{template.name}</h1>
      <p className="mt-1 text-xl font-semibold">
        {owner
          ? owner.user.name
          : "Předloha v knihovně — nepatří žádnému klientovi"}
      </p>
      <p className="mt-1 mb-6 text-lg text-muted-foreground">
        {pluralWithCount(template.exercises.length, "cvik", "cviky", "cviků")}
        {template.estimatedMin ? ` · ${template.estimatedMin} min` : ""}
      </p>

      <Card id="cviky">
        <CardHeader>
          <CardTitle>
            Cviky v tréninku ({template.exercises.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TemplateExerciseList
            items={template.exercises.map((item) => ({
              id: item.id,
              exerciseId: item.exerciseId,
              name: item.exercise.name,
              imageUrl: item.exercise.media.find((media) => media.kind === "IMAGE")?.storageKey,
              videoUrl: item.exercise.media.find((media) => media.kind === "VIDEO")?.storageKey,
              restSeconds: item.restSeconds,
              note: item.note,
              sets: item.sets.map((set) => ({
                setNumber: set.setNumber,
                reps: set.reps,
                targetWeight: set.targetWeight,
              })),
              trackingType: item.exercise.trackingType,
            }))}
            autoEditId={edit}
          />
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Přidat cvik</CardTitle>
        </CardHeader>
        <CardContent>
          {exercises.length === 0 ? (
            <p className="text-lg text-muted-foreground">
              Nemáte žádné cviky.{" "}
              <Link
                href={`/cviky/novy?navrat=${encodeURIComponent(`/treninky/${template.id}`)}`}
                className="font-semibold text-primary-strong underline"
              >
                Vytvořte první cvik
              </Link>
              .
            </p>
          ) : (
            <AddExerciseForm templateId={template.id} exercises={exercises} />
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Zkopírovat jinému klientovi</CardTitle>
        </CardHeader>
        <CardContent>
          <CopyTemplateForm
            templateId={template.id}
            currentClientId={template.clientId}
            clients={clients.map((c) => ({ id: c.id, name: c.user.name }))}
          />
        </CardContent>
      </Card>

      {/* Změny se ukládají hned po každé akci výše — toto tlačítko jen
          potvrzuje, že je trénink hotový, a vrátí trenéra zpět na přehled. */}
      <Button asChild size="xl" className="mt-8">
        <Link href={backHref}>
          <Check aria-hidden="true" />
          Hotovo
        </Link>
      </Button>
    </div>
  );
}
