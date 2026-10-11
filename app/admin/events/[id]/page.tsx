import Link from "next/link";
import { notFound } from "next/navigation";
import { saveEvent } from "@/app/actions/admin";
import { Flash, PageHeader } from "@/components/ui";
import { all, one } from "@/lib/db";
import { fmtDate, money, titleCase } from "@/lib/format";
import { EVENT_KINDS, type EventWithSales } from "@/lib/studio";
import { addDays, todayDate } from "@/lib/time";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> };

export default async function EditEvent({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const isNew = id === "new";
  const e = isNew ? undefined : one<EventWithSales>("SELECT *, 0 AS sold FROM events WHERE id = ?", Number(id));
  if (!isNew && !e) notFound();
  const tickets = e
    ? all<{ id: number; name: string; email: string; qty: number; total_cents: number; created_at: string }>(
        "SELECT * FROM tickets WHERE event_id = ? ORDER BY created_at DESC",
        e.id,
      )
    : [];
  const sold = tickets.reduce((s, t) => s + t.qty, 0);
  const defaultStart = addDays(`${todayDate()}T19:00`, 14);

  return (
    <>
      <PageHeader
        eyebrow="Events"
        title={e?.title ?? "New event"}
        description={e ? `${sold} of ${e.capacity} tickets · ${money(tickets.reduce((s, t) => s + t.total_cents, 0))} revenue` : undefined}
        actions={e && e.published ? <Link href={`/events/${e.slug}`} target="_blank" className="btn-secondary">View public page ↗</Link> : null}
      />
      <Flash ok={sp.ok} error={sp.error} />
      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <form action={saveEvent} className="card grid h-fit gap-4 p-6 sm:grid-cols-2">
          {e && <input type="hidden" name="id" value={e.id} />}
          <input type="hidden" name="from" value={e ? `/admin/events/${e.id}` : "/admin/events/new"} />
          <div className="sm:col-span-2">
            <label className="label" htmlFor="title">Title</label>
            <input id="title" name="title" defaultValue={e?.title} className="input" required />
          </div>
          <div>
            <label className="label" htmlFor="kind">Type</label>
            <select id="kind" name="kind" defaultValue={e?.kind ?? "mixer"} className="input">
              {EVENT_KINDS.map((k) => <option key={k} value={k}>{titleCase(k)}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="capacity">Capacity</label>
            <input id="capacity" name="capacity" type="number" min={1} defaultValue={e?.capacity ?? 40} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="starts_at">Starts</label>
            <input id="starts_at" name="starts_at" type="datetime-local" defaultValue={e?.starts_at ?? defaultStart} className="input" required />
          </div>
          <div>
            <label className="label" htmlFor="ends_at">Ends</label>
            <input id="ends_at" name="ends_at" type="datetime-local" defaultValue={e?.ends_at ?? defaultStart.replace("T19", "T22")} className="input" required />
          </div>
          <div>
            <label className="label" htmlFor="price">Ticket price ($, 0 = free)</label>
            <input id="price" name="price" inputMode="decimal" defaultValue={e ? (e.price_cents / 100).toFixed(2) : "25"} className="input" />
          </div>
          <label className="flex items-center gap-2 self-end pb-2.5 text-sm">
            <input type="checkbox" name="published" defaultChecked={e ? !!e.published : true} className="check" /> Published on the website
          </label>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="description">Description</label>
            <textarea id="description" name="description" rows={4} defaultValue={e?.description} className="input" />
          </div>
          <button className="btn-primary justify-self-start">{e ? "Save event" : "Create event"}</button>
        </form>

        {e && (
          <section className="card overflow-x-auto">
            <h2 className="px-6 pt-6 text-lg font-semibold">Guest list</h2>
            <table className="data-table mt-3">
              <thead><tr><th>Name</th><th>Qty</th><th>Bought</th><th className="text-right">Paid</th></tr></thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t.id}>
                    <td>{t.name}<p className="text-xs text-muted">{t.email}</p></td>
                    <td className="font-mono">{t.qty}</td>
                    <td className="font-mono text-xs">{fmtDate(t.created_at)}</td>
                    <td className="text-right font-mono">{money(t.total_cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {tickets.length === 0 && <p className="px-6 pb-6 text-sm text-muted">No tickets yet.</p>}
          </section>
        )}
      </div>
    </>
  );
}
