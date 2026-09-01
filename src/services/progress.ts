import { startOfDay, startOfWeek } from "@/lib/format";

/**
 * Čisté výpočetní funkce nad odcvičenými daty.
 * Záměrně neobsahují přístup k databázi — jsou plně testovatelné
 * a později je může použít i AI vrstva pro generování reportů.
 */

export type SetLike = { weightKg: number; reps: number };

export type WorkoutLike = {
  startedAt: Date;
  durationSec: number | null;
  totalVolumeKg: number | null;
  totalSets: number;
  totalReps: number;
};

/** Objem jedné série = váha × opakování. */
export function setVolume(set: SetLike): number {
  return set.weightKg * set.reps;
}

/** Celkový zvednutý objem v kg. */
export function totalVolume(sets: SetLike[]): number {
  return round1(sets.reduce((sum, s) => sum + setVolume(s), 0));
}

/**
 * Procentuální změna mezi první a poslední hodnotou.
 * Vrací 0, pokud není dost dat nebo je výchozí hodnota nulová
 * (dělení nulou by dalo Infinity a rozbilo graf).
 */
export function percentChange(values: number[]): number {
  if (values.length < 2) return 0;
  const first = values[0];
  const last = values[values.length - 1];
  if (first === 0) return 0;
  return round1(((last - first) / first) * 100);
}

/**
 * Trend mezi začátkem a koncem řady, odolný vůči výkyvům.
 *
 * `percentChange` porovnává jediný první a jediný poslední bod, takže jeden
 * odlehlý trénink (nemoc, zkrácený trénink, jen rozcvička) posune výsledek
 * o desítky procent. Klientovi pak svítí „−28 %", i když se ve skutečnosti
 * zlepšuje.
 *
 * Bereme proto medián až tří bodů na každém konci. Medián, ne průměr —
 * do průměru se odlehlá hodnota stále promítne (u řady končící 1200, 1250, 200
 * dá průměr −16 %, zatímco medián správně +14 %).
 */
export function trendChange(values: number[], window = 3): number {
  if (values.length < 2) return 0;

  // U krátkých řad zmenšíme okno, aby se konce nepřekrývaly.
  const size = Math.max(1, Math.min(window, Math.floor(values.length / 2)));

  const first = median(values.slice(0, size));
  const last = median(values.slice(-size));

  if (first === 0) return 0;
  return round1(((last - first) / first) * 100);
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * Nejdelší aktuální série po sobě jdoucích tréninkových týdnů.
 * Počítá se v týdnech, ne dnech — nikdo netrénuje sedm dní v týdnu
 * a denní streak by u běžného klienta byl vždy 1.
 */
export function weeklyStreak(workouts: WorkoutLike[], now = new Date()): number {
  if (workouts.length === 0) return 0;

  const weeks = new Set(
    workouts.map((w) => startOfWeek(w.startedAt).getTime()),
  );

  let streak = 0;
  const cursor = startOfWeek(now);

  // Pokud tento týden ještě neproběhl trénink, streak se počítá od minulého —
  // jinak by v pondělí ráno spadl na nulu každému.
  if (!weeks.has(cursor.getTime())) {
    cursor.setDate(cursor.getDate() - 7);
  }

  while (weeks.has(cursor.getTime())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 7);
  }

  return streak;
}

/** Počet různých dní, kdy klient trénoval. */
export function activeDays(workouts: WorkoutLike[]): number {
  return new Set(workouts.map((w) => startOfDay(w.startedAt).getTime())).size;
}

export type ClientSummary = {
  workoutCount: number;
  totalTimeSec: number;
  totalSets: number;
  totalReps: number;
  totalVolumeKg: number;
  activeDays: number;
  streakWeeks: number;
  averageDurationSec: number;
};

export function summarizeClient(
  workouts: WorkoutLike[],
  now = new Date(),
): ClientSummary {
  const totalTimeSec = workouts.reduce((s, w) => s + (w.durationSec ?? 0), 0);
  const withDuration = workouts.filter((w) => w.durationSec != null).length;

  return {
    workoutCount: workouts.length,
    totalTimeSec,
    totalSets: workouts.reduce((s, w) => s + w.totalSets, 0),
    totalReps: workouts.reduce((s, w) => s + w.totalReps, 0),
    totalVolumeKg: round1(
      workouts.reduce((s, w) => s + (w.totalVolumeKg ?? 0), 0),
    ),
    activeDays: activeDays(workouts),
    streakWeeks: weeklyStreak(workouts, now),
    averageDurationSec:
      withDuration === 0 ? 0 : Math.round(totalTimeSec / withDuration),
  };
}

/**
 * Vývoj nejtěžší série cviku po týdnech — podklad pro graf progresu.
 * Vrací body seřazené od nejstaršího.
 */
export function weeklyBestSeries(
  entries: { date: Date; weightKg: number }[],
): { weekStart: Date; weightKg: number }[] {
  const byWeek = new Map<number, number>();

  for (const entry of entries) {
    const key = startOfWeek(entry.date).getTime();
    const current = byWeek.get(key);
    if (current === undefined || entry.weightKg > current) {
      byWeek.set(key, entry.weightKg);
    }
  }

  return [...byWeek.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([time, weightKg]) => ({ weekStart: new Date(time), weightKg }));
}

/** Míra dokončení plánu v procentech (0–100). */
export function completionRate(completed: number, planned: number): number {
  if (planned <= 0) return 0;
  return Math.min(100, round1((completed / planned) * 100));
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
