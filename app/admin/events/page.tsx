import Link from "next/link";
import { Flash, Meter, PageHeader } from "@/components/ui";
import { fmtDateTime, money, titleCase } from "@/lib/format";
import { eventsWithSales } from "@/lib/studio";
import { nowLocal } from "@/lib/time";

export default async function AdminEvents({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const sp = await searchParams;
  const now = nowLocal();
  const all = eventsWithSales();
  const upcoming = all.filter((e) => e.ends_at > now).reverse();
  const past = all.filter((e) => e.ends_at <= now);
  const Row = ({ e }: { e: (typeof all)[number] }) => (
    <tr>
      <td>
        <Link href={`/admin/events/${e.id}`} className="font-medium hover:text-coral-soft">{e.title}</Link>
        {!e.published && <span className="chip ml-2">Draft</span>}
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted">{titleCase(e.kind)}</p>
      </td>
      <td className="whitespace-nowrap font-mono text-xs">{fmtDateTime(e.starts_at)}</td>
      <td className="w-48">
        <div className="mb-1 flex justify-between font-mono text-[10px] text-muted"><span>{e.sold} sold</span><span>{e.capacity}</span></div>
        <Meter value={e.sold} max={e.capacity} tone="amber" />
      </td>
      <td className="text-right font-mono">{money(e.sold * e.price_cents)}</td>
    </tr>
  );
  return (
    <>
      <PageHeader eyebrow="Events" title="Experiences" description="Mixers, live recordings, workshops and brand events." actions={<Link href="/admin/events/new" className="btn-primary">New event</Link>} />
      <Flash ok={sp.ok} />
      <h2 className="mb-3 text-lg font-semibold">Upcoming</h2>
      <div className="card overflow-x-auto">
        <table className="data-table">
          <thead><tr><th>Event</th><th>When</th><th>Tickets</th><th className="text-right">Revenue</th></tr></thead>
          <tbody>{upcoming.map((e) => <Row key={e.id} e={e} />)}</tbody>
        </table>
      </div>
      {past.length > 0 && (
        <>
          <h2 className="mb-3 mt-10 text-lg font-semibold">Past</h2>
          <div className="card overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Event</th><th>When</th><th>Tickets</th><th className="text-right">Revenue</th></tr></thead>
              <tbody>{past.map((e) => <Row key={e.id} e={e} />)}</tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
