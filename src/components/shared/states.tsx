import * as React from "react";
import { AlertCircle, Inbox } from "lucide-react";
import { Card } from "@/components/ui/card";

/**
 * Prázdný, chybový a načítací stav. Každá stránka musí použít všechny tři —
 * uživatel nikdy nesmí vidět prázdnou bílou obrazovku ani technickou chybu.
 */

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col items-center px-6 py-12 text-center">
      <span className="mb-4 text-muted-foreground">
        {icon ?? <Inbox aria-hidden="true" className="size-12" />}
      </span>
      <h2 className="text-2xl font-bold">{title}</h2>
      <p className="mt-2 max-w-md text-lg text-muted-foreground">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </Card>
  );
}

export function ErrorState({
  title = "Něco se nepovedlo",
  description,
  action,
}: {
  title?: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col items-center px-6 py-12 text-center">
      <AlertCircle aria-hidden="true" className="mb-4 size-12 text-danger" />
      <h2 className="text-2xl font-bold">{title}</h2>
      <p className="mt-2 max-w-md text-lg text-muted-foreground">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </Card>
  );
}

/** Skeleton pro načítání — drží stejnou výšku jako výsledný obsah. */
export function LoadingCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="p-5">
          <div className="h-5 w-28 rounded bg-surface-muted" />
          <div className="mt-3 h-9 w-20 rounded bg-surface-muted" />
        </Card>
      ))}
      <span className="sr-only">Načítám…</span>
    </div>
  );
}
