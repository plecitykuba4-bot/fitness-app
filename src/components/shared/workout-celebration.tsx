"use client";

import { useEffect, useState } from "react";
import { Check, Trophy } from "lucide-react";

const COLORS = ["#aef000", "#5f8500", "#ffffff", "#d9ff75"];

export function WorkoutCelebration({ workoutName }: { workoutName: string }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if ("vibrate" in navigator) navigator.vibrate([80, 45, 120]);
    const timeout = window.setTimeout(() => setVisible(false), 2800);
    return () => window.clearTimeout(timeout);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[100] overflow-hidden motion-reduce:hidden"
      aria-hidden="true"
    >
      <div className="absolute inset-0 animate-[celebration-flash_700ms_ease-out_forwards] bg-primary/20" />

      {Array.from({ length: 28 }, (_, index) => (
        <span
          key={index}
          className="absolute -top-6 h-4 w-2 animate-[celebration-confetti_1800ms_cubic-bezier(.2,.8,.3,1)_forwards] rounded-sm"
          style={{
            left: `${3 + ((index * 37) % 94)}%`,
            backgroundColor: COLORS[index % COLORS.length],
            animationDelay: `${(index % 7) * 55}ms`,
            transform: `rotate(${index * 29}deg)`,
          }}
        />
      ))}

      <div className="absolute inset-x-5 top-[28%] mx-auto flex max-w-sm animate-[celebration-pop_2200ms_ease-out_forwards] flex-col items-center rounded-3xl border-2 border-primary bg-surface/95 px-6 py-7 text-center text-foreground shadow-[0_24px_80px_rgb(95_133_0_/_0.35)] backdrop-blur-xl">
        <span className="flex size-20 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_0_0_12px_rgb(174_240_0_/_0.18)]">
          <Check className="size-12 stroke-[3]" />
        </span>
        <p className="mt-5 flex items-center gap-2 text-sm font-extrabold uppercase tracking-[0.14em] text-primary-strong">
          <Trophy className="size-5" />
          Skvělá práce
        </p>
        <p className="mt-1 text-3xl font-black">Trénink dokončen!</p>
        <p className="mt-2 text-base font-semibold text-muted-foreground">
          {workoutName} máš úspěšně za sebou.
        </p>
      </div>
    </div>
  );
}
