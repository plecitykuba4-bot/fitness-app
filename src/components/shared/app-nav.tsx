"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

/**
 * Spodní navigace na mobilu, boční na desktopu.
 * Každá položka má ikonu I text — samotná ikona je pro část uživatelů
 * nečitelná. Dotykový cíl nikdy pod 56px.
 */
export function AppNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav
      aria-label="Hlavní navigace"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-primary/25 bg-background/95 backdrop-blur-xl",
        "pb-[env(safe-area-inset-bottom)]",
        // `top` počítá z --app-top-offset, aby navigaci neuřízl pruh nad aplikací.
        "md:top-[var(--app-top-offset)] md:right-auto md:bottom-0 md:left-0 md:w-64 md:border-t-0 md:border-r md:pb-0 md:pt-6",
      )}
    >
      {/* Při více položkách se lišta na úzkém displeji vodorovně posouvá,
          místo aby se položky zmáčkly pod čitelnou velikost. */}
      <ul className="flex overflow-x-auto md:flex-col md:gap-1 md:overflow-visible md:px-3">
        {items.map((item) => {
          const active = isActive(item.href);
          return (
            <li key={item.href} className="min-w-[4.5rem] flex-1 md:min-w-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-touch flex-col items-center justify-center gap-0.5 px-2 py-1 text-center text-xs font-semibold",
                  "relative md:flex-row md:justify-start md:gap-3 md:rounded-[var(--radius-button)] md:px-4 md:text-base",
                  active
                    ? "text-primary-strong after:absolute after:inset-x-3 after:top-0 after:h-0.5 after:rounded-full after:bg-primary md:bg-primary/15 md:after:inset-y-2 md:after:right-auto md:after:left-0 md:after:h-auto md:after:w-0.5"
                    : "text-muted-foreground hover:text-foreground md:hover:bg-surface-muted",
                )}
              >
                <span aria-hidden="true" className="[&_svg]:size-5">
                  {item.icon}
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
