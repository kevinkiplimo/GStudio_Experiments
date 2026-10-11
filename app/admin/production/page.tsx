import Link from "next/link";
import { addDeliverable, updateOrder } from "@/app/actions/admin";
import { Flash, PageHeader, StatusChip } from "@/components/ui";
import { all } from "@/lib/db";
import { fmtDate, fmtDateTime, money, titleCase } from "@/lib/format";
import { deliverablesFor, itemsFor, ordersWhere } from "@/lib/portal";
import { ORDER_STATUSES } from "@/lib/studio";
import { addDays, todayDate } from "@/lib/time";

type SP = { order?: string; assignee?: string; due?: string; q?: string; ok?: string; error?: string };

const COLUMN_TONE: Record<string, string> = {
  requested: "bg-violet",
  in_progress: "bg-amber",
  review: "bg-coral",
  delivered: "bg-ok",
};

export default async function ProductionBoard({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const today = todayDate();
  const weekEnd = addDays(`${today}T00:00`, 7).slice(0, 10);
  const where: string[] = ["o.status != 'cancelled'", "(o.status != 'delivered' OR o.created_at >= ?)"];
  const params: unknown[] = [addDays(`${today}T00:00`, -21).replace("T", " ")];
  if (sp.assignee === "none") where.push("o.assignee_id IS NULL");
  else if (sp.assignee) { where.push("o.assignee_id = ?"); params.push(Number(sp.assignee)); }
  if (sp.due === "week") { where.push("o.due_date <= ? AND o.status != 'delivered'"); params.push(weekEnd); }
  if (sp.q) { where.push("(u.name LIKE ? OR CAST(o.id AS TEXT) = ?)"); params.push(`%${sp.q}%`, sp.q.replace("#", "")); }
  const orders = ordersWhere(`WHERE ${where.join(" AND ")} ORDER BY o.due_date, o.id`, ...params);
  const items = itemsFor(orders.map((o) => o.id));
  const staff = all<{ id: number; name: string }>("SELECT id, name FROM users WHERE role IN ('admin','staff') ORDER BY name");

  const selected = sp.order ? ordersWhere("WHERE o.id = ?", Number(sp.order))[0] : undefined;
  const selItems = selected ? itemsFor([selected.id]).get(selected.id) ?? [] : [];
  const selFiles = selected ? deliverablesFor([selected.id]).get(selected.id) ?? [] : [];
  const qs = new URLSearchParams(Object.entries({ assignee: sp.assignee, due: sp.due, q: sp.q }).filter(([, v]) => v) as [string, string][]);
  const link = (orderId?: number) => {
    const p = new URLSearchParams(qs);
    if (orderId) p.set("order", String(orderId));
    const s = p.toString();
    return `/admin/production${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <PageHeader eyebrow="Production" title="Pipeline" description="Every order from request to delivered files." />
      <Flash ok={sp.ok} error={sp.error} />

      <form className="mb-6 flex flex-wrap gap-2" action="/admin/production">
        <input name="q" defaultValue={sp.q} placeholder="Client or #order" className="input max-w-[200px] py-1.5" aria-label="Search" />
        <select name="assignee" defaultValue={sp.assignee ?? ""} className="input w-auto py-1.5" aria-label="Assignee">
          <option value="">Everyone</option>
          <option value="none">Unassigned</option>
          {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select name="due" defaultValue={sp.due ?? ""} className="input w-auto py-1.5" aria-label="Due">
          <option value="">Any due date</option>
          <option value="week">Due within 7 days</option>
        </select>
        <button className="btn-secondary btn-sm">Filter</button>
        {qs.toString() && <Link href="/admin/production" className="btn-ghost">Clear</Link>}
      </form>

      <div className={`grid gap-6 ${selected ? "xl:grid-cols-[1fr_400px]" : ""}`}>
        <div className={`grid min-w-0 gap-4 md:grid-cols-2 ${selected ? "2xl:grid-cols-4" : "xl:grid-cols-4"}`}>
          {ORDER_STATUSES.map((status) => {
            const col = orders.filter((o) => o.status === status);
            return (
              <section key={status} className="min-w-0 rounded-2xl border border-line bg-panel/60 p-3">
                <header className="mb-3 flex items-center justify-between px-1">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <span className={`size-2 rounded-full ${COLUMN_TONE[status]}`} />
                    {titleCase(status)}
                  </span>
                  <span className="font-mono text-xs text-muted">{col.length}</span>
                </header>
                <div className="space-y-3">
                  {col.map((o) => {
                    const overdue = o.status !== "delivered" && o.due_date && o.due_date < today;
                    return (
                      <Link
                        key={o.id}
                        href={link(o.id)}
                        scroll={false}
                        className={`card block p-3.5 transition hover:border-coral/40 ${selected?.id === o.id ? "border-coral" : ""}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[11px] text-muted">#{o.id}</span>
                          {o.due_date && (
                            <span className={`font-mono text-[10px] uppercase ${overdue ? "text-coral" : "text-muted"}`}>
                              {overdue ? "Overdue · " : "Due "}{fmtDate(o.due_date)}
                            </span>
                          )}
                        </div>
                        <p className="mt-2 font-medium">{o.client_name}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-muted">{(items.get(o.id) ?? []).map((i) => i.name).join(" · ")}</p>
                        <div className="mt-3 flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-xs text-muted">
                            <span className="grid size-5 place-items-center rounded-full bg-raised font-mono text-[9px] text-coral-soft">
                              {o.assignee_name ? o.assignee_name.split(" ").map((p) => p[0]).join("") : "?"}
                            </span>
                            {o.assignee_name?.split(" ")[0] ?? "Unassigned"}
                          </span>
                          <span className="font-mono text-xs">{money(o.total_cents)}</span>
                        </div>
                      </Link>
                    );
                  })}
                  {col.length === 0 && <p className="px-1 py-6 text-center text-xs text-dim">Empty</p>}
                </div>
              </section>
            );
          })}
        </div>

        {selected && (
          <aside className="card h-fit p-6 xl:sticky xl:top-8">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-xs text-muted">ORDER #{selected.id}</p>
                <h2 className="mt-1 text-2xl font-bold">{selected.client_name}</h2>
                <p className="mt-1 text-xs text-muted">
                  Placed {fmtDate(selected.created_at)}
                  {selected.session_start ? ` · session ${fmtDateTime(selected.session_start)}` : ""}
                </p>
              </div>
              <Link href={link()} scroll={false} className="btn-ghost" aria-label="Close">✕</Link>
            </div>
            <div className="mt-3"><StatusChip status={selected.status} /></div>

            <ul className="mt-5 divide-y divide-line text-sm">
              {selItems.map((i) => (
                <li key={i.id} className="flex justify-between py-2">
                  <span>{i.qty > 1 ? `${i.qty} × ` : ""}{i.name}</span>
                  <span className="font-mono text-xs text-muted">{money(i.unit_price_cents * i.qty)}</span>
                </li>
              ))}
              <li className="flex justify-between py-2 font-mono text-sm">
                <span>Total{selected.discount_cents ? ` (−${money(selected.discount_cents)} member)` : ""}</span>
                <span>{money(selected.total_cents)}</span>
              </li>
            </ul>
            {selected.notes && <p className="mt-3 rounded-lg bg-well p-3 text-sm text-muted">“{selected.notes}”</p>}

            <p className="eyebrow mb-2 mt-6">Move to</p>
            <div className="flex flex-wrap gap-2">
              {ORDER_STATUSES.filter((s) => s !== selected.status).map((s) => (
                <form key={s} action={updateOrder}>
                  <input type="hidden" name="id" value={selected.id} />
                  <input type="hidden" name="status" value={s} />
                  <input type="hidden" name="from" value={link(selected.id)} />
                  <button className="btn-secondary btn-sm">{titleCase(s)}</button>
                </form>
              ))}
            </div>

            <form action={updateOrder} className="mt-6 grid grid-cols-2 gap-3">
              <input type="hidden" name="id" value={selected.id} />
              <input type="hidden" name="from" value={link(selected.id)} />
              <div>
                <label className="label" htmlFor="assignee">Editor</label>
                <select id="assignee" name="assignee" defaultValue={selected.assignee_id ?? ""} className="input">
                  <option value="">Unassigned</option>
                  {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="due_date">Due</label>
                <input id="due_date" name="due_date" type="date" defaultValue={selected.due_date ?? ""} className="input" />
              </div>
              <button className="btn-secondary btn-sm col-span-2 justify-self-start">Save</button>
            </form>

            <div className="mt-6 border-t border-line pt-5">
              <p className="eyebrow mb-3">Deliverables</p>
              {selFiles.length > 0 && (
                <ul className="mb-4 space-y-2">
                  {selFiles.map((f) => (
                    <li key={f.id}>
                      <a href={f.url} target="_blank" rel="noreferrer" className="flex justify-between rounded-lg border border-line bg-well px-3 py-2 text-sm hover:border-ok/50">
                        {f.title} <span className="font-mono text-[10px] uppercase text-ok">{f.kind} ↗</span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
              <form action={addDeliverable} className="grid gap-3">
                <input type="hidden" name="order" value={selected.id} />
                <input type="hidden" name="from" value={link(selected.id)} />
                <input name="title" placeholder="e.g. Final episode master" className="input" aria-label="Deliverable title" required />
                <input name="url" type="url" placeholder="https://drive…/file" className="input" aria-label="Deliverable link" required />
                <div className="flex flex-wrap items-center gap-3">
                  <select name="kind" className="input w-auto py-1.5" aria-label="Kind">
                    {["video", "audio", "clips", "image", "file"].map((k) => <option key={k}>{k}</option>)}
                  </select>
                  <label className="flex items-center gap-2 text-sm text-muted">
                    <input type="checkbox" name="mark_delivered" className="check" /> Mark delivered
                  </label>
                  <button className="btn-primary btn-sm ml-auto">Add</button>
                </div>
              </form>
            </div>
          </aside>
        )}
      </div>
    </>
  );
}
