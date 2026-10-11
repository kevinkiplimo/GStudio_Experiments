import { notFound } from "next/navigation";
import { buyTickets } from "@/app/actions/public";
import { Flash, Meter } from "@/components/ui";
import { getUser } from "@/lib/auth";
import { one } from "@/lib/db";
import { fmtDateLong, fmtTime, money, titleCase } from "@/lib/format";
import type { EventWithSales } from "@/lib/studio";
import { nowLocal } from "@/lib/time";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ ok?: string; error?: string }> };

const getEvent = (slug: string) =>
  one<EventWithSales>(
    `SELECT e.*, COALESCE((SELECT SUM(qty) FROM tickets t WHERE t.event_id = e.id), 0) AS sold
     FROM events e WHERE slug = ? AND published = 1`,
    slug,
  );

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return { title: getEvent(slug)?.title ?? "Event" };
}

export default async function EventPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const e = getEvent(slug);
  if (!e) notFound();
  const user = await getUser();
  const left = Math.max(0, e.capacity - e.sold);
  const past = e.ends_at < nowLocal();

  return (
    <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-8 lg:grid-cols-[1.4fr_1fr]">
      <div>
        <p className="eyebrow text-ok">{titleCase(e.kind)}</p>
        <h1 className="mt-3 text-5xl font-extrabold">{e.title}</h1>
        <p className="mt-4 font-mono text-sm uppercase tracking-[0.08em] text-muted">
          {fmtDateLong(e.starts_at)} · {fmtTime(e.starts_at)}–{fmtTime(e.ends_at)}
        </p>
        <p className="mt-8 text-lg">{e.description}</p>
        <div className="mt-10 max-w-md">
          <div className="mb-2 flex justify-between font-mono text-[11px] uppercase tracking-widest text-muted">
            <span>{e.sold} going</span>
            <span>{left} of {e.capacity} left</span>
          </div>
          <Meter value={e.sold} max={e.capacity} tone={left < 10 ? "coral" : "amber"} />
        </div>
      </div>

      <div className="card h-fit p-6 lg:sticky lg:top-24">
        <Flash ok={sp.ok} error={sp.error} />
        <p className="eyebrow">Tickets</p>
        <p className="mt-2 font-display text-4xl font-bold">{e.price_cents ? money(e.price_cents) : "Free"}</p>
        {past ? (
          <p className="mt-4 text-muted">This event has already happened.</p>
        ) : left === 0 ? (
          <p className="mt-4 text-coral-soft">Sold out.</p>
        ) : (
          <form action={buyTickets} className="mt-6 grid gap-4">
            <input type="hidden" name="slug" value={e.slug} />
            <div>
              <label className="label" htmlFor="name">Name</label>
              <input id="name" name="name" required defaultValue={user?.name} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input id="email" name="email" type="email" required defaultValue={user?.email} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="qty">Tickets</label>
              <select id="qty" name="qty" className="input" defaultValue="1">
                {Array.from({ length: Math.min(10, left) }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n} {e.price_cents ? `· ${money(n * e.price_cents)}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn-primary">{e.price_cents ? "Get tickets" : "RSVP"}</button>
            <p className="text-xs text-dim">Payments are simulated in this build — plug in Stripe Checkout to go live.</p>
          </form>
        )}
      </div>
    </div>
  );
}
