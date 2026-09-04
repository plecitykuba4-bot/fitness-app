import { ShieldCheck, Users } from "lucide-react";
import { requireAdmin } from "@/server/auth/guards";
import { db } from "@/server/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrainerForm } from "./trainer-form";

export const metadata = { title: "Správa aplikace — Fitness trenér" };

export default async function AdminPage() {
  const admin = await requireAdmin();
  const trainers = await db.trainer.findMany({
    include: { user: { select: { name: true, email: true } }, _count: { select: { clients: true } } },
    orderBy: { createdAt: "asc" },
  });
  return (
    <div className="space-y-6">
      <header className="flex items-start gap-3">
        <ShieldCheck aria-hidden="true" className="mt-1 size-8 text-primary-strong" />
        <div><h1 className="text-3xl font-bold tracking-tight">Správa aplikace</h1><p className="text-muted-foreground">Přihlášen jako {admin.name}. Tento prostor není v menu trenérů ani klientů.</p></div>
      </header>
      <Card>
        <CardHeader><CardTitle className="text-xl">Nový trenér</CardTitle><CardDescription>Trenér pak vytváří a spravuje jen své klienty. Dočasné heslo mu předejte bezpečným kanálem.</CardDescription></CardHeader>
        <CardContent><TrainerForm /></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-xl"><Users aria-hidden="true" className="size-5" /> Trenéři ({trainers.length})</CardTitle></CardHeader>
        <CardContent><ul className="divide-y divide-border">{trainers.map((trainer) => <li key={trainer.id} className="flex items-center justify-between gap-4 py-3"><span><strong>{trainer.user.name}</strong><span className="block text-sm text-muted-foreground">{trainer.user.email}</span></span><span className="text-sm text-muted-foreground">{trainer._count.clients} klientů</span></li>)}</ul></CardContent>
      </Card>
    </div>
  );
}
