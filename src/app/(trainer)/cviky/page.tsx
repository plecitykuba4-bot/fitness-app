import Link from "next/link";
import { ChevronRight, Dumbbell, Plus, Search } from "lucide-react";
import { requireTrainer } from "@/server/auth/guards";
import { db } from "@/server/db";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/states";
import { EXERCISE_CATEGORIES } from "@/lib/enums";
import { pluralWithCount } from "@/lib/format";

export const metadata = { title: "Cviky — Fitness trenér" };

export default async function ExercisesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; kategorie?: string }>;
}) {
  const { q, kategorie } = await searchParams;
  const trainer = await requireTrainer();

  const exercises = await db.exercise.findMany({
    where: {
      trainerId: trainer.trainerId,
      ...(q ? { name: { contains: q } } : {}),
      ...(kategorie ? { category: kategorie } : {}),
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
    include: { _count: { select: { media: true } } },
  });

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Cviky</h1>
        <Button asChild size="lg">
          <Link href="/cviky/novy">
            <Plus aria-hidden="true" />
            Přidat cvik
          </Link>
        </Button>
      </div>

      {/* Hledání jde přes URL — výsledek se dá poslat odkazem a funguje bez JS. */}
      <form className="mb-4 flex gap-3" role="search">
        <label className="flex-1">
          <span className="sr-only">Hledat cvik podle názvu</span>
          <Input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Hledat cvik…"
          />
        </label>
        {kategorie && <input type="hidden" name="kategorie" value={kategorie} />}
        <Button type="submit" size="lg">
          <Search aria-hidden="true" />
          Hledat
        </Button>
      </form>

      <div className="mb-6 flex flex-wrap gap-2">
        <CategoryLink label="Vše" href={buildHref(q, undefined)} active={!kategorie} />
        {EXERCISE_CATEGORIES.map((cat) => (
          <CategoryLink
            key={cat}
            label={cat}
            href={buildHref(q, cat)}
            active={kategorie === cat}
          />
        ))}
      </div>

      {exercises.length === 0 ? (
        <EmptyState
          icon={<Dumbbell aria-hidden="true" className="size-12" />}
          title="Žádný cvik neodpovídá"
          description={
            q || kategorie
              ? "Zkuste změnit hledaný výraz nebo vybrat jinou kategorii."
              : "Zatím jste nevytvořil žádný cvik."
          }
          action={
            <Button asChild size="lg">
              <Link href="/cviky/novy">
                <Plus aria-hidden="true" />
                Přidat cvik
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <p className="mb-3 text-base text-muted-foreground">
            {pluralWithCount(exercises.length, "cvik", "cviky", "cviků")}
          </p>
          <ul className="flex flex-col gap-3">
            {exercises.map((ex) => (
              <li key={ex.id}>
                <Card className="transition-colors hover:bg-surface-muted">
                  <Link
                    href={`/cviky/${ex.id}`}
                    className="flex min-h-touch-lg items-center gap-3 p-5"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-xl font-bold">{ex.name}</span>
                      <span className="mt-1 block text-base text-muted-foreground">
                        {ex.muscleGroup}
                        {ex.equipment ? ` · ${ex.equipment}` : ""}
                      </span>
                    </span>
                    <Badge>{ex.category}</Badge>
                    <ChevronRight
                      aria-hidden="true"
                      className="size-6 shrink-0 text-muted-foreground"
                    />
                  </Link>
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function buildHref(q?: string, category?: string): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (category) params.set("kategorie", category);
  const qs = params.toString();
  return qs ? `/cviky?${qs}` : "/cviky";
}

function CategoryLink({
  label,
  href,
  active,
}: {
  label: string;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={
        active
          ? "flex min-h-touch items-center rounded-full bg-primary px-4 text-base font-semibold text-primary-foreground"
          : "flex min-h-touch items-center rounded-full border-2 border-border px-4 text-base font-semibold hover:bg-surface-muted"
      }
    >
      {label}
    </Link>
  );
}
