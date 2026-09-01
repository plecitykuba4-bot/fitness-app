import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireTrainer } from "@/server/auth/guards";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NewClientForm } from "./form";

export const metadata = { title: "Nový klient — Fitness trenér" };

export default async function NewClientPage() {
  await requireTrainer();

  return (
    <div className="mx-auto w-full max-w-xl">
      <Button asChild variant="ghost" className="mb-4">
        <Link href="/klienti">
          <ArrowLeft aria-hidden="true" />
          Zpět na klienty
        </Link>
      </Button>

      <h1 className="mb-6 text-3xl font-bold tracking-tight">Nový klient</h1>

      <Card>
        <CardContent className="pt-5">
          <NewClientForm />
        </CardContent>
      </Card>
    </div>
  );
}
