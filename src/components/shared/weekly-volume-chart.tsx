"use client";

import { useEffect, useRef, useState } from "react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDate, formatNumber, pluralWithCount } from "@/lib/format";

export type WeekPoint = {
  weekStart: string;
  volumeKg: number;
  workoutCount: number;
};

/**
 * Objem po týdnech. Sloupcový graf, protože týden je diskrétní jednotka —
 * spojnice by naznačovala plynulý vývoj mezi týdny, který neexistuje.
 * Týdny bez tréninku jsou vidět jako mezera, ne jako pokles k nule.
 */
export function WeeklyVolumeChart({ data }: { data: WeekPoint[] }) {
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

  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-lg text-muted-foreground">
        Zatím není co zobrazit.
      </p>
    );
  }

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label="Sloupcový graf objemu po týdnech za posledních 12 týdnů"
      className="h-72 w-full"
    >
      {width > 0 && (
        <BarChart width={width} height={288} data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="weekStart"
            tickFormatter={(v: string) => shortWeek(v)}
            tick={{ fill: "var(--muted-foreground)", fontSize: 14 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={12}
          />
          <YAxis
            tick={{ fill: "var(--muted-foreground)", fontSize: 14 }}
            tickLine={false}
            axisLine={false}
            width={58}
          />
          <Tooltip
            cursor={{ fill: "var(--surface-muted)" }}
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              fontSize: 16,
              color: "var(--foreground)",
            }}
            labelFormatter={(v) => `Týden od ${formatDate(String(v))}`}
            formatter={(value, _name, item) => {
              const point = item.payload as WeekPoint;
              if (point.workoutCount === 0) return ["Netrénoval", ""];
              return [
                `${formatNumber(Number(value))} kg · ${pluralWithCount(
                  point.workoutCount,
                  "trénink",
                  "tréninky",
                  "tréninků",
                )}`,
                "",
              ];
            }}
          />
          <Bar dataKey="volumeKg" radius={[6, 6, 0, 0]}>
            {data.map((point) => (
              <Cell
                key={point.weekStart}
                // Týden bez tréninku dostane výraznou barvu, aby výpadek
                // nebylo možné přehlédnout.
                fill={
                  point.workoutCount === 0 ? "var(--border)" : "var(--primary)"
                }
              />
            ))}
          </Bar>
        </BarChart>
      )}
    </div>
  );
}

function shortWeek(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()}. ${d.getMonth() + 1}.`;
}
