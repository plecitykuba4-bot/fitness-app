import { startOfWeek } from "@/lib/format";
import { trendChange } from "@/services/progress";

/**
 * Generování týdenního reportu.
 *
 * Vrací strukturovaný objekt, ne hotový text. Díky tomu může report vykreslit
 * UI a později ho může tentýž objekt dostat AI vrstva jako podklad pro slovní
 * shrnutí — bez zásahu do výpočtů i UI.
 */

export type ReportWorkout = {
  startedAt: Date;
  durationSec: number | null;
  totalVolumeKg: number | null;
  totalSets: number;
  totalReps: number;
};

export type ExerciseProgress = {
  exerciseName: string;
  /** Nejtěžší série ve sledovaném týdnu. */
  currentBestKg: number;
  /** Nejtěžší série v předchozím týdnu. */
  previousBestKg: number | null;
  changePercent: number;
};

export type WeeklyReport = {
  weekStart: Date;
  weekEnd: Date;
  workoutsCompleted: number;
  totalTimeSec: number;
  totalVolumeKg: number;
  totalSets: number;
  totalReps: number;
  /** Změna objemu oproti předchozímu týdnu. */
  volumeChangePercent: number;
  biggestImprovement: ExerciseProgress | null;
  biggestDecline: ExerciseProgress | null;
  exerciseProgress: ExerciseProgress[];
};

export type ReportInput = {
  weekStart: Date;
  workouts: ReportWorkout[];
  previousWeekWorkouts: ReportWorkout[];
  /** Nejtěžší série jednotlivých cviků v tomto a minulém týdnu. */
  exerciseBests: {
    exerciseName: string;
    currentBestKg: number;
    previousBestKg: number | null;
  }[];
};

export function buildWeeklyReport(input: ReportInput): WeeklyReport {
  const weekStart = startOfWeek(input.weekStart);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const sum = (list: ReportWorkout[], pick: (w: ReportWorkout) => number) =>
    list.reduce((acc, w) => acc + pick(w), 0);

  const totalVolumeKg = round1(sum(input.workouts, (w) => w.totalVolumeKg ?? 0));
  const previousVolume = round1(
    sum(input.previousWeekWorkouts, (w) => w.totalVolumeKg ?? 0),
  );

  const exerciseProgress: ExerciseProgress[] = input.exerciseBests
    .map((e) => ({
      exerciseName: e.exerciseName,
      currentBestKg: e.currentBestKg,
      previousBestKg: e.previousBestKg,
      changePercent:
        e.previousBestKg && e.previousBestKg > 0
          ? round1(((e.currentBestKg - e.previousBestKg) / e.previousBestKg) * 100)
          : 0,
    }))
    // Cviky bez srovnání s minulým týdnem nemají v žebříčku co dělat.
    .filter((e) => e.previousBestKg !== null);

  const sortedByChange = [...exerciseProgress].sort(
    (a, b) => b.changePercent - a.changePercent,
  );

  const improved = sortedByChange.filter((e) => e.changePercent > 0);
  const declined = sortedByChange.filter((e) => e.changePercent < 0);

  return {
    weekStart,
    weekEnd,
    workoutsCompleted: input.workouts.length,
    totalTimeSec: sum(input.workouts, (w) => w.durationSec ?? 0),
    totalVolumeKg,
    totalSets: sum(input.workouts, (w) => w.totalSets),
    totalReps: sum(input.workouts, (w) => w.totalReps),
    volumeChangePercent:
      previousVolume > 0
        ? round1(((totalVolumeKg - previousVolume) / previousVolume) * 100)
        : 0,
    biggestImprovement: improved[0] ?? null,
    biggestDecline: declined[declined.length - 1] ?? null,
    exerciseProgress: sortedByChange,
  };
}

/**
 * Vývoj objemu po týdnech — podklad pro graf „jak se to vyvíjí v čase".
 * Týdny bez tréninku se vrací s nulou, aby v grafu byla vidět mezera.
 */
export function weeklyVolumeSeries(
  workouts: ReportWorkout[],
  weeks: number,
  now = new Date(),
): { weekStart: Date; volumeKg: number; workoutCount: number }[] {
  const byWeek = new Map<number, { volume: number; count: number }>();

  for (const w of workouts) {
    const key = startOfWeek(w.startedAt).getTime();
    const entry = byWeek.get(key) ?? { volume: 0, count: 0 };
    entry.volume += w.totalVolumeKg ?? 0;
    entry.count += 1;
    byWeek.set(key, entry);
  }

  const result: { weekStart: Date; volumeKg: number; workoutCount: number }[] = [];
  const cursor = startOfWeek(now);
  cursor.setDate(cursor.getDate() - (weeks - 1) * 7);

  for (let i = 0; i < weeks; i++) {
    const entry = byWeek.get(cursor.getTime());
    result.push({
      weekStart: new Date(cursor),
      volumeKg: round1(entry?.volume ?? 0),
      workoutCount: entry?.count ?? 0,
    });
    cursor.setDate(cursor.getDate() + 7);
  }

  return result;
}

/** Průměrný pokrok napříč klienty — pro trenérskou analytiku. */
export function averageTrend(seriesPerClient: number[][]): number {
  const changes = seriesPerClient
    .filter((values) => values.length >= 2)
    .map((values) => trendChange(values));

  if (changes.length === 0) return 0;
  return round1(changes.reduce((a, b) => a + b, 0) / changes.length);
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
