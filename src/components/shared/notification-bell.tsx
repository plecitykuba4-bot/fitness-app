import Link from "next/link";
import { Bell } from "lucide-react";
import { formatNumber } from "@/lib/format";

/** Zvonek s počtem nepřečtených. Vždy má textový popisek pro čtečky. */
export function NotificationBell({ unreadCount }: { unreadCount: number }) {
  const label =
    unreadCount > 0
      ? `Oznámení — ${formatNumber(unreadCount)} nepřečtených`
      : "Oznámení — žádná nová";

  return (
    <Link
      href="/oznameni"
      aria-label={label}
      className="relative flex min-h-touch min-w-touch items-center justify-center rounded-[var(--radius-button)] hover:bg-surface-muted"
    >
      <Bell aria-hidden="true" className="size-6" />
      {unreadCount > 0 && (
        <span
          aria-hidden="true"
          className="tabular absolute right-1 top-1 flex min-w-6 items-center justify-center rounded-full bg-danger px-1.5 text-sm font-bold text-danger-foreground"
        >
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
