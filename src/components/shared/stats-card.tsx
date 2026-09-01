import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

/**
 * Jedna metrika = jedno velké číslo a jeden krátký popisek.
 * Velká čísla jsou v kompaktním rozhraní 32px.
 */
export function StatsCard({
  label,
  value,
  hint,
  tone = "default",
  icon,
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "success" | "danger";
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("relative overflow-hidden p-4 before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-primary", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-base font-medium text-muted-foreground">{label}</p>
        {icon && <span className="flex size-10 items-center justify-center rounded-full bg-primary/15 text-primary-strong">{icon}</span>}
      </div>
      <p
        className={cn(
          "tabular mt-2 text-4xl font-bold tracking-tight",
          tone === "success" && "text-success",
          tone === "danger" && "text-danger",
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-base text-muted-foreground">{hint}</p>}
    </Card>
  );
}
