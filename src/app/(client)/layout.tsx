import { Home, Dumbbell, BarChart3, CreditCard, User, ShieldCheck } from "lucide-react";
import { requireClient } from "@/server/auth/guards";
import { db } from "@/server/db";
import { AppNav } from "@/components/shared/app-nav";
import { AppHeader } from "@/components/shared/app-header";

// Klient má pět položek. Pouze admin s vlastním klientským profilem dostane
// šestou položku Správa; běžný klient ji nikdy nevidí.
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
      <AppNav
        items={client.role === "ADMIN" ? [...NAV, { href: "/sprava", label: "Správa", icon: <ShieldCheck /> }] : NAV}
      />
      <AppHeader
        name={client.name}
        profileHref="/profil"
        unreadCount={unread}
      />
      {/* Odsazení zdola, aby spodní navigace nepřekrývala obsah. */}
      <main className="px-3 py-3 pb-28 md:px-4 md:py-4 md:pb-10">{children}</main>
    </div>
  );
}
