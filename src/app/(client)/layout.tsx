import { Home, Dumbbell, BarChart3, CreditCard, User } from "lucide-react";
import { requireClient } from "@/server/auth/guards";
import { db } from "@/server/db";
import { AppNav } from "@/components/shared/app-nav";
import { AppHeader } from "@/components/shared/app-header";

// Klient má záměrně jen pět položek. Nic dalšího sem nepřidávej —
// každá další volba zvyšuje riziko, že se uživatel ztratí. Žádný pevný
// rozvrh — klient si vybírá trénink volně na Domů.
const NAV = [
  { href: "/dnes", label: "Domů", icon: <Home /> },
  { href: "/trenink", label: "Trénink", icon: <Dumbbell /> },
  { href: "/pokrok", label: "Pokrok", icon: <BarChart3 /> },
  { href: "/karta", label: "Karta", icon: <CreditCard /> },
  { href: "/profil", label: "Profil", icon: <User /> },
];

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const client = await requireClient();

  const unread = await db.notification.count({
    where: { userId: client.id, readAt: null },
  });

  return (
    <div className="min-h-dvh md:pl-64">
      <AppNav items={NAV} />
      <AppHeader
        name={client.name}
        profileHref="/profil"
        unreadCount={unread}
      />
      {/* Odsazení zdola, aby spodní navigace nepřekrývala obsah. */}
      <main className="px-4 py-4 pb-28 md:pb-10">{children}</main>
    </div>
  );
}
