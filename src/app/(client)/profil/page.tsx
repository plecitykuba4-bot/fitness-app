import { requireClient } from "@/server/auth/guards";
import { logoutAction } from "@/server/auth/actions";
import { db } from "@/server/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Můj profil — Fitness trenér" };

export default async function ProfilePage() {
  const session = await requireClient();

  const client = await db.client.findUnique({
    where: { id: session.clientId },
    include: { trainer: { include: { user: { select: { name: true } } } } },
  });

  const rows = [
    { label: "Jméno", value: session.name },
    { label: "E-mail", value: session.email },
    { label: "Trenér", value: client?.trainer.user.name ?? "—" },
    { label: "Trénuje od", value: client ? formatDate(client.startedAt) : "—" },
  ];

  return (
    <div className="mx-auto w-full max-w-xl">
      <h1 className="mb-6 text-3xl font-bold tracking-tight">Můj profil</h1>

      <Card>
        <CardHeader>
          <CardTitle>Vaše údaje</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="divide-y divide-border">
            {rows.map((row) => (
              <div
                key={row.label}
                className="flex flex-wrap items-center justify-between gap-2 py-3"
              >
                <dt className="text-lg text-muted-foreground">{row.label}</dt>
                <dd className="text-lg font-semibold">{row.value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <form action={logoutAction} className="mt-6">
        <Button type="submit" variant="secondary" size="lg" block>
          <LogOut aria-hidden="true" />
          Odhlásit se
        </Button>
      </form>
    </div>
  );
}
