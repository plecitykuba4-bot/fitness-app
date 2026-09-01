import {
  LayoutDashboard,
  Users,
  ListChecks,
  BarChart3,
  CreditCard,
} from "lucide-react";
import { requireTrainer } from "@/server/auth/guards";
import { db } from "@/server/db";
import { AppNav } from "@/components/shared/app-nav";
import { AppHeader } from "@/components/shared/app-header";

// Knihovna cviků zůstává dostupná při úpravě plánu; samostatná položka by
// na mobilu zbytečně rozdělovala trenérův hlavní pracovní tok.
const NAV = [
  { href: "/prehled", label: "Přehled", icon: <LayoutDashboard /> },
  { href: "/klienti", label: "Klienti", icon: <Users /> },
  { href: "/treninky", label: "Tréninky", icon: <ListChecks /> },
  { href: "/analytika", label: "Analytika", icon: <BarChart3 /> },
  { href: "/karty", label: "Karta", icon: <CreditCard /> },
];

export default async function TrainerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const trainer = await requireTrainer();

  const unread = await db.notification.count({
    where: { userId: trainer.id, readAt: null },
  });

  return (
    <div className="min-h-dvh md:pl-64">
      <AppNav items={NAV} />
      <AppHeader
        name={trainer.name}
        profileHref="/nastaveni"
        unreadCount={unread}
      />
      {/* Odsazení zdola, aby spodní navigace nepřekrývala obsah. */}
      <main className="px-4 py-4 pb-28 md:pb-10">{children}</main>
    </div>
  );
}
