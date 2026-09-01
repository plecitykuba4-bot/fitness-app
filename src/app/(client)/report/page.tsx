import { requireClient } from "@/server/auth/guards";
import { WeeklyReportView } from "@/components/shared/weekly-report";

export const metadata = { title: "Týdenní report — Fitness trenér" };

export default async function ClientReportPage() {
  const client = await requireClient();

  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="mb-6 text-3xl font-bold tracking-tight">Týdenní report</h1>
      <WeeklyReportView clientId={client.clientId} clientName={client.name} />
    </div>
  );
}
