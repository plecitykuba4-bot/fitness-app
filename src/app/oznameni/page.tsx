import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/server/auth/guards";
import { NotificationList } from "@/components/shared/notification-list";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Oznámení — Fitness trenér" };

export default async function NotificationsPage() {
  // Stránku sdílí obě role, proto stojí mimo route groups.
  // Odkaz zpět proto míří podle role přihlášeného uživatele.
  const user = await requireUser();
  const backHref = user.role === "TRAINER" ? "/prehled" : "/dnes";

  return (
    <main className="px-5 py-6">
      <div className="mx-auto w-full max-w-xl">
        <Button asChild variant="ghost" className="mb-4">
          <Link href={backHref}>
            <ArrowLeft aria-hidden="true" />
            Zpět
          </Link>
        </Button>
      </div>
      <NotificationList />
    </main>
  );
}
