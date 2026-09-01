"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Dumbbell, Trash2 } from "lucide-react";
import { deleteTemplateAction } from "@/server/actions/template";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { pluralWithCount } from "@/lib/format";

export type TemplateWithCounts = {
  id: string;
  name: string;
  estimatedMin: number | null;
  _count: { exercises: number };
};

/**
 * Jeden trénink v přehledu — klepnutím na řádek se otevře editor,
 * koš vedle něj trénink rovnou smaže.
 */
export function TemplateRow({ template }: { template: TemplateWithCounts }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const remove = () => {
    if (!confirm(`Opravdu smazat trénink ${template.name}?`)) return;
    startTransition(async () => {
      const result = await deleteTemplateAction(template.id);
      if (result.ok) router.refresh();
      else alert(result.error);
    });
  };

  return (
    <li>
      <Card className="group relative flex items-center gap-2 overflow-hidden transition-colors before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-primary hover:border-primary/45 hover:bg-primary/[0.06]">
        <Link
          href={`/treninky/${template.id}`}
          className="flex min-h-touch-lg min-w-0 flex-1 items-center gap-4 p-5"
        >
          <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary-strong transition-transform group-hover:scale-105">
            <Dumbbell className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xl font-bold">{template.name}</span>
            <span className="mt-1 block text-base text-muted-foreground">
              {pluralWithCount(
                template._count.exercises,
                "cvik",
                "cviky",
                "cviků",
              )}
              {template.estimatedMin ? ` · ${template.estimatedMin} min` : ""}
            </span>
          </span>
          <ChevronRight
            aria-hidden="true"
            className="size-6 shrink-0 text-primary-strong"
          />
        </Link>

        <Button
          type="button"
          variant="ghost"
          className="mr-3 shrink-0"
          disabled={pending}
          onClick={remove}
          aria-label={`Smazat trénink ${template.name}`}
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </Card>
    </li>
  );
}
