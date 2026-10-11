import { parseLocal } from "./time";

export function money(cents: number, opts: { compact?: boolean } = {}): string {
  const dollars = cents / 100;
  if (opts.compact && Math.abs(dollars) >= 1000) {
    return "$" + (dollars / 1000).toFixed(dollars >= 10000 ? 0 : 1).replace(/\.0$/, "") + "k";
  }
  return dollars.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: dollars % 1 === 0 ? 0 : 2,
  });
}

export function hours(h: number): string {
  const v = Math.round(h * 10) / 10;
  return `${v % 1 === 0 ? v.toFixed(0) : v}h`;
}

/** Accepts our local "YYYY-MM-DDTHH:MM" strings and SQLite "YYYY-MM-DD HH:MM:SS" stamps. */
function toDate(s: string): Date {
  return parseLocal(s.replace(" ", "T").slice(0, 16));
}

export function fmtDate(s: string): string {
  return toDate(s).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export function fmtDateLong(s: string): string {
  return toDate(s).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

export function fmtTime(s: string): string {
  return toDate(s).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function fmtDateTime(s: string): string {
  return `${fmtDate(s)} · ${fmtTime(s)}`;
}

export function fmtMonth(key: string): string {
  return toDate(`${key}-01T00:00`).toLocaleDateString("en-US", { month: "short" });
}

export function titleCase(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
