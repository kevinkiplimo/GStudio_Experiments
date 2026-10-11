"use server";

import { revalidatePath } from "next/cache";
import { db, one, run } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { back, bool, cents, errorMessage, int, safePath, str } from "@/lib/forms";
import { cancelBooking, DEAL_STATUSES, EVENT_KINDS, ORDER_STATUSES } from "@/lib/studio";

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || `item-${Date.now()}`;

function done(fd: FormData, fallback: string, msg: string): never {
  revalidatePath("/admin", "layout");
  back(safePath(str(fd, "from"), fallback), { ok: msg });
}

// ---- Bookings ---------------------------------------------------------------

export async function setBookingStatus(fd: FormData) {
  await requireStaff();
  const id = int(fd, "id");
  const status = str(fd, "status");
  if (status === "cancelled") {
    try {
      cancelBooking(id, {});
    } catch (e) {
      back(safePath(str(fd, "from"), "/admin/bookings"), { error: errorMessage(e) });
    }
  } else if (["confirmed", "completed", "no_show"].includes(status)) {
    run("UPDATE bookings SET status = ? WHERE id = ?", status, id);
  }
  done(fd, "/admin/bookings", "Booking updated.");
}

// ---- Members ----------------------------------------------------------------

export async function setMemberPlan(fd: FormData) {
  await requireStaff();
  const userId = int(fd, "user");
  const planId = int(fd, "plan", 0);
  const current = one<{ id: number }>("SELECT id FROM memberships WHERE user_id = ? AND status IN ('active','paused') ORDER BY id DESC LIMIT 1", userId);
  if (!planId) {
    if (current) run("UPDATE memberships SET status = 'cancelled', cancelled_at = strftime('%Y-%m-%dT%H:%M','now','localtime') WHERE id = ?", current.id);
  } else if (current) {
    run("UPDATE memberships SET plan_id = ?, status = 'active' WHERE id = ?", planId, current.id);
  } else {
    run("INSERT INTO memberships (user_id, plan_id, status, started_at) VALUES (?, ?, 'active', strftime('%Y-%m-%dT%H:%M','now','localtime'))", userId, planId);
  }
  done(fd, `/admin/members/${userId}`, "Membership updated.");
}

export async function setUserRole(fd: FormData) {
  const me = await requireStaff();
  if (me.role !== "admin") back("/admin/members", { error: "Only admins can change roles." });
  const role = str(fd, "role");
  const userId = int(fd, "user");
  if (!["admin", "staff", "member"].includes(role)) back("/admin/members", { error: "Unknown role." });
  if (userId === me.id && role !== "admin") back(`/admin/members/${userId}`, { error: "You can't remove your own admin access." });
  run("UPDATE users SET role = ? WHERE id = ?", role, userId);
  done(fd, `/admin/members/${userId}`, "Role updated.");
}

// ---- Production -------------------------------------------------------------

export async function updateOrder(fd: FormData) {
  await requireStaff();
  const id = int(fd, "id");
  const status = str(fd, "status");
  if (status) {
    if (![...ORDER_STATUSES, "cancelled"].includes(status as never)) back("/admin/production", { error: "Unknown status." });
    run("UPDATE orders SET status = ? WHERE id = ?", status, id);
  }
  if (fd.has("assignee")) run("UPDATE orders SET assignee_id = ? WHERE id = ?", int(fd, "assignee", 0) || null, id);
  if (fd.has("due_date") && /^\d{4}-\d{2}-\d{2}$/.test(str(fd, "due_date"))) run("UPDATE orders SET due_date = ? WHERE id = ?", str(fd, "due_date"), id);
  done(fd, `/admin/production?order=${id}`, `Order #${id} updated.`);
}

export async function addDeliverable(fd: FormData) {
  await requireStaff();
  const orderId = int(fd, "order");
  const title = str(fd, "title", 200);
  const url = str(fd, "url", 1000);
  if (!title || !/^https?:\/\//.test(url)) back(`/admin/production?order=${orderId}`, { error: "Add a title and a full link (https://…)." });
  run("INSERT INTO deliverables (order_id, title, url, kind) VALUES (?, ?, ?, ?)", orderId, title, url, str(fd, "kind", 40) || "file");
  if (bool(fd, "mark_delivered")) run("UPDATE orders SET status = 'delivered' WHERE id = ?", orderId);
  done(fd, `/admin/production?order=${orderId}`, "Deliverable added.");
}

// ---- Shows & sponsors ---------------------------------------------------------

export async function saveShow(fd: FormData) {
  await requireStaff();
  const id = int(fd, "id", 0);
  const title = str(fd, "title", 160);
  if (!title) back("/admin/shows", { error: "Give the show a title." });
  const status = ["development", "production", "live", "paused"].includes(str(fd, "status")) ? str(fd, "status") : "development";
  const fields = [
    title, str(fd, "tagline", 240), str(fd, "description", 4000), str(fd, "format", 120), status,
    int(fd, "episodes", 0), int(fd, "avg_listeners", 0), str(fd, "cadence", 60) || "Weekly", int(fd, "cover_hue", 280) % 360,
  ];
  if (id) {
    run(
      `UPDATE shows SET title=?, tagline=?, description=?, format=?, status=?, episodes=?, avg_listeners=?, cadence=?, cover_hue=? WHERE id=?`,
      ...fields, id,
    );
    done(fd, `/admin/shows/${id}`, "Show saved.");
  }
  let slug = slugify(title);
  if (one("SELECT 1 FROM shows WHERE slug = ?", slug)) slug = `${slug}-${Date.now().toString(36)}`;
  const newId = run(
    `INSERT INTO shows (title, tagline, description, format, status, episodes, avg_listeners, cadence, cover_hue, slug) VALUES (?,?,?,?,?,?,?,?,?,?)`,
    ...fields, slug,
  ).lastInsertRowid;
  done(fd, `/admin/shows/${newId}`, "Show created. Add sponsorship packages next.");
}

export async function savePackage(fd: FormData) {
  await requireStaff();
  const showId = int(fd, "show");
  const id = int(fd, "id", 0);
  const name = str(fd, "name", 120);
  if (!name) back(`/admin/shows/${showId}`, { error: "Package needs a name." });
  if (id) run("UPDATE sponsor_packages SET name=?, price_cents=?, description=? WHERE id=? AND show_id=?", name, cents(fd, "price"), str(fd, "description", 1000), id, showId);
  else run("INSERT INTO sponsor_packages (show_id, name, price_cents, description) VALUES (?,?,?,?)", showId, name, cents(fd, "price"), str(fd, "description", 1000));
  done(fd, `/admin/shows/${showId}`, "Package saved.");
}

export async function deletePackage(fd: FormData) {
  await requireStaff();
  const showId = int(fd, "show");
  run("DELETE FROM sponsor_packages WHERE id = ? AND show_id = ?", int(fd, "id"), showId);
  done(fd, `/admin/shows/${showId}`, "Package removed.");
}

export async function saveDeal(fd: FormData) {
  await requireStaff();
  const id = int(fd, "id", 0);
  const status = str(fd, "status") || "lead";
  if (!DEAL_STATUSES.includes(status as never)) back("/admin/shows", { error: "Unknown deal stage." });

  if (!id) {
    const showId = int(fd, "show");
    const brand = str(fd, "brand", 160);
    if (!brand || !one("SELECT 1 FROM shows WHERE id = ?", showId)) back("/admin/shows", { error: "Pick a show and add the brand name." });
    run(
      "INSERT INTO deals (show_id, package_id, brand, contact_name, contact_email, status, value_cents, notes) VALUES (?,?,?,?,?,?,?,?)",
      showId, int(fd, "package", 0) || null, brand, str(fd, "contact_name", 120), str(fd, "contact_email", 200), status, cents(fd, "value"), str(fd, "notes", 2000),
    );
    done(fd, "/admin/shows", "Deal added to the pipeline.");
  }

  const deal = one<{ id: number; brand: string; value_cents: number; paid: number; show_title: string }>(
    "SELECT d.id, d.brand, d.value_cents, d.paid, s.title AS show_title FROM deals d JOIN shows s ON s.id = d.show_id WHERE d.id = ?",
    id,
  );
  if (!deal) back("/admin/shows", { error: "Deal not found." });
  const value = fd.has("value") ? cents(fd, "value") : deal.value_cents;
  db.transaction(() => {
    run("UPDATE deals SET status = ?, value_cents = ? WHERE id = ?", status, value, id);
    // Book sponsorship revenue once, when a deal is signed.
    if (!deal.paid && ["signed", "live", "completed"].includes(status) && value > 0) {
      run("UPDATE deals SET paid = 1 WHERE id = ?", id);
      run("INSERT INTO payments (user_id, stream, amount_cents, description) VALUES (NULL, 'sponsorship', ?, ?)", value, `${deal.brand} × ${deal.show_title}`);
    }
  })();
  done(fd, "/admin/shows", `${deal.brand} moved to ${status}.`);
}

// ---- Events -----------------------------------------------------------------

export async function saveEvent(fd: FormData) {
  await requireStaff();
  const id = int(fd, "id", 0);
  const title = str(fd, "title", 160);
  const kind = str(fd, "kind");
  const starts = str(fd, "starts_at", 16);
  const ends = str(fd, "ends_at", 16);
  const from = id ? `/admin/events/${id}` : "/admin/events/new";
  if (!title || !EVENT_KINDS.includes(kind as never)) back(from, { error: "Add a title and type." });
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(starts) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(ends) || ends <= starts) {
    back(from, { error: "Check the start and end times." });
  }
  const fields = [title, kind, str(fd, "description", 4000), starts, ends, Math.max(1, int(fd, "capacity", 40)), cents(fd, "price"), bool(fd, "published") ? 1 : 0];
  if (id) {
    run("UPDATE events SET title=?, kind=?, description=?, starts_at=?, ends_at=?, capacity=?, price_cents=?, published=? WHERE id=?", ...fields, id);
    done(fd, `/admin/events/${id}`, "Event saved.");
  }
  let slug = slugify(title);
  if (one("SELECT 1 FROM events WHERE slug = ?", slug)) slug = `${slug}-${Date.now().toString(36)}`;
  const newId = run(
    "INSERT INTO events (title, kind, description, starts_at, ends_at, capacity, price_cents, published, slug) VALUES (?,?,?,?,?,?,?,?,?)",
    ...fields, slug,
  ).lastInsertRowid;
  done(fd, `/admin/events/${newId}`, "Event created.");
}

// ---- Inquiries --------------------------------------------------------------

export async function setInquiryStatus(fd: FormData) {
  await requireStaff();
  const status = str(fd, "status");
  if (!["new", "contacted", "won", "lost"].includes(status)) back("/admin/inquiries", { error: "Unknown status." });
  run("UPDATE inquiries SET status = ? WHERE id = ?", status, int(fd, "id"));
  done(fd, "/admin/inquiries", "Inquiry updated.");
}

// ---- Settings: plans, rooms, services ------------------------------------------

export async function savePlan(fd: FormData) {
  await requireStaff();
  const id = int(fd, "id", 0);
  const name = str(fd, "name", 80);
  if (!name) back("/admin/settings", { error: "Plan needs a name." });
  const featureList = str(fd, "features", 4000).split("\n").map((f) => f.trim()).filter(Boolean);
  const fields = [
    name, cents(fd, "price"), Math.max(0, int(fd, "hours_per_month", 0)), Math.max(1, int(fd, "booking_window_days", 14)),
    Math.max(0, Math.min(100, int(fd, "production_discount_pct", 0))), str(fd, "description", 400), JSON.stringify(featureList),
    bool(fd, "active") ? 1 : 0,
  ];
  if (id) {
    run("UPDATE plans SET name=?, price_cents=?, hours_per_month=?, booking_window_days=?, production_discount_pct=?, description=?, features=?, active=? WHERE id=?", ...fields, id);
  } else {
    let slug = slugify(name);
    if (one("SELECT 1 FROM plans WHERE slug = ?", slug)) slug = `${slug}-${Date.now().toString(36)}`;
    run(
      "INSERT INTO plans (name, price_cents, hours_per_month, booking_window_days, production_discount_pct, description, features, active, slug, sort) VALUES (?,?,?,?,?,?,?,?,?, (SELECT COALESCE(MAX(sort),0)+1 FROM plans))",
      ...fields, slug,
    );
  }
  done(fd, "/admin/settings", "Plan saved.");
}

export async function saveRoom(fd: FormData) {
  await requireStaff();
  const id = int(fd, "id", 0);
  const name = str(fd, "name", 120);
  if (!name) back("/admin/settings", { error: "Room needs a name." });
  const fields = [name, str(fd, "description", 400), cents(fd, "rate"), Math.max(1, int(fd, "capacity", 1)), bool(fd, "active") ? 1 : 0];
  if (id) run("UPDATE rooms SET name=?, description=?, hourly_rate_cents=?, capacity=?, active=? WHERE id=?", ...fields, id);
  else {
    let slug = slugify(name);
    if (one("SELECT 1 FROM rooms WHERE slug = ?", slug)) slug = `${slug}-${Date.now().toString(36)}`;
    run("INSERT INTO rooms (name, description, hourly_rate_cents, capacity, active, slug) VALUES (?,?,?,?,?,?)", ...fields, slug);
  }
  done(fd, "/admin/settings", "Room saved.");
}

export async function saveService(fd: FormData) {
  await requireStaff();
  const id = int(fd, "id", 0);
  const name = str(fd, "name", 120);
  if (!name) back("/admin/settings", { error: "Service needs a name." });
  const fields = [
    name, str(fd, "category", 60) || "Editing", str(fd, "description", 600), cents(fd, "price"), str(fd, "unit", 40) || "per episode",
    Math.max(1, int(fd, "turnaround_days", 3)), bool(fd, "is_package") ? 1 : 0, bool(fd, "active") ? 1 : 0,
  ];
  if (id) run("UPDATE services SET name=?, category=?, description=?, price_cents=?, unit=?, turnaround_days=?, is_package=?, active=? WHERE id=?", ...fields, id);
  else run("INSERT INTO services (name, category, description, price_cents, unit, turnaround_days, is_package, active, sort) VALUES (?,?,?,?,?,?,?,?, (SELECT COALESCE(MAX(sort),0)+1 FROM services))", ...fields);
  done(fd, "/admin/settings", "Service saved.");
}
