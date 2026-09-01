/**
 * Definice demo klientů a jejich vývoje v čase.
 *
 * Každý klient má vlastní „příběh" — jinou trajektorii, jinou konzistenci,
 * jiné výpadky. Díky tomu je na grafech, v reportech i v analytice vidět,
 * jak se aplikace chová v různých situacích, ne jen u ideálního klienta.
 */

export type Trajectory =
  | "steady" // stabilní růst
  | "fast" // rychlý progres, začátečník
  | "plateau" // stagnace po počátečním růstu
  | "comeback" // pauza kvůli zranění, pak návrat
  | "declining" // pomalu ubývá, ztrácí motivaci
  | "starting"; // právě začal, málo dat

export type ClientSeed = {
  name: string;
  email: string;
  birthYear: number;
  heightCm: number;
  /** Šablony přiřazené na dny v týdnu, v pořadí PLAN_WEEKDAYS. */
  plan: string[];
  trajectory: Trajectory;
  /** Kolik týdnů zpět historie sahá. */
  weeksOfHistory: number;
  /** Násobič startovních vah — starší a lehčí klienti zvedají méně. */
  strengthFactor: number;
  /** Pravděpodobnost, že daný naplánovaný trénink klient vynechá (0–1). */
  missRate: number;
  /** Týdny (počítáno zpět od dneška), které klient úplně vynechal. */
  skippedWeeks?: number[];
  trainerNote?: string;
  clientNote?: { workoutsAgo: number; body: string };
};

export const PLAN_WEEKDAYS = [
  "MONDAY",
  "WEDNESDAY",
  "FRIDAY",
  "SUNDAY",
] as const;

export const CLIENTS: ClientSeed[] = [
  {
    name: "Petr Novák",
    email: "petr.novak@example.com",
    birthYear: 1962,
    heightCm: 178,
    plan: ["PUSH A", "PULL A", "LEGS A"],
    trajectory: "steady",
    weeksOfHistory: 14,
    strengthFactor: 0.85,
    missRate: 0.05,
    trainerNote:
      "Klientovi je 64 let. Držet techniku před váhou, u dřepů hlídat kolena.",
  },
  {
    name: "Tomáš Dvořák",
    email: "tomas.dvorak@example.com",
    birthYear: 1988,
    heightCm: 183,
    plan: ["PUSH A", "PULL A", "LEGS A", "UPPER A", "KARDIO A"],
    trajectory: "fast",
    weeksOfHistory: 14,
    strengthFactor: 1.15,
    missRate: 0.03,
    trainerNote: "Rychlý progres. Od příštího měsíce přidat objem na záda.",
  },
  {
    name: "Martin Svoboda",
    email: "martin.svoboda@example.com",
    birthYear: 1975,
    heightCm: 175,
    plan: ["FULL BODY", "UPPER A"],
    trajectory: "plateau",
    weeksOfHistory: 14,
    strengthFactor: 1.0,
    missRate: 0.15,
    trainerNote:
      "Poslední měsíc stagnuje. Zvážit deload a změnu rozsahu opakování.",
  },
  {
    name: "Jana Marešová",
    email: "jana.maresova@example.com",
    birthYear: 1969,
    heightCm: 166,
    plan: ["FULL BODY", "LEGS A", "UPPER A"],
    trajectory: "comeback",
    weeksOfHistory: 14,
    strengthFactor: 0.6,
    missRate: 0.08,
    // Tři týdny úplného výpadku — v grafu bude vidět mezera.
    skippedWeeks: [7, 6, 5],
    trainerNote:
      "V půlce srpna natažené zádové svaly. Návrat postupný, váhy zpět opatrně.",
    clientNote: {
      workoutsAgo: 2,
      body: "Záda už jsou v pořádku, ale u mrtvého tahu jsem ještě opatrná.",
    },
  },
  {
    name: "Lukáš Beneš",
    email: "lukas.benes@example.com",
    birthYear: 1994,
    heightCm: 180,
    plan: ["PUSH A", "PULL A", "LEGS A", "UPPER A"],
    trajectory: "declining",
    weeksOfHistory: 14,
    strengthFactor: 1.05,
    // Zhoršující se docházka — v analytice vyskočí jako rizikový klient.
    missRate: 0.45,
    skippedWeeks: [2, 1],
    trainerNote:
      "Docházka se od září zhoršila. Ozvat se a domluvit realističtější plán.",
  },
  {
    name: "Eva Horáková",
    email: "eva.horakova@example.com",
    birthYear: 1980,
    heightCm: 170,
    plan: ["FULL BODY", "UPPER A"],
    trajectory: "starting",
    weeksOfHistory: 4,
    strengthFactor: 0.55,
    missRate: 0.05,
    trainerNote: "Nová klientka, začátek října. Zatím jen technika a lehké váhy.",
  },
  {
    name: "Jan Doležal",
    email: "jan.dolezal@example.com",
    birthYear: 1991,
    heightCm: 181,
    plan: ["PUSH A", "PULL A", "LEGS A"],
    trajectory: "plateau",
    weeksOfHistory: 10,
    strengthFactor: 1.0,
    missRate: 0.12,
    trainerNote:
      "Síla se poslední týdny drží na stejné úrovni. Zaměřit se na techniku a regeneraci.",
  },
  {
    name: "Petr Brabec",
    email: "petr.brabec@example.com",
    birthYear: 1985,
    heightCm: 186,
    plan: ["FULL BODY", "UPPER A", "LEGS A", "KARDIO A"],
    trajectory: "steady",
    weeksOfHistory: 9,
    strengthFactor: 0.95,
    missRate: 0.1,
    trainerNote:
      "Pravidelná docházka. U dřepu držet současnou váhu, dokud nebude technika stabilní.",
  },
];

/**
 * Násobič váhy pro daný týden trajektorie.
 * `weekIndex` je 0 pro nejstarší týden, roste směrem k dnešku.
 */
export function progressionFactor(
  trajectory: Trajectory,
  weekIndex: number,
  totalWeeks: number,
): number {
  // Poměr uplynulého času, 0 na začátku, 1 na konci.
  const t = totalWeeks <= 1 ? 1 : weekIndex / (totalWeeks - 1);

  switch (trajectory) {
    case "steady":
      // Rovnoměrný růst, zhruba +18 % za celé období.
      return 1 + 0.18 * t;

    case "fast":
      // Začátečnický skok — rychle zpočátku, pak zpomalí.
      return 1 + 0.35 * Math.sqrt(t);

    case "plateau":
      // Prvních 40 % období roste, pak se zastaví.
      return t < 0.4 ? 1 + 0.3 * (t / 0.4) : 1.3;

    case "comeback":
      // Růst, propad kvůli zranění, pak návrat nad původní hodnotu.
      if (t < 0.45) return 1 + 0.2 * (t / 0.45);
      if (t < 0.65) return 1.05; // po pauze se vrací na nižší váhy
      return 1.05 + 0.2 * ((t - 0.65) / 0.35);

    case "declining":
      // Zpočátku roste, pak kvůli nepravidelnosti ubývá.
      return t < 0.5 ? 1 + 0.15 * (t / 0.5) : 1.15 - 0.12 * ((t - 0.5) / 0.5);

    case "starting":
      // Krátká historie, ale strmý začátečnický růst.
      return 1 + 0.22 * t;
  }
}

/** Váhy ve fitku existují po 2,5 kg. */
export function round25(value: number): number {
  return Math.round(value / 2.5) * 2.5;
}

/**
 * Deterministický pseudonáhodný generátor.
 * Seed musí být reprodukovatelný — jinak by každý běh dal jiná data
 * a nešlo by porovnat, co se změnilo v aplikaci a co jen v datech.
 */
export function makeRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}
