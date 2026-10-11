import Link from "next/link";
import { OrderSteps } from "@/components/order-steps";
import { Empty, Flash, PageHeader, StatusChip } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { fmtDate, money } from "@/lib/format";
import { deliverablesFor, itemsFor, ordersWhere } from "@/lib/portal";

export default async function ProductionOrders({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const orders = ordersWhere("WHERE o.user_id = ? ORDER BY o.created_at DESC", user.id);
  const ids = orders.map((o) => o.id);
  const items = itemsFor(ids);
  const files = deliverablesFor(ids);

  return (
    <>
      <PageHeader
        eyebrow="Production"
        title="From raw recording to content library"
        description="Track every order through editing and review, then download your finished files here."
        actions={<Link href="/app/production/new" className="btn-primary">New order</Link>}
      />
      <Flash ok={sp.ok} />
      {orders.length === 0 && <Empty>No orders yet. After your next session, order an edit, clips and thumbnails in one go.</Empty>}
      <div className="grid gap-5 lg:grid-cols-2">
        {orders.map((o) => (
          <article key={o.id} className="card flex flex-col p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm">#{o.id}</span>
                <StatusChip status={o.status} />
              </div>
              <span className="font-mono text-[11px] text-muted">
                {o.session_start ? `SESSION ${fmtDate(o.session_start).toUpperCase()} · ` : ""}
                {o.due_date ? `DUE ${fmtDate(o.due_date).toUpperCase()}` : ""}
              </span>
            </div>
            {o.status !== "cancelled" && <div className="mt-5"><OrderSteps status={o.status} /></div>}
            <ul className="mt-5 divide-y divide-line text-sm">
              {(items.get(o.id) ?? []).map((i) => (
                <li key={i.id} className="flex justify-between py-2">
                  <span>{i.qty > 1 ? `${i.qty} × ` : ""}{i.name}</span>
                  <span className="font-mono text-xs text-muted">{money(i.unit_price_cents * i.qty)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex justify-between border-t border-line pt-3 text-sm">
              <span className="text-muted">{o.discount_cents ? `Member discount −${money(o.discount_cents)}` : "Total"}</span>
              <span className="font-mono font-semibold">{money(o.total_cents)}</span>
            </div>
            {o.notes && <p className="mt-3 rounded-lg bg-well p-3 text-xs text-muted">“{o.notes}”</p>}
            {(files.get(o.id) ?? []).length > 0 && (
              <div className="mt-5">
                <p className="eyebrow mb-2 text-ok">Deliverables</p>
                <ul className="space-y-2">
                  {files.get(o.id)!.map((f) => (
                    <li key={f.id}>
                      <a href={f.url} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-lg border border-line bg-well px-3 py-2 text-sm hover:border-ok/50">
                        {f.title}
                        <span className="font-mono text-[10px] uppercase tracking-widest text-ok">Download ↗</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </article>
        ))}
      </div>
    </>
  );
}
