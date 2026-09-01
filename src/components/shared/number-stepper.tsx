"use client";

import { Minus, Plus } from "lucide-react";
import { formatNumber } from "@/lib/format";

/**
 * Zadávání čísla tlačítky, ne klávesnicí.
 *
 * Ve fitku má uživatel zpocené ruce, telefon v jedné ruce a klávesnice
 * překryje půl obrazovky. Proto je hodnota předvyplněná z minulého tréninku
 * a mění se dvěma velkými tlačítky. Přímé psaní zůstává možné jako záloha.
 */
export function NumberStepper({
  label,
  value,
  step,
  min = 0,
  max,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  min?: number;
  max: number;
  unit?: string;
  onChange: (value: number) => void;
}) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const decimals = Number.isInteger(step) ? 0 : 1;

  return (
    <div>
      <p className="mb-2 text-lg font-semibold">{label}</p>
      <div className="flex items-stretch gap-3">
        <button
          type="button"
          aria-label={`${label} — snížit o ${step}`}
          onClick={() => onChange(clamp(round(value - step)))}
          disabled={value <= min}
          className="flex size-touch-lg shrink-0 items-center justify-center rounded-[var(--radius-button)] border-2 border-border bg-surface text-foreground disabled:opacity-40"
        >
          <Minus aria-hidden="true" className="size-7" />
        </button>

        <label className="flex min-w-0 flex-1 items-center justify-center rounded-[var(--radius-button)] border-2 border-border bg-surface px-2">
          <span className="sr-only">{label}</span>
          <input
            type="number"
            inputMode="decimal"
            step={step}
            min={min}
            max={max}
            value={value}
            onChange={(e) => {
              const next = Number(e.target.value);
              if (!Number.isNaN(next)) onChange(clamp(next));
            }}
            className="tabular w-full bg-transparent text-center text-4xl font-bold text-foreground focus:outline-none"
          />
          {unit && (
            <span aria-hidden="true" className="pl-1 text-xl font-semibold text-muted-foreground">
              {unit}
            </span>
          )}
        </label>

        <button
          type="button"
          aria-label={`${label} — zvýšit o ${step}`}
          onClick={() => onChange(clamp(round(value + step)))}
          disabled={value >= max}
          className="flex size-touch-lg shrink-0 items-center justify-center rounded-[var(--radius-button)] border-2 border-border bg-surface text-foreground disabled:opacity-40"
        >
          <Plus aria-hidden="true" className="size-7" />
        </button>
      </div>
      <p className="sr-only">
        Aktuální hodnota: {formatNumber(value, decimals)} {unit ?? ""}
      </p>
    </div>
  );
}

/** Zabraňuje chybám plovoucí čárky typu 82.50000000000001. */
function round(value: number): number {
  return Math.round(value * 100) / 100;
}
