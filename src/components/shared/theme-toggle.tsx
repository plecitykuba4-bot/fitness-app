"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const theme = useSyncExternalStore(
    (notify) => {
      window.addEventListener("fitness-theme-change", notify);
      return () => window.removeEventListener("fitness-theme-change", notify);
    },
    () => document.documentElement.classList.contains("dark") ? "dark" : "light",
    () => "light",
  );

  const changeTheme = (next: "light" | "dark") => {
    document.documentElement.classList.toggle("dark", next === "dark");
    localStorage.setItem("fitness-theme", next);
    window.dispatchEvent(new Event("fitness-theme-change"));
  };

  return (
    <div className="inline-flex rounded-[var(--radius-button)] border border-border bg-surface-muted p-1" aria-label="Barevný režim">
      <button type="button" onClick={() => changeTheme("light")} aria-pressed={theme === "light"} className={cn("flex min-h-touch items-center gap-2 rounded-lg px-3 text-sm font-bold transition-colors", theme === "light" ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground")}>
        <Sun aria-hidden="true" className="size-4" />
        Světlý
      </button>
      <button type="button" onClick={() => changeTheme("dark")} aria-pressed={theme === "dark"} className={cn("flex min-h-touch items-center gap-2 rounded-lg px-3 text-sm font-bold transition-colors", theme === "dark" ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground")}>
        <Moon aria-hidden="true" className="size-4" />
        Tmavý
      </button>
    </div>
  );
}
