import { TrendingDown, TrendingUp } from "lucide-react";
import { getWeeklyReport, getWeeklyVolumeSeries } from "@/server/queries/report";
import { StatsCard } from "@/components/shared/stats-card";
import { WeeklyVolumeChart } from "@/components/shared/weekly-volume-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatDate,
  formatDurationHuman,
  formatNumber,
  formatPercentChange,
  formatWeight,
} from "@/lib/format";

/**
 * Týdenní report. Stejná komponenta slouží klientovi i trenérovi —
 * liší se jen tím, čí `clientId` dostane z autorizační vrstvy.
 */
export async function WeeklyReportView({
  clientId,
  clientName,
}: {
  clientId: string;
  clientName: string;
}) {
  const [report, series] = await Promise.all([
    getWeeklyReport(clientId),
    getWeeklyVolumeSeries(clientId, 12),
  ]);

  return (
    <div>
      <Card className="p-6">
        <p className="text-lg font-semibold text-muted-foreground">
          TÝDENNÍ REPORT
        </p>
        <p className="mt-1 text-3xl font-bold tracking-tight">{clientName}</p>
        <p className="mt-1 text-lg text-muted-foreground">
          {formatDate(report.weekStart)} – {formatDate(report.weekEnd)}
        </p>
      </Card>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatsCard
          label="Tréninky"
          value={formatNumber(report.workoutsCompleted)}
        />
        <StatsCard
          label="Celkový čas"
          value={formatDurationHuman(report.totalTimeSec)}
        />
        <StatsCard
          label="Celková zvednutá váha"
          value={formatWeight(report.totalVolumeKg)}
        />
        <StatsCard
          label="Změna objemu"
          value={formatPercentChange(report.volumeChangePercent)}
          hint="oproti minulému týdnu"
          tone={report.volumeChangePercent >= 0 ? "success" : "danger"}
        />
        <StatsCard label="Série" value={formatNumber(report.totalSets)} />
        <StatsCard label="Opakování" value={formatNumber(report.totalReps)} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Největší zlepšení</CardTitle>
          </CardHeader>
          <CardContent>
            {report.biggestImprovement ? (
              <div className="flex items-center gap-4">
                <TrendingUp aria-hidden="true" className="size-10 shrink-0 text-success" />
                <div className="min-w-0">
                  <p className="text-xl font-bold">
                    {report.biggestImprovement.exerciseName}
                  </p>
                  <p className="tabular text-2xl font-bold text-success">
                    {formatPercentChange(report.biggestImprovement.changePercent)}
                  </p>
                  <p className="mt-1 text-base text-muted-foreground">
                    {formatWeight(report.biggestImprovement.previousBestKg ?? 0)}
                    {" → "}
                    {formatWeight(report.biggestImprovement.currentBestKg)}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-lg text-muted-foreground">
                Tento týden zatím není co porovnat s minulým.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Největší pokles</CardTitle>
          </CardHeader>
          <CardContent>
            {report.biggestDecline ? (
              <div className="flex items-center gap-4">
                <TrendingDown aria-hidden="true" className="size-10 shrink-0 text-danger" />
                <div className="min-w-0">
                  <p className="text-xl font-bold">
                    {report.biggestDecline.exerciseName}
                  </p>
                  <p className="tabular text-2xl font-bold text-danger">
                    {formatPercentChange(report.biggestDecline.changePercent)}
                  </p>
                  <p className="mt-1 text-base text-muted-foreground">
                    {formatWeight(report.biggestDecline.previousBestKg ?? 0)}
                    {" → "}
                    {formatWeight(report.biggestDecline.currentBestKg)}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-lg text-muted-foreground">
                Žádný cvik tento týden neklesl. Dobrá práce.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Vývoj po týdnech</CardTitle>
          <p className="mt-1 text-lg text-muted-foreground">
            Posledních 12 týdnů. Prázdný sloupec znamená týden bez tréninku.
          </p>
        </CardHeader>
        <CardContent>
          <WeeklyVolumeChart
            data={series.map((s) => ({
              weekStart: s.weekStart.toISOString(),
              volumeKg: s.volumeKg,
              workoutCount: s.workoutCount,
            }))}
          />
        </CardContent>
      </Card>

      {report.exerciseProgress.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Pokrok u jednotlivých cviků</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {report.exerciseProgress.map((e) => (
                <li
                  key={e.exerciseName}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <span className="min-w-0">
                    <span className="block text-lg font-semibold">
                      {e.exerciseName}
                    </span>
                    <span className="block text-base text-muted-foreground">
                      {formatWeight(e.previousBestKg ?? 0)} →{" "}
                      {formatWeight(e.currentBestKg)}
                    </span>
                  </span>
                  <span
                    className={
                      e.changePercent > 0
                        ? "tabular shrink-0 text-xl font-bold text-success"
                        : e.changePercent < 0
                          ? "tabular shrink-0 text-xl font-bold text-danger"
                          : "tabular shrink-0 text-xl font-bold text-muted-foreground"
                    }
                  >
                    {formatPercentChange(e.changePercent)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
