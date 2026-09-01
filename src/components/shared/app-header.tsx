import Link from "next/link";
import { LogOut, UserCircle } from "lucide-react";
import { logoutAction } from "@/server/auth/actions";
import { NotificationBell } from "@/components/shared/notification-bell";
import { Button } from "@/components/ui/button";

/**
 * Horní lišta — stejná pro trenéra i klienta. Dřív měl každý jinou (klient
 * neměl jméno ani odhlášení přímo v hlavičce), takže rozhraní působilo
 * nejednotně. Jméno vede na vlastní profil, obojí strany mají odhlášení
 * na stejném místě.
 */
export function AppHeader({
  name,
  profileHref,
  unreadCount,
}: {
  name: string;
  profileHref: string;
  unreadCount: number;
}) {
  return (
    <header className="flex items-center justify-between gap-3 border-b border-primary/25 bg-background/90 px-4 py-2 backdrop-blur-xl">
      <Link
        href={profileHref}
        className="flex min-h-touch min-w-0 items-center gap-2 rounded-[var(--radius-button)] px-2 hover:bg-surface-muted"
      >
        <UserCircle aria-hidden="true" className="size-5 shrink-0 text-primary-strong" />
        <span className="truncate text-base font-semibold">{name}</span>
      </Link>

      <div className="flex shrink-0 items-center gap-2">
        <NotificationBell unreadCount={unreadCount} />
        <form action={logoutAction}>
          <Button type="submit" variant="ghost">
            <LogOut aria-hidden="true" />
            <span className="hidden sm:inline">Odhlásit se</span>
            <span className="sm:hidden">Odhlásit</span>
          </Button>
        </form>
      </div>
    </header>
  );
}
