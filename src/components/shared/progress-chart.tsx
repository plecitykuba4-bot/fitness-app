"use client";

import { useEffect, useRef, useState } from "react";

import {
  Line,
  LineChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDate, formatNumber } from "@/lib/format";

export type ChartPoint = { date: string; value: number };

/**
 * Jeden graf = jedna veličina. Osy jsou popsané česky a písmo je 14px —
 * menší už není na mobilu čitelné.
 */
export function ProgressChart({
  data,
  unit,
  ariaLabel,
}: {
  data: ChartPoint[];
  unit: string;
  ariaLabel: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = () => setWidth(Math.floor(container.getBoundingClientRect().width));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  if (data.length < 2) {
    return (
      <p className="py-8 text-center text-lg text-muted-foreground">
        Zatím není dost dat pro graf. Odcvičte alespoň dva tréninky.
      </p>
    );
  }

  const values = data.map((point) => point.value);
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const range = dataMax - dataMin;
  // Osa nezačíná automaticky od nuly. Rezerva nad i pod daty udrží
  // trend uprostřed grafu a zároveň nezveličuje malé změny.
  const padding = range === 0
    ? Math.max(Math.abs(dataMax) * 0.15, 2)
    : Math.max(range * 0.6, 1);
  const yMin = Math.max(0, Math.floor((dataMin - padding) * 2) / 2);
  const yMax = Math.ceil((dataMax + padding) * 2) / 2;

  return (
    <div ref={containerRef} role="img" aria-label={ariaLabel} className="h-64 w-full">
      {width > 0 && (
        <LineChart width={width} height={256} data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(v: string) => formatDate(v)}
            tick={{ fill: "var(--muted-foreground)", fontSize: 14 }}
            tickLine={false}
            axisLine={false}
            minTickGap={24}
          />
          <YAxis
            domain={[yMin, yMax]}
            tickCount={5}
            tick={{ fill: "var(--muted-foreground)", fontSize: 14 }}
            tickLine={false}
            axisLine={false}
            width={52}
          />
          <Tooltip
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              fontSize: 16,
              color: "var(--foreground)",
            }}
            labelFormatter={(v) => formatDate(String(v))}
            formatter={(value) => [
              `${formatNumber(Number(value), 1)} ${unit}`,
              "",
            ]}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--primary)"
            strokeWidth={3}
            dot={{ r: 4, fill: "var(--primary)" }}
          />
        </LineChart>
      )}
    </div>
  );
}
