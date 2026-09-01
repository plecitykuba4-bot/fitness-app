/**
 * Formátování podle českých zvyklostí (cs-CZ).
 * Používej VŽDY tyto funkce — nikdy `toLocaleString()` bez locale,
 * jinak se výstup na serveru a v prohlížeči rozejde.
 */

const LOCALE = "cs-CZ";

/** `30. 8. 2026` */
export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).format(toDate(date));
}

/** `30. srpna 2026` */
export function formatDateLong(date: Date | string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(toDate(date));
}

/** `14:30` */
export function formatTime(date: Date | string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(toDate(date));
}

/** `30. 8. 2026 v 14:30` */
export function formatDateTime(date: Date | string): string {
  return `${formatDate(date)} v ${formatTime(date)}`;
}

/** `2 500` — mezera jako oddělovač tisíců, desetinná čárka */
export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/** `2 500 kg` — desetinná místa jen když jsou potřeba (82,5 kg vs. 80 kg) */
export function formatWeight(kg: number): string {
  const decimals = Number.isInteger(kg) ? 0 : 1;
  return `${formatNumber(kg, decimals)} kg`;
}

/** `+14,3 %` / `−8,1 %` — vždy se znaménkem */
export function formatPercentChange(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  if (rounded === 0) return "0 %";
  const sign = rounded > 0 ? "+" : "−";
  return `${sign}${formatNumber(Math.abs(rounded), 1)} %`;
}

/** `91 %` */
export function formatPercent(value: number): string {
  return `${formatNumber(Math.round(value))} %`;
}

/** `00:42:17` — pro běžící časovač tréninku */
export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

/** `01:30` — pro odpočet pauzy */
export function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** `47 min` nebo `3 h 42 min` — pro souhrny, ne pro běžící časovač */
export function formatDurationHuman(totalSeconds: number): string {
  const minutes = Math.round(Math.max(0, totalSeconds) / 60);
  if (minutes < 60) return `${formatNumber(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** `4 cviky` — česká shoda podmětu s přísudkem (1 / 2–4 / 5+) */
export function plural(
  count: number,
  one: string,
  few: string,
  many: string,
): string {
  const n = Math.abs(count);
  if (n === 1) return one;
  if (n >= 2 && n <= 4) return few;
  return many;
}

/** `4 cviky` včetně čísla */
export function pluralWithCount(
  count: number,
  one: string,
  few: string,
  many: string,
): string {
  return `${formatNumber(count)} ${plural(count, one, few, many)}`;
}

/** `dnes` / `včera` / `před 3 dny` / `30. 8. 2026` */
export function formatRelativeDay(date: Date | string): string {
  const d = startOfDay(toDate(date));
  const today = startOfDay(new Date());
  const days = Math.round((today.getTime() - d.getTime()) / 86_400_000);

  if (days === 0) return "dnes";
  if (days === 1) return "včera";
  if (days > 1 && days < 7)
    return `před ${days} ${plural(days, "dnem", "dny", "dny")}`;
  return formatDate(d);
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Pondělí daného týdne — český týden začíná pondělím. */
export function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay(); // 0 = neděle
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}
