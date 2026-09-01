import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireOwnedExercise } from "@/server/auth/guards";
import { db } from "@/server/db";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EditExerciseForm } from "./form";

export const metadata = { title: "Úprava cviku — Fitness trenér" };

export default async function EditExercisePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Cizí cvik => 404.
  const { exercise } = await requireOwnedExercise(id);

  const usage = await db.exercise.findUnique({
    where: { id: exercise.id },
    select: {
      _count: { select: { templateExercises: true, workoutExercises: true } },
    },
  });

  return (
    <div className="mx-auto w-full max-w-xl">
      <Button asChild variant="ghost" className="mb-4">
        <Link href="/cviky">
          <ArrowLeft aria-hidden="true" />
          Zpět na cviky
        </Link>
      </Button>

      <h1 className="mb-6 text-3xl font-bold tracking-tight">Úprava cviku</h1>

      <Card>
        <CardContent className="pt-5">
          <EditExerciseForm
            exercise={{
              id: exercise.id,
              name: exercise.name,
              category: exercise.category,
              muscleGroup: exercise.muscleGroup,
              equipment: exercise.equipment,
              instructions: exercise.instructions,
              trackingType: exercise.trackingType,
              media: exercise.media.map((item) => ({
                kind: item.kind,
                storageKey: item.storageKey,
              })),
            }}
            usedInTemplates={usage?._count.templateExercises ?? 0}
            usedInWorkouts={usage?._count.workoutExercises ?? 0}
          />
        </CardContent>
      </Card>
    </div>
  );
}
