import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireTrainer } from "@/server/auth/guards";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NewExerciseForm } from "./form";

export const metadata = { title: "Nový cvik — Fitness trenér" };

export default async function NewExercisePage({
  searchParams,
}: {
  searchParams: Promise<{ navrat?: string }>;
}) {
  await requireTrainer();
  const { navrat } = await searchParams;
  const backHref =
    navrat && navrat.startsWith("/treninky/") ? navrat : "/cviky";

  return (
    <div className="mx-auto w-full max-w-xl">
      <Button asChild variant="ghost" className="mb-4">
        <Link href={backHref}>
          <ArrowLeft aria-hidden="true" />
          Zpět na cviky
        </Link>
      </Button>

      <h1 className="mb-6 text-3xl font-bold tracking-tight">Nový cvik</h1>

      <Card>
        <CardContent className="pt-5">
          <NewExerciseForm navrat={backHref} />
        </CardContent>
      </Card>
    </div>
  );
}
