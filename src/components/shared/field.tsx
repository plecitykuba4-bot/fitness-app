import * as React from "react";
import { Label } from "@/components/ui/label";

/** Popisek + pole + chybová hláška. Chyba je vždy česká a u pole, kterého se týká. */
export function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && !error && (
        <p className="mt-2 text-base text-muted-foreground">{hint}</p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-2 text-base font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
