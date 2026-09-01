import { requireClient } from "@/server/auth/guards";
import { db } from "@/server/db";
import { TrainingPassCard } from "@/components/shared/training-pass-card";

export const metadata = { title: "Moje karta — Fitness trenér" };

export default async function ClientTrainingCardPage() {
  const session = await requireClient();
  const pass = await db.trainingPass.findUnique({ where: { clientId: session.clientId } });
  return <div className="mx-auto w-full max-w-xl"><h1 className="mb-4 text-3xl font-bold tracking-tight">Moje karta</h1><TrainingPassCard name={session.name} total={pass?.totalSessions ?? 0} used={pass?.usedSessions ?? 0} /></div>;
}
