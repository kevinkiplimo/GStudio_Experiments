"use server";

import { db, one, run } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { back, int, safePath, str } from "@/lib/forms";
import { money } from "@/lib/format";

const KINDS = ["sponsorship", "private_event", "production", "general"];

export async function submitInquiry(fd: FormData) {
  const from = safePath(str(fd, "from"), "/contact");
  const kind = KINDS.includes(str(fd, "kind")) ? str(fd, "kind") : "general";
  const name = str(fd, "name", 120);
  const email = str(fd, "email", 200);
  if (!name || !/^\S+@\S+\.\S+$/.test(email)) back(from, { error: "Add your name and a valid email so we can reply." });
  run(
    "INSERT INTO inquiries (kind, name, email, company, message) VALUES (?, ?, ?, ?, ?)",
    kind, name, email, str(fd, "company", 160), str(fd, "message", 4000),
  );

  // Sponsorship inquiries from a show page also open a deal in the sponsor pipeline.
  const showId = int(fd, "show", 0);
  if (kind === "sponsorship" && showId && one("SELECT 1 FROM shows WHERE id = ?", showId)) {
    const pkg = one<{ id: number; price_cents: number }>("SELECT id, price_cents FROM sponsor_packages WHERE id = ? AND show_id = ?", int(fd, "package", 0), showId);
    run(
      "INSERT INTO deals (show_id, package_id, brand, contact_name, contact_email, status, value_cents, notes) VALUES (?, ?, ?, ?, ?, 'lead', ?, ?)",
      showId, pkg?.id ?? null, str(fd, "company", 160) || name, name, email, pkg?.price_cents ?? 0, str(fd, "message", 4000),
    );
  }
  back(from, { ok: "Thanks — we got it. Someone from the studio will reply within one business day." });
}

export async function buyTickets(fd: FormData) {
  const slug = str(fd, "slug", 120);
  const path = `/events/${slug}`;
  const event = one<{ id: number; title: string; capacity: number; price_cents: number; starts_at: string }>(
    "SELECT id, title, capacity, price_cents, starts_at FROM events WHERE slug = ? AND published = 1",
    slug,
  );
  if (!event) back("/events", { error: "Event not found." });
  const user = await getUser();
  const name = str(fd, "name", 120) || user?.name || "";
  const email = str(fd, "email", 200) || user?.email || "";
  const qty = Math.max(1, Math.min(10, int(fd, "qty", 1)));
  if (!name || !/^\S+@\S+\.\S+$/.test(email)) back(path, { error: "Add your name and email for the guest list." });

  const outcome = db.transaction(() => {
    const sold = one<{ n: number }>("SELECT COALESCE(SUM(qty),0) AS n FROM tickets WHERE event_id = ?", event.id)!.n;
    if (sold + qty > event.capacity) return { error: `Only ${Math.max(0, event.capacity - sold)} spots left.` };
    const total = event.price_cents * qty;
    run("INSERT INTO tickets (event_id, user_id, name, email, qty, total_cents) VALUES (?, ?, ?, ?, ?, ?)", event.id, user?.id ?? null, name, email, qty, total);
    if (total > 0) run("INSERT INTO payments (user_id, stream, amount_cents, description) VALUES (?, 'events', ?, ?)", user?.id ?? null, total, `${event.title} × ${qty}`);
    return { total };
  })();

  if ("error" in outcome) back(path, { error: outcome.error! });
  back(path, { ok: `You're on the list! ${qty} ticket${qty > 1 ? "s" : ""}${outcome.total ? ` · ${money(outcome.total)}` : ""}. Confirmation sent to ${email}.` });
}
