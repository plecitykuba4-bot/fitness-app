import { describe, expect, it } from "vitest";
import {
  formatCountdown,
  formatDate,
  formatDuration,
  formatDurationHuman,
  formatNumber,
  formatPercentChange,
  formatTime,
  formatWeight,
  plural,
  pluralWithCount,
  startOfWeek,
} from "@/lib/format";

describe("české formátování", () => {
  it("píše datum po českém způsobu", () => {
    expect(formatDate(new Date("2026-08-30T14:30:00"))).toBe("30. 8. 2026");
  });

  it("píše čas ve 24hodinovém formátu", () => {
    expect(formatTime(new Date("2026-08-30T14:30:00"))).toBe("14:30");
  });

  it("odděluje tisíce mezerou, ne čárkou", () => {
    // Nedělitelná mezera je záměr — číslo se nesmí zalomit uprostřed.
    expect(formatNumber(2500).replace(/ /g, " ")).toBe("2 500");
  });

  it("píše desetinnou čárku, ne tečku", () => {
    expect(formatWeight(82.5)).toBe("82,5 kg");
  });

  it("u celé váhy neukazuje zbytečná desetinná místa", () => {
    expect(formatWeight(80)).toBe("80 kg");
  });

  it("u procentuální změny vždy uvede znaménko", () => {
    expect(formatPercentChange(14.3)).toBe("+14,3 %");
    expect(formatPercentChange(-8.1)).toBe("−8,1 %");
    expect(formatPercentChange(0)).toBe("0 %");
  });
});

describe("časovače", () => {
  it("formátuje běžící čas tréninku", () => {
    expect(formatDuration(2537)).toBe("00:42:17");
  });

  it("zvládne i tréninky přes hodinu", () => {
    expect(formatDuration(3661)).toBe("01:01:01");
  });

  it("nikdy neukáže záporný čas", () => {
    expect(formatDuration(-50)).toBe("00:00:00");
  });

  it("formátuje odpočet pauzy", () => {
    expect(formatCountdown(90)).toBe("01:30");
  });

  it("píše délku tréninku srozumitelně", () => {
    expect(formatDurationHuman(2820)).toBe("47 min");
    expect(formatDurationHuman(13320)).toBe("3 h 42 min");
    expect(formatDurationHuman(7200)).toBe("2 h");
  });
});

describe("česká shoda čísel", () => {
  it("skloňuje podle 1 / 2–4 / 5+", () => {
    expect(plural(1, "cvik", "cviky", "cviků")).toBe("cvik");
    expect(plural(3, "cvik", "cviky", "cviků")).toBe("cviky");
    expect(plural(6, "cvik", "cviky", "cviků")).toBe("cviků");
    expect(plural(0, "cvik", "cviky", "cviků")).toBe("cviků");
  });

  it("spojí číslo se správným tvarem", () => {
    expect(pluralWithCount(5, "trénink", "tréninky", "tréninků")).toBe(
      "5 tréninků",
    );
  });
});

describe("začátek týdne", () => {
  it("začíná pondělím, ne nedělí", () => {
    // 30. 8. 2026 je neděle — český týden začal 24. 8. (pondělí).
    const monday = startOfWeek(new Date("2026-08-30T12:00:00"));
    expect(monday.getDay()).toBe(1);
    expect(monday.getDate()).toBe(24);
  });

  it("v pondělí vrátí týž den", () => {
    const monday = startOfWeek(new Date("2026-08-24T12:00:00"));
    expect(monday.getDate()).toBe(24);
  });
});
