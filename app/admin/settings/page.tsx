import { savePlan, saveRoom, saveService } from "@/app/actions/admin";
import { Flash, PageHeader } from "@/components/ui";
import { features, plans, rooms, services, type Plan, type Room, type Service } from "@/lib/studio";

const dollars = (c: number) => (c / 100).toFixed(c % 100 ? 2 : 0);

function PlanForm({ p }: { p?: Plan }) {
  return (
    <form action={savePlan} className={`card grid gap-3 p-5 ${p ? "" : "border-dashed"}`}>
      {p && <input type="hidden" name="id" value={p.id} />}
      <input type="hidden" name="from" value="/admin/settings" />
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="label">Plan name</label>
          <input name="name" defaultValue={p?.name} placeholder="New plan" className="input" required />
        </div>
        <div>
          <label className="label">Price / mo ($)</label>
          <input name="price" defaultValue={p ? dollars(p.price_cents) : ""} inputMode="decimal" className="input" />
        </div>
        <div>
          <label className="label">Hours / mo</label>
          <input name="hours_per_month" type="number" min={0} defaultValue={p?.hours_per_month ?? 4} className="input" />
        </div>
        <div>
          <label className="label">Booking window (days)</label>
          <input name="booking_window_days" type="number" min={1} defaultValue={p?.booking_window_days ?? 14} className="input" />
        </div>
        <div>
          <label className="label">Production discount %</label>
          <input name="production_discount_pct" type="number" min={0} max={100} defaultValue={p?.production_discount_pct ?? 0} className="input" />
        </div>
      </div>
      <div>
        <label className="label">Short description</label>
        <input name="description" defaultValue={p?.description} className="input" />
      </div>
      <div>
        <label className="label">Features (one per line)</label>
        <textarea name="features" rows={4} defaultValue={p ? features(p).join("\n") : ""} className="input" />
      </div>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" name="active" defaultChecked={p ? !!p.active : true} className="check" /> Offered for sale
        </label>
        <button className={`btn-sm ${p ? "btn-secondary" : "btn-primary"}`}>{p ? "Save" : "Add plan"}</button>
      </div>
    </form>
  );
}

function RoomRow({ r }: { r?: Room }) {
  return (
    <form action={saveRoom} className="grid items-end gap-3 border-b border-line py-4 last:border-b-0 md:grid-cols-[1.2fr_2fr_110px_90px_auto_auto]">
      {r && <input type="hidden" name="id" value={r.id} />}
      <input type="hidden" name="from" value="/admin/settings" />
      <div><label className="label">Room</label><input name="name" defaultValue={r?.name} placeholder="New room" className="input" required /></div>
      <div><label className="label">Description</label><input name="description" defaultValue={r?.description} className="input" /></div>
      <div><label className="label">$/hour</label><input name="rate" defaultValue={r ? dollars(r.hourly_rate_cents) : ""} inputMode="decimal" className="input" /></div>
      <div><label className="label">Seats</label><input name="capacity" type="number" min={1} defaultValue={r?.capacity ?? 2} className="input" /></div>
      <label className="flex items-center gap-2 pb-2.5 text-sm text-muted"><input type="checkbox" name="active" defaultChecked={r ? !!r.active : true} className="check" /> Bookable</label>
      <button className={`btn-sm mb-1 ${r ? "btn-secondary" : "btn-primary"}`}>{r ? "Save" : "Add"}</button>
    </form>
  );
}

function ServiceRow({ s }: { s?: Service }) {
  return (
    <form action={saveService} className="grid items-end gap-3 border-b border-line py-4 last:border-b-0 md:grid-cols-6">
      {s && <input type="hidden" name="id" value={s.id} />}
      <input type="hidden" name="from" value="/admin/settings" />
      <div className="md:col-span-2"><label className="label">Service</label><input name="name" defaultValue={s?.name} placeholder="New service" className="input" required /></div>
      <div><label className="label">Category</label><input name="category" defaultValue={s?.category ?? "Editing"} className="input" /></div>
      <div><label className="label">Price ($)</label><input name="price" defaultValue={s ? dollars(s.price_cents) : ""} inputMode="decimal" className="input" /></div>
      <div><label className="label">Unit</label><input name="unit" defaultValue={s?.unit ?? "per episode"} className="input" /></div>
      <div><label className="label">Turnaround (days)</label><input name="turnaround_days" type="number" min={1} defaultValue={s?.turnaround_days ?? 3} className="input" /></div>
      <div className="md:col-span-4"><label className="label">Description</label><input name="description" defaultValue={s?.description} className="input" /></div>
      <div className="flex flex-wrap items-center gap-4 pb-2 md:col-span-2 md:justify-end">
        <label className="flex items-center gap-2 text-sm text-muted"><input type="checkbox" name="is_package" defaultChecked={!!s?.is_package} className="check" /> Package</label>
        <label className="flex items-center gap-2 text-sm text-muted"><input type="checkbox" name="active" defaultChecked={s ? !!s.active : true} className="check" /> Active</label>
        <button className={`btn-sm ${s ? "btn-secondary" : "btn-primary"}`}>{s ? "Save" : "Add"}</button>
      </div>
    </form>
  );
}

export default async function Settings({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  return (
    <>
      <PageHeader eyebrow="Settings" title="Catalog" description="Membership plans, rooms and the production menu shown on the website and in the portal." />
      <Flash ok={sp.ok} error={sp.error} />

      <h2 className="mb-4 text-xl font-semibold">Membership plans</h2>
      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
        {plans(true).map((p) => <PlanForm key={p.id} p={p} />)}
        <PlanForm />
      </div>

      <h2 className="mb-2 mt-12 text-xl font-semibold">Rooms</h2>
      <div className="card px-5">
        {rooms(true).map((r) => <RoomRow key={r.id} r={r} />)}
        <RoomRow />
      </div>

      <h2 className="mb-2 mt-12 text-xl font-semibold">Production services</h2>
      <div className="card px-5">
        {services(true).map((s) => <ServiceRow key={s.id} s={s} />)}
        <ServiceRow />
      </div>
    </>
  );
}
