import { describe, expect, it } from "vitest";
import {
  activeDays,
  completionRate,
  percentChange,
  setVolume,
  summarizeClient,
  totalVolume,
  trendChange,
  weeklyBestSeries,
  weeklyStreak,
  type WorkoutLike,
} from "@/services/progress";

const workout = (
  startedAt: Date,
  overrides: Partial<WorkoutLike> = {},
): WorkoutLike => ({
  startedAt,
  durationSec: 2700,
  totalVolumeKg: 5000,
  totalSets: 20,
  totalReps: 160,
  ...overrides,
});

describe("výpočet objemu", () => {
  it("spočítá objem série jako váha × opakování", () => {
    expect(setVolume({ weightKg: 80, reps: 8 })).toBe(640);
  });

  it("sečte objem všech sérií", () => {
    expect(
      totalVolume([
        { weightKg: 80, reps: 8 },
        { weightKg: 82.5, reps: 6 },
      ]),
    ).toBe(1135);
  });

  it("zvládne prázdný seznam bez pádu", () => {
    expect(totalVolume([])).toBe(0);
  });
});

describe("procentuální změna", () => {
  it("spočítá růst mezi prvním a posledním bodem", () => {
    expect(percentChange([70, 72.5, 75, 77.5, 80])).toBe(14.3);
  });

  it("vrátí 0 při jediné hodnotě", () => {
    expect(percentChange([80])).toBe(0);
  });

  it("nedělí nulou", () => {
    expect(percentChange([0, 80])).toBe(0);
  });
});

describe("trend odolný vůči výkyvům", () => {
  it("nenechá se strhnout jedním odlehlým tréninkem", () => {
    // Klient stabilně roste, jen poslední trénink byl zkrácený.
    const values = [1000, 1050, 1100, 1150, 1200, 1250, 200];
    expect(percentChange(values)).toBeLessThan(0); // naivní výpočet ukáže propad
    expect(trendChange(values)).toBeGreaterThan(0); // trend zůstane kladný
  });

  it("u krátké řady zmenší okno, aby se konce nepřekrývaly", () => {
    expect(trendChange([100, 200])).toBe(100);
  });
});

describe("série týdnů", () => {
  it("počítá po sobě jdoucí tréninkové týdny", () => {
    const now = new Date("2026-08-26T12:00:00"); // středa
    const workouts = [
      workout(new Date("2026-08-25T18:00:00")), // tento týden
      workout(new Date("2026-08-18T18:00:00")), // minulý
      workout(new Date("2026-08-11T18:00:00")), // předminulý
    ];
    expect(weeklyStreak(workouts, now)).toBe(3);
  });

  it("nespadne na nulu, když se tento týden ještě netrénovalo", () => {
    const now = new Date("2026-08-24T08:00:00"); // pondělí ráno
    const workouts = [
      workout(new Date("2026-08-20T18:00:00")),
      workout(new Date("2026-08-13T18:00:00")),
    ];
    expect(weeklyStreak(workouts, now)).toBe(2);
  });

  it("vrátí 0 bez tréninků", () => {
    expect(weeklyStreak([], new Date())).toBe(0);
  });

  it("přeruší se při vynechaném týdnu", () => {
    const now = new Date("2026-08-26T12:00:00");
    const workouts = [
      workout(new Date("2026-08-25T18:00:00")),
      workout(new Date("2026-08-11T18:00:00")), // týden 18.–24. chybí
    ];
    expect(weeklyStreak(workouts, now)).toBe(1);
  });
});

describe("souhrn klienta", () => {
  it("sečte tréninky, čas, série a objem", () => {
    const workouts = [
      workout(new Date("2026-08-25T18:00:00")),
      workout(new Date("2026-08-24T18:00:00"), { totalVolumeKg: 3000 }),
    ];
    const s = summarizeClient(workouts, new Date("2026-08-26T12:00:00"));

    expect(s.workoutCount).toBe(2);
    expect(s.totalTimeSec).toBe(5400);
    expect(s.totalVolumeKg).toBe(8000);
    expect(s.totalSets).toBe(40);
    expect(s.averageDurationSec).toBe(2700);
  });

  it("nepočítá průměr z tréninků bez délky", () => {
    const s = summarizeClient([workout(new Date(), { durationSec: null })]);
    expect(s.averageDurationSec).toBe(0);
  });

  it("počítá aktivní dny podle kalendářních dnů", () => {
    const workouts = [
      workout(new Date("2026-08-25T08:00:00")),
      workout(new Date("2026-08-25T19:00:00")), // stejný den
      workout(new Date("2026-08-24T18:00:00")),
    ];
    expect(activeDays(workouts)).toBe(2);
  });
});

describe("nejlepší série po týdnech", () => {
  it("vezme z každého týdne nejvyšší váhu a seřadí chronologicky", () => {
    const result = weeklyBestSeries([
      { date: new Date("2026-08-25T18:00:00"), weightKg: 80 },
      { date: new Date("2026-08-27T18:00:00"), weightKg: 85 },
      { date: new Date("2026-08-18T18:00:00"), weightKg: 75 },
    ]);

    expect(result).toHaveLength(2);
    expect(result[0].weightKg).toBe(75);
    expect(result[1].weightKg).toBe(85);
  });
});

describe("míra dokončení", () => {
  it("spočítá procenta", () => {
    expect(completionRate(3, 4)).toBe(75);
  });

  it("nedělí nulou", () => {
    expect(completionRate(0, 0)).toBe(0);
  });

  it("nepřekročí 100 %", () => {
    expect(completionRate(5, 4)).toBe(100);
  });
});
