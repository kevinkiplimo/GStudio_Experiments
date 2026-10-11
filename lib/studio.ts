import "server-only";
import { randomUUID } from "node:crypto";
import { all, db, one, run } from "./db";
import { brand } from "./brand";
import { addDays, addHours, hoursBetween, monthStart, nextMonthStart, nowLocal, todayDate } from "./time";

export type Plan = {
  id: number;
  slug: string;
  name: string;
  price_cents: number;
  hours_per_month: number;
  booking_window_days: number;
  production_discount_pct: number;
  description: string;
  features: string;
  sort: number;
  active: number;
};

export type Room = {
  id: number;
  slug: string;
  name: string;
  description: string;
  hourly_rate_cents: number;
  capacity: number;
  active: number;
};

export type Service = {
  id: number;
  name: string;
  category: string;
  description: string;
  price_cents: number;
  unit: string;
  turnaround_days: number;
  is_package: number;
  sort: number;
  active: number;
};

export type MembershipWithPlan = {
  id: number;
  user_id: number;
  plan_id: number;
  status: "active" | "paused" | "cancelled";
  started_at: string;
  plan_name: string;
  plan_slug: string;
  price_cents: number;
  hours_per_month: number;
  booking_window_days: number;
  production_discount_pct: number;
};

export type Booking = {
  id: number;
  user_id: number;
  room_id: number;
  starts_at: string;
  ends_at: string;
  status: "confirmed" | "completed" | "cancelled" | "no_show";
  series_id: string | null;
  uses_membership: number;
  price_cents: number;
  notes: string;
  room_name: string;
};

export const ORDER_STATUSES = ["requested", "in_progress", "review", "delivered"] as const;
export const DEAL_STATUSES = ["lead", "pitched", "negotiating", "signed", "live", "completed", "lost"] as const;
export const EVENT_KINDS = ["mixer", "live_recording", "workshop", "brand_event"] as const;

export const features = (p: Plan): string[] => JSON.parse(p.features || "[]");

export function plans(includeInactive = false): Plan[] {
  return all<Plan>(`SELECT * FROM plans ${includeInactive ? "" : "WHERE active = 1"} ORDER BY sort, price_cents`);
}

export function rooms(includeInactive = false): Room[] {
  return all<Room>(`SELECT * FROM rooms ${includeInactive ? "" : "WHERE active = 1"} ORDER BY id`);
}

export function services(includeInactive = false): Service[] {
  return all<Service>(`SELECT * FROM services ${includeInactive ? "" : "WHERE active = 1"} ORDER BY sort, id`);
}

/** The member's current (active or paused) membership, if any. */
export function membershipFor(userId: number): MembershipWithPlan | undefined {
  return one<MembershipWithPlan>(
    `SELECT m.*, p.name AS plan_name, p.slug AS plan_slug, p.price_cents, p.hours_per_month,
            p.booking_window_days, p.production_discount_pct
     FROM memberships m JOIN plans p ON p.id = m.plan_id
     WHERE m.user_id = ? AND m.status IN ('active','paused')
     ORDER BY m.id DESC LIMIT 1`,
    userId,
  );
}

/** Membership hours already committed in the calendar month that contains `at`. */
export function hoursUsed(userId: number, at: string = nowLocal()): number {
  const rows = all<{ starts_at: string; ends_at: string }>(
    `SELECT starts_at, ends_at FROM bookings
     WHERE user_id = ? AND uses_membership = 1 AND status IN ('confirmed','completed')
       AND starts_at >= ? AND starts_at < ?`,
    userId,
    monthStart(at),
    nextMonthStart(at),
  );
  return rows.reduce((sum, r) => sum + hoursBetween(r.starts_at, r.ends_at), 0);
}

export function bookingWindowDays(userId: number): number {
  const m = membershipFor(userId);
  return m && m.status === "active" ? m.booking_window_days : brand.publicBookingWindowDays;
}

export function hasConflict(roomId: number, start: string, end: string): boolean {
  return !!one(
    `SELECT 1 FROM bookings WHERE room_id = ? AND status IN ('confirmed','completed')
     AND starts_at < ? AND ends_at > ? LIMIT 1`,
    roomId,
    end,
    start,
  );
}

/** Booked [start,end) blocks for a room on a given date, for the slot picker. */
export function roomDayBookings(roomId: number, date: string) {
  return all<{ starts_at: string; ends_at: string }>(
    `SELECT starts_at, ends_at FROM bookings WHERE room_id = ? AND status IN ('confirmed','completed')
     AND starts_at < ? AND ends_at > ?`,
    roomId,
    `${addDays(`${date}T00:00`, 1)}`,
    `${date}T00:00`,
  );
}

export type BookingRequest = {
  userId: number;
  roomId: number;
  date: string; // YYYY-MM-DD
  hour: number; // start hour
  hours: number; // duration
  weeks: number; // 1 = single session
  notes: string;
};

export type BookingResult = {
  booked: { start: string; covered: boolean; price: number }[];
  skipped: { start: string; reason: string }[];
};

export function createBookings(req: BookingRequest): BookingResult {
  const room = one<Room>("SELECT * FROM rooms WHERE id = ? AND active = 1", req.roomId);
  if (!room) throw new Error("Choose a studio.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(req.date)) throw new Error("Choose a date.");
  if (!Number.isInteger(req.hour) || !Number.isInteger(req.hours) || req.hours < 1 || req.hours > 6) {
    throw new Error("Choose a valid time and duration.");
  }
  if (req.hour < brand.studioOpenHour || req.hour + req.hours > brand.studioCloseHour) {
    throw new Error(`Sessions must fit inside studio hours (${brand.studioOpenHour}:00–${brand.studioCloseHour}:00).`);
  }

  const membership = membershipFor(req.userId);
  const activeMember = membership?.status === "active";
  const weeks = Math.max(1, Math.min(12, Math.floor(req.weeks || 1)));
  if (weeks > 1 && !activeMember) throw new Error("Recurring sessions are a membership perk.");

  const window = bookingWindowDays(req.userId);
  const lastDay = addDays(`${todayDate()}T00:00`, window).slice(0, 10);
  const now = nowLocal();
  const firstStart = `${req.date}T${String(req.hour).padStart(2, "0")}:00`;
  const seriesId = weeks > 1 ? randomUUID() : null;
  const result: BookingResult = { booked: [], skipped: [] };

  const insert = db.prepare(
    `INSERT INTO bookings (user_id, room_id, starts_at, ends_at, status, series_id, uses_membership, price_cents, notes)
     VALUES (?, ?, ?, ?, 'confirmed', ?, ?, ?, ?)`,
  );
  const pay = db.prepare(`INSERT INTO payments (user_id, stream, amount_cents, description) VALUES (?, 'hourly', ?, ?)`);

  db.transaction(() => {
    for (let w = 0; w < weeks; w++) {
      const start = addDays(firstStart, w * 7);
      const end = addHours(start, req.hours);
      if (start <= now) {
        result.skipped.push({ start, reason: "in the past" });
        continue;
      }
      if (start.slice(0, 10) > lastDay) {
        result.skipped.push({ start, reason: `outside your ${window}-day booking window` });
        continue;
      }
      if (hasConflict(room.id, start, end)) {
        result.skipped.push({ start, reason: "already booked" });
        continue;
      }
      const remaining = activeMember ? membership!.hours_per_month - hoursUsed(req.userId, start) : 0;
      const covered = activeMember && remaining >= req.hours;
      const price = covered ? 0 : room.hourly_rate_cents * req.hours;
      insert.run(req.userId, room.id, start, end, seriesId, covered ? 1 : 0, price, req.notes.slice(0, 500));
      if (price > 0) pay.run(req.userId, price, `${room.name} · ${req.hours}h`);
      result.booked.push({ start, covered, price });
    }
  })();

  return result;
}

/** Cancels a booking (or its remaining series). Refunds hourly charges for future sessions. */
export function cancelBooking(bookingId: number, opts: { userId?: number; wholeSeries?: boolean }) {
  const b = one<Booking>("SELECT b.*, r.name AS room_name FROM bookings b JOIN rooms r ON r.id = b.room_id WHERE b.id = ?", bookingId);
  if (!b || (opts.userId !== undefined && b.user_id !== opts.userId)) throw new Error("Booking not found.");
  const now = nowLocal();
  const targets =
    opts.wholeSeries && b.series_id
      ? all<Booking>(
          "SELECT b.*, r.name AS room_name FROM bookings b JOIN rooms r ON r.id = b.room_id WHERE series_id = ? AND starts_at > ? AND status = 'confirmed'",
          b.series_id,
          now,
        )
      : [b];
  db.transaction(() => {
    for (const t of targets) {
      if (t.status !== "confirmed" || t.starts_at <= now) continue;
      run("UPDATE bookings SET status = 'cancelled' WHERE id = ?", t.id);
      if (t.price_cents > 0) {
        run(
          "INSERT INTO payments (user_id, stream, amount_cents, description) VALUES (?, 'hourly', ?, ?)",
          t.user_id,
          -t.price_cents,
          `Refund · ${t.room_name}`,
        );
      }
    }
  })();
}

// ---------------------------------------------------------------------------
// Back-office metrics

export const STREAMS = ["membership", "production", "sponsorship", "events", "hourly"] as const;
export type Stream = (typeof STREAMS)[number];

export function revenueByMonth(months = 6) {
  const keys: string[] = [];
  let cursor = monthStart(nowLocal());
  for (let i = 0; i < months; i++) {
    keys.unshift(cursor.slice(0, 7));
    cursor = monthStart(addDays(cursor, -1));
  }
  const rows = all<{ month: string; stream: Stream; cents: number }>(
    `SELECT substr(created_at, 1, 7) AS month, stream, SUM(amount_cents) AS cents
     FROM payments WHERE created_at >= ? GROUP BY month, stream`,
    `${keys[0]}-01 00:00:00`,
  );
  return keys.map((month) => {
    const byStream = Object.fromEntries(STREAMS.map((s) => [s, 0])) as Record<Stream, number>;
    for (const r of rows) if (r.month === month) byStream[r.stream] = r.cents;
    return { month, ...byStream, total: STREAMS.reduce((sum, s) => sum + byStream[s], 0) };
  });
}

export function mrrCents(): number {
  return (
    one<{ v: number }>(
      `SELECT COALESCE(SUM(p.price_cents),0) AS v FROM memberships m JOIN plans p ON p.id = m.plan_id WHERE m.status = 'active'`,
    )?.v ?? 0
  );
}

/** Share of bookable room-hours that are booked this week (Mon–Sun). */
export function weekUtilization(): { pct: number; booked: number; capacity: number } {
  const today = new Date();
  const mondayOffset = (today.getDay() + 6) % 7;
  const weekStart = addDays(`${todayDate()}T00:00`, -mondayOffset);
  const weekEnd = addDays(weekStart, 7);
  const rows = all<{ starts_at: string; ends_at: string }>(
    `SELECT starts_at, ends_at FROM bookings WHERE status IN ('confirmed','completed') AND starts_at >= ? AND starts_at < ?`,
    weekStart,
    weekEnd,
  );
  const booked = rows.reduce((s, r) => s + hoursBetween(r.starts_at, r.ends_at), 0);
  const capacity = rooms().length * (brand.studioCloseHour - brand.studioOpenHour) * 7;
  return { pct: capacity ? Math.round((booked / capacity) * 100) : 0, booked, capacity };
}

// ---------------------------------------------------------------------------
// Public listings

export type EventWithSales = {
  id: number;
  slug: string;
  title: string;
  kind: string;
  description: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  price_cents: number;
  published: number;
  sold: number;
};

export function eventsWithSales(opts: { upcoming?: boolean; publishedOnly?: boolean; limit?: number } = {}): EventWithSales[] {
  const where: string[] = [];
  if (opts.upcoming) where.push(`e.ends_at > '${nowLocal()}'`);
  if (opts.publishedOnly) where.push("e.published = 1");
  return all<EventWithSales>(
    `SELECT e.*, COALESCE((SELECT SUM(qty) FROM tickets t WHERE t.event_id = e.id), 0) AS sold
     FROM events e ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY e.starts_at ${opts.upcoming ? "ASC" : "DESC"} ${opts.limit ? `LIMIT ${Math.floor(opts.limit)}` : ""}`,
  );
}

export type Show = {
  id: number;
  slug: string;
  title: string;
  tagline: string;
  description: string;
  format: string;
  status: "development" | "production" | "live" | "paused";
  episodes: number;
  avg_listeners: number;
  cadence: string;
  cover_hue: number;
};

export function shows(): Show[] {
  return all<Show>(
    "SELECT * FROM shows ORDER BY CASE status WHEN 'live' THEN 0 WHEN 'production' THEN 1 WHEN 'development' THEN 2 ELSE 3 END, avg_listeners DESC",
  );
}
