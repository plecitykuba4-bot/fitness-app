import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth/guards";
import { markAllNotificationsReadAction } from "@/server/actions/notification";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/states";
import { formatDateTime, formatRelativeDay } from "@/lib/format";

/**
 * Sdílený seznam oznámení pro trenéra i klienta.
 * Dotaz je vždy omezený na přihlášeného uživatele.
 */
export async function NotificationList() {
  const user = await requireUser();

  const notifications = await db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const unread = notifications.filter((n) => n.readAt === null).length;

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Oznámení</h1>
        {unread > 0 && (
          <form action={markAllNotificationsReadAction}>
            <Button type="submit" variant="secondary" size="lg">
              <CheckCheck aria-hidden="true" />
              Označit vše jako přečtené
            </Button>
          </form>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          icon={<Bell aria-hidden="true" className="size-12" />}
          title="Žádná oznámení"
          description="Až se něco stane, dáme vám tu vědět."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {notifications.map((n) => {
            const isUnread = n.readAt === null;
            const body = (
              <>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xl font-bold">{n.title}</p>
                  {isUnread && (
                    <span
                      aria-label="Nepřečteno"
                      className="mt-2 size-3 shrink-0 rounded-full bg-primary"
                    />
                  )}
                </div>
                <p className="mt-1 text-lg">{n.body}</p>
                <p className="mt-2 text-base text-muted-foreground">
                  <span className="sr-only">{formatDateTime(n.createdAt)}</span>
                  <span aria-hidden="true">
                    {formatRelativeDay(n.createdAt)}
                  </span>
                </p>
              </>
            );

            return (
              <li key={n.id}>
                <Card
                  className={
                    isUnread ? "border-2 border-primary p-5" : "p-5 opacity-80"
                  }
                >
                  {n.linkHref ? (
                    <Link href={n.linkHref} className="block">
                      {body}
                    </Link>
                  ) : (
                    body
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
