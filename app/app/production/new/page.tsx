import { placeOrder } from "@/app/actions/member";
import { Flash, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { fmtDate, fmtTime, money } from "@/lib/format";
import { userBookings } from "@/lib/portal";
import { membershipFor, services } from "@/lib/studio";
import { addDays, nowLocal } from "@/lib/time";

export default async function NewOrder({ searchParams }: { searchParams: Promise<{ booking?: string; error?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const list = services();
  const m = membershipFor(user.id);
  const pct = m?.status === "active" ? m.production_discount_pct : 0;
  const recent = userBookings(user.id, "AND b.status IN ('completed','confirmed') AND b.starts_at > ? ORDER BY b.starts_at DESC LIMIT 12", addDays(nowLocal(), -60));

  return (
    <>
      <PageHeader
        eyebrow="New production order"
        title="Package the whole thing"
        description={pct ? `Your ${m!.plan_name} membership saves ${pct}% on this order.` : "Members save up to 20% on production."}
      />
      <Flash error={sp.error} />
      <form action={placeOrder} className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-3">
          {list.map((s) => (
            <div key={s.id} className={`card flex flex-wrap items-center gap-4 p-5 ${s.is_package ? "border-amber/40" : ""}`}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{s.name}</p>
                  {s.is_package ? <span className="chip border-amber/40 text-amber">Package</span> : <span className="chip">{s.category}</span>}
                </div>
                <p className="mt-1 text-sm text-muted">{s.description}</p>
                <p className="mt-1 font-mono text-[11px] text-dim">{s.turnaround_days}-day turnaround · {s.unit}</p>
              </div>
              <p className="font-mono text-sm">{money(s.price_cents)}</p>
              <div className="w-20">
                <label className="sr-only" htmlFor={`qty_${s.id}`}>Quantity of {s.name}</label>
                <input id={`qty_${s.id}`} name={`qty_${s.id}`} type="number" min={0} max={20} defaultValue={0} className="input text-center" />
              </div>
            </div>
          ))}
        </div>
        <aside className="card h-fit space-y-5 p-6 lg:sticky lg:top-36">
          <div>
            <label className="label" htmlFor="booking">Which session?</label>
            <select id="booking" name="booking" className="input" defaultValue={sp.booking ?? ""}>
              <option value="">Recorded elsewhere / not linked</option>
              {recent.map((b) => (
                <option key={b.id} value={b.id}>{fmtDate(b.starts_at)} {fmtTime(b.starts_at)} — {b.room_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="notes">Notes for the editors</label>
            <textarea id="notes" name="notes" rows={5} className="input" placeholder="Timestamps to cut, clip ideas, brand guidelines, links to raw files…" />
          </div>
          <button className="btn-primary w-full">Place order</button>
          <p className="text-xs text-dim">You&apos;ll see the total with your member discount on the next screen. Payments are simulated in this build.</p>
        </aside>
      </form>
    </>
  );
}
