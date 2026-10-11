"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { all, db, one, run } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { back, bool, errorMessage, int, str } from "@/lib/forms";
import { fmtDateTime, money } from "@/lib/format";
import { cancelBooking, createBookings, membershipFor, type BookingResult } from "@/lib/studio";
import { addDays, todayDate } from "@/lib/time";

export async function bookSession(fd: FormData) {
  const user = await requireUser();
  const repeat = bool(fd, "repeat");
  let result: BookingResult;
  try {
    result = createBookings({
      userId: user.id,
      roomId: int(fd, "room"),
      date: str(fd, "date", 10),
      hour: int(fd, "hour", -1),
      hours: int(fd, "hours", 1),
      weeks: repeat ? int(fd, "weeks", 1) : 1,
      notes: str(fd, "notes", 500),
    });
  } catch (e) {
    back("/app/book", { error: errorMessage(e), room: str(fd, "room"), date: str(fd, "date") });
  }
  if (result.booked.length === 0) {
    const reason = result.skipped[0]?.reason ?? "unavailable";
    back("/app/book", { error: `That slot couldn't be booked — ${reason}.`, room: str(fd, "room"), date: str(fd, "date") });
  }
  const charged = result.booked.reduce((s, b) => s + b.price, 0);
  let msg = `Booked ${result.booked.length} session${result.booked.length > 1 ? "s" : ""}.`;
  if (charged > 0) msg += ` ${money(charged)} charged at the hourly rate.`;
  if (result.skipped.length) {
    msg += ` Skipped: ${result.skipped.map((s) => `${fmtDateTime(s.start)} (${s.reason})`).join(", ")}.`;
  }
  revalidatePath("/app");
  back("/app/sessions", { ok: msg });
}

export async function cancelSession(fd: FormData) {
  const user = await requireUser();
  try {
    cancelBooking(int(fd, "id"), { userId: user.id, wholeSeries: bool(fd, "series") });
  } catch (e) {
    back("/app/sessions", { error: errorMessage(e) });
  }
  revalidatePath("/app");
  back("/app/sessions", { ok: "Session cancelled." });
}

export async function placeOrder(fd: FormData) {
  const user = await requireUser();
  const svc = all<{ id: number; name: string; price_cents: number; turnaround_days: number }>(
    "SELECT id, name, price_cents, turnaround_days FROM services WHERE active = 1",
  );
  const lines = svc
    .map((s) => ({ ...s, qty: Math.max(0, Math.min(20, int(fd, `qty_${s.id}`, 0))) }))
    .filter((l) => l.qty > 0);
  if (lines.length === 0) back("/app/production/new", { error: "Pick at least one service." });

  const bookingId = int(fd, "booking", 0) || null;
  if (bookingId && !one("SELECT 1 FROM bookings WHERE id = ? AND user_id = ?", bookingId, user.id)) {
    back("/app/production/new", { error: "That session isn't yours." });
  }
  const pct = membershipFor(user.id)?.status === "active" ? membershipFor(user.id)!.production_discount_pct : 0;
  const subtotal = lines.reduce((s, l) => s + l.price_cents * l.qty, 0);
  const discount = Math.round((subtotal * pct) / 100);
  const due = addDays(`${todayDate()}T00:00`, Math.max(...lines.map((l) => l.turnaround_days))).slice(0, 10);

  const orderId = db.transaction(() => {
    const id = Number(
      run(
        `INSERT INTO orders (user_id, booking_id, status, notes, subtotal_cents, discount_cents, total_cents, due_date)
         VALUES (?, ?, 'requested', ?, ?, ?, ?, ?)`,
        user.id, bookingId, str(fd, "notes", 2000), subtotal, discount, subtotal - discount, due,
      ).lastInsertRowid,
    );
    for (const l of lines) {
      run("INSERT INTO order_items (order_id, service_id, name, qty, unit_price_cents) VALUES (?, ?, ?, ?, ?)", id, l.id, l.name, l.qty, l.price_cents);
    }
    run("INSERT INTO payments (user_id, stream, amount_cents, description) VALUES (?, 'production', ?, ?)", user.id, subtotal - discount, `Production order #${id}`);
    return id;
  })();

  revalidatePath("/app");
  back("/app/production", { ok: `Order #${orderId} placed — due ${due}. We'll post deliverables here.` });
}

export async function changePlan(fd: FormData) {
  const user = await requireUser();
  const plan = one<{ id: number; name: string; price_cents: number }>("SELECT id, name, price_cents FROM plans WHERE id = ? AND active = 1", int(fd, "plan"));
  if (!plan) back("/app/membership", { error: "Choose a plan." });
  const current = membershipFor(user.id);
  db.transaction(() => {
    if (current) {
      run("UPDATE memberships SET plan_id = ?, status = 'active' WHERE id = ?", plan.id, current.id);
    } else {
      run("INSERT INTO memberships (user_id, plan_id, status, started_at) VALUES (?, ?, 'active', strftime('%Y-%m-%dT%H:%M','now','localtime'))", user.id, plan.id);
      run("INSERT INTO payments (user_id, stream, amount_cents, description) VALUES (?, 'membership', ?, ?)", user.id, plan.price_cents, `${plan.name} membership`);
    }
  })();
  revalidatePath("/app");
  back("/app/membership", { ok: current ? `Switched to ${plan.name}.` : `Welcome to ${plan.name}!` });
}

export async function setMembershipStatus(fd: FormData) {
  const user = await requireUser();
  const status = str(fd, "status");
  if (!["active", "paused", "cancelled"].includes(status)) back("/app/membership", { error: "Unknown action." });
  const current = membershipFor(user.id);
  if (!current) back("/app/membership", { error: "You don't have a membership yet." });
  run(
    "UPDATE memberships SET status = ?, cancelled_at = CASE WHEN ? = 'cancelled' THEN strftime('%Y-%m-%dT%H:%M','now','localtime') END WHERE id = ?",
    status, status, current.id,
  );
  revalidatePath("/app");
  const msg = status === "paused" ? "Membership paused." : status === "cancelled" ? "Membership cancelled. Sorry to see you go." : "Membership resumed.";
  back("/app/membership", { ok: msg });
}

export async function updateProfile(fd: FormData) {
  const user = await requireUser();
  const name = str(fd, "name", 120);
  if (!name) back("/app/membership", { error: "Name can't be empty." });
  run("UPDATE users SET name = ?, phone = ? WHERE id = ?", name, str(fd, "phone", 40), user.id);
  redirect("/app/membership?ok=Profile+saved.");
}
