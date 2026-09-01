import * as React from "react";
import { cn } from "@/lib/utils";

/** Kompaktní výška 48px zachovává pohodlné zadávání i na mobilu. */
export function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "min-h-touch w-full rounded-[var(--radius-button)] border-2 border-border bg-surface px-4 text-base text-foreground",
        "placeholder:text-muted-foreground",
        "focus:border-primary focus:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
