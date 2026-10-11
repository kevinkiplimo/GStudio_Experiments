// All studio times are stored as local wall-clock strings ("YYYY-MM-DDTHH:MM")
// in the studio's timezone. Set TZ for the server process to the studio's zone.

const pad = (n: number) => String(n).padStart(2, "0");

export function toLocal(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function parseLocal(s: string): Date {
  const [date, time = "00:00"] = s.split("T");
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm);
}

export function nowLocal(): string {
  return toLocal(new Date());
}

export function todayDate(): string {
  return nowLocal().slice(0, 10);
}

export function addDays(s: string, days: number): string {
  const d = parseLocal(s);
  d.setDate(d.getDate() + days);
  return toLocal(d);
}

export function addHours(s: string, hours: number): string {
  const d = parseLocal(s);
  d.setMinutes(d.getMinutes() + Math.round(hours * 60));
  return toLocal(d);
}

export function hoursBetween(a: string, b: string): number {
  return (parseLocal(b).getTime() - parseLocal(a).getTime()) / 3_600_000;
}

/** First instant of the calendar month containing `s`. Membership hours reset monthly. */
export function monthStart(s: string): string {
  return `${s.slice(0, 7)}-01T00:00`;
}

export function nextMonthStart(s: string): string {
  const d = parseLocal(monthStart(s));
  d.setMonth(d.getMonth() + 1);
  return toLocal(d);
}

export function monthKey(s: string): string {
  return s.slice(0, 7);
}
