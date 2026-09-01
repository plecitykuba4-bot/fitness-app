import { describe, expect, it } from "vitest";
import {
  averageTrend,
  buildWeeklyReport,
  weeklyVolumeSeries,
  type ReportWorkout,
} from "@/services/reports";

const w = (
  startedAt: Date,
  overrides: Partial<ReportWorkout> = {},
): ReportWorkout => ({
  startedAt,
  durationSec: 2700,
  totalVolumeKg: 5000,
  totalSets: 20,
  totalReps: 160,
  ...overrides,
});

const MONDAY = new Date("2026-08-24T12:00:00");

describe("týdenní report", () => {
  it("spočítá počet odcvičených tréninků", () => {
    const report = buildWeeklyReport({
      weekStart: MONDAY,
      workouts: [w(MONDAY), w(new Date("2026-08-26T18:00:00")), w(new Date("2026-08-28T18:00:00"))],
      previousWeekWorkouts: [],
      exerciseBests: [],
    });

    expect(report.workoutsCompleted).toBe(3);
  });

  it("porovná objem s minulým týdnem", () => {
    const report = buildWeeklyReport({
      weekStart: MONDAY,
      workouts: [w(MONDAY, { totalVolumeKg: 11000 })],
      previousWeekWorkouts: [w(new Date("2026-08-17T18:00:00"), { totalVolumeKg: 10000 })],
      exerciseBests: [],
    });

    expect(report.volumeChangePercent).toBe(10);
  });

  it("nedělí nulou, když minulý týden klient netrénoval", () => {
    const report = buildWeeklyReport({
      weekStart: MONDAY,
      workouts: [w(MONDAY)],
      previousWeekWorkouts: [],
      exerciseBests: [],
    });

    expect(report.volumeChangePercent).toBe(0);
  });

  it("najde největší zlepšení i největší pokles", () => {
    const report = buildWeeklyReport({
      weekStart: MONDAY,
      workouts: [w(MONDAY)],
      previousWeekWorkouts: [w(new Date("2026-08-17T18:00:00"))],
      exerciseBests: [
        { exerciseName: "Dřep", currentBestKg: 110, previousBestKg: 100 },
        { exerciseName: "Bench press", currentBestKg: 80, previousBestKg: 82.5 },
        { exerciseName: "Shyby", currentBestKg: 0, previousBestKg: 0 },
      ],
    });

    expect(report.biggestImprovement?.exerciseName).toBe("Dřep");
    expect(report.biggestImprovement?.changePercent).toBe(10);
    expect(report.biggestDecline?.exerciseName).toBe("Bench press");
    expect(report.biggestDecline?.changePercent).toBeLessThan(0);
  });

  it("vynechá cviky bez srovnání s minulým týdnem", () => {
    const report = buildWeeklyReport({
      weekStart: MONDAY,
      workouts: [w(MONDAY)],
      previousWeekWorkouts: [],
      exerciseBests: [
        { exerciseName: "Nový cvik", currentBestKg: 50, previousBestKg: null },
        { exerciseName: "Dřep", currentBestKg: 110, previousBestKg: 100 },
      ],
    });

    expect(report.exerciseProgress).toHaveLength(1);
    expect(report.exerciseProgress[0].exerciseName).toBe("Dřep");
  });

  it("bez tréninků nespadne a vrátí nuly", () => {
    const report = buildWeeklyReport({
      weekStart: MONDAY,
      workouts: [],
      previousWeekWorkouts: [],
      exerciseBests: [],
    });

    expect(report.workoutsCompleted).toBe(0);
    expect(report.biggestImprovement).toBeNull();
  });
});

describe("vývoj po týdnech", () => {
  it("vrátí požadovaný počet týdnů včetně prázdných", () => {
    const now = new Date("2026-08-26T12:00:00");
    const series = weeklyVolumeSeries(
      [w(new Date("2026-08-25T18:00:00"), { totalVolumeKg: 8000 })],
      4,
      now,
    );

    expect(series).toHaveLength(4);
    // Poslední týden má data, předchozí tři jsou prázdné.
    expect(series[3].volumeKg).toBe(8000);
    expect(series[3].workoutCount).toBe(1);
    expect(series[0].workoutCount).toBe(0);
    expect(series[0].volumeKg).toBe(0);
  });

  it("sečte tréninky ve stejném týdnu", () => {
    const now = new Date("2026-08-26T12:00:00");
    const series = weeklyVolumeSeries(
      [
        w(new Date("2026-08-24T18:00:00"), { totalVolumeKg: 5000 }),
        w(new Date("2026-08-26T18:00:00"), { totalVolumeKg: 6000 }),
      ],
      2,
      now,
    );

    expect(series[1].volumeKg).toBe(11000);
    expect(series[1].workoutCount).toBe(2);
  });
});

describe("průměrný pokrok napříč klienty", () => {
  it("zprůměruje trend jednotlivých klientů", () => {
    const result = averageTrend([
      [100, 110],
      [100, 130],
    ]);
    expect(result).toBe(20);
  });

  it("ignoruje klienty s jediným tréninkem", () => {
    expect(averageTrend([[100], [100, 120]])).toBe(20);
  });

  it("bez dat vrátí nulu", () => {
    expect(averageTrend([])).toBe(0);
  });
});
