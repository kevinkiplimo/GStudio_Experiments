import Link from "next/link";
import { OrderSteps } from "@/components/order-steps";
import { Empty, Flash, Meter, Section, StatusChip } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { all } from "@/lib/db";
import { fmtDate, fmtDateTime, fmtTime, hours, money } from "@/lib/format";
import { itemsFor, ordersWhere, userBookings } from "@/lib/portal";
import { bookingWindowDays, hoursUsed, membershipFor } from "@/lib/studio";
import { hoursBetween, nextMonthStart, nowLocal } from "@/lib/time";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const now = nowLocal();
  const m = membershipFor(user.id);
  const used = hoursUsed(user.id);
  const upcoming = userBookings(user.id, "AND b.status = 'confirmed' AND b.starts_at > ? ORDER BY b.starts_at LIMIT 5", now);
  const orders = ordersWhere("WHERE o.user_id = ? AND o.status != 'cancelled' ORDER BY o.status = 'delivered', o.created_at DESC LIMIT 4", user.id);
  const items = itemsFor(orders.map((o) => o.id));
  const tickets = all<{ title: string; slug: string; starts_at: string; qty: number }>(
    `SELECT e.title, e.slug, e.starts_at, SUM(t.qty) AS qty FROM tickets t JOIN events e ON e.id = t.event_id
     WHERE (t.user_id = ? OR t.email = ?) AND e.starts_at > ? GROUP BY e.id ORDER BY e.starts_at LIMIT 3`,
    user.id, user.email, now,
  );
  const first = user.name.split(" ")[0];

  return (
    <>
      <Flash ok={sp.ok} />
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Dashboard</p>
          <h1 className="text-4xl font-bold">Welcome back, {first}</h1>
        </div>
        <Link href="/app/book" className="btn-primary">Book a session</Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Membership telemetry */}
        <section className="card relative overflow-hidden p-6 lg:col-span-2">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(255,51,102,0.18), transparent 70%)" }}
          />
          {m ? (
            <div className="relative grid gap-8 sm:grid-cols-[1fr_auto]">
              <div>
                <div className="flex items-center gap-3">
                  <p className="eyebrow">{m.plan_name} plan</p>
                  <StatusChip status={m.status} />
                </div>
                <p className="mt-2 font-mono text-xs text-muted">
                  {money(m.price_cents)}/mo · hours reset {fmtDate(nextMonthStart(now))}
                </p>
                <p className="mt-8 font-display text-5xl font-bold">
                  {hours(used)} <span className="text-2xl text-muted">of {m.hours_per_month}h</span>
                </p>
                <p className="mb-3 mt-1 text-sm text-muted">studio hours used this month</p>
                <Meter value={used} max={m.hours_per_month} tone={used >= m.hours_per_month ? "amber" : "coral"} />
              </div>
              <dl className="grid content-start gap-3 sm:w-48">
                <div className="rounded-xl border border-line bg-well p-3">
                  <dt className="eyebrow">Booking window</dt>
                  <dd className="mt-1 font-display text-xl font-bold">{bookingWindowDays(user.id)} days</dd>
                </div>
                <div className="rounded-xl border border-line bg-well p-3">
                  <dt className="eyebrow">Production</dt>
                  <dd className="mt-1 font-display text-xl font-bold">{m.production_discount_pct}% off</dd>
                </div>
              </dl>
            </div>
          ) : (
            <div className="relative">
              <p className="eyebrow">No membership</p>
              <h2 className="mt-3 text-2xl font-bold">Lock in your recording rhythm</h2>
              <p className="mt-2 max-w-lg text-muted">
                Members get monthly hours, priority booking up to 60 days out, recurring weekly sessions and up to 20% off production.
              </p>
              <Link href="/app/membership" className="btn-primary mt-6">Choose a plan</Link>
            </div>
          )}
        </section>

        <Section title="Your tickets" action={<Link href="/events" className="btn-ghost">Events →</Link>}>
          {tickets.length ? (
            <ul className="space-y-3">
              {tickets.map((t) => (
                <li key={t.slug}>
                  <Link href={`/events/${t.slug}`} className="block rounded-xl border border-line bg-well p-3 hover:border-coral/40">
                    <p className="font-medium">{t.title}</p>
                    <p className="mt-1 font-mono text-[11px] text-muted">{fmtDateTime(t.starts_at)} · {t.qty} ticket{t.qty > 1 ? "s" : ""}</p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No upcoming events. <Link href="/events" className="text-coral-soft">See what&apos;s on</Link></Empty>
          )}
        </Section>

        <div className="lg:col-span-2">
          <Section title="Upcoming sessions" action={<Link href="/app/sessions" className="btn-ghost">All sessions →</Link>}>
            {upcoming.length ? (
              <ul className="divide-y divide-line">
                {upcoming.map((b) => (
                  <li key={b.id} className="flex flex-wrap items-center gap-4 py-3">
                    <div className="w-28 font-mono text-xs">
                      <p className="text-amber">{fmtDate(b.starts_at)}</p>
                      <p className="text-muted">{fmtTime(b.starts_at)}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{b.room_name}</p>
                      <p className="text-xs text-muted">{hours(hoursBetween(b.starts_at, b.ends_at))}{b.notes ? ` · ${b.notes}` : ""}</p>
                    </div>
                    {b.series_id && <span className="chip">Recurring weekly</span>}
                    <span className={`chip ${b.uses_membership ? "border-ok/40 text-ok" : "border-amber/40 text-amber"}`}>
                      {b.uses_membership ? "Membership" : money(b.price_cents)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>Nothing booked yet. <Link href="/app/book" className="text-coral-soft">Book your next session</Link></Empty>
            )}
          </Section>
        </div>

        <Section title="Production" action={<Link href="/app/production/new" className="btn-ghost">New order →</Link>}>
          {orders.length ? (
            <ul className="space-y-4">
              {orders.map((o) => (
                <li key={o.id}>
                  <Link href="/app/production" className="block rounded-xl border border-line bg-well p-3 hover:border-coral/40">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="font-mono text-xs">#{o.id}</span>
                      {o.due_date && <span className="font-mono text-[10px] text-muted">DUE {fmtDate(o.due_date)}</span>}
                    </div>
                    <p className="mb-3 line-clamp-1 text-sm">{(items.get(o.id) ?? []).map((i) => i.name).join(", ")}</p>
                    <OrderSteps status={o.status} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No orders yet.</Empty>
          )}
        </Section>
      </div>
    </>
  );
}
