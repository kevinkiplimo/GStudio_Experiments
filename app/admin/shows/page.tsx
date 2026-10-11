import Link from "next/link";
import { saveDeal } from "@/app/actions/admin";
import { Flash, PageHeader, StatusChip } from "@/components/ui";
import { all } from "@/lib/db";
import { fmtDate, money, titleCase } from "@/lib/format";
import { DEAL_STATUSES, shows } from "@/lib/studio";

export default async function AdminShows({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const list = shows();
  const deals = all<{
    id: number; show_id: number; show_title: string; brand: string; contact_name: string; contact_email: string;
    status: string; value_cents: number; package_name: string | null; created_at: string;
  }>(
    `SELECT d.*, s.title AS show_title, p.name AS package_name FROM deals d JOIN shows s ON s.id = d.show_id
     LEFT JOIN sponsor_packages p ON p.id = d.package_id ORDER BY d.created_at DESC`,
  );
  const packages = all<{ id: number; show_id: number; name: string; price_cents: number }>("SELECT id, show_id, name, price_cents FROM sponsor_packages ORDER BY show_id, price_cents");
  const stats = list.map((s) => ({
    ...s,
    booked: deals.filter((d) => d.show_id === s.id && ["signed", "live", "completed"].includes(d.status)).reduce((t, d) => t + d.value_cents, 0),
  }));
  const pipelineStages = DEAL_STATUSES.filter((s) => s !== "lost");

  return (
    <>
      <PageHeader
        eyebrow="Shows & sponsors"
        title="Media IP"
        description="Your original shows and the sponsorship deals packaged around them."
        actions={<Link href="/admin/shows/new" className="btn-primary">New show</Link>}
      />
      <Flash ok={sp.ok} error={sp.error} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.id} href={`/admin/shows/${s.id}`} className="card card-hover p-5">
            <div className="flex items-center justify-between">
              <StatusChip status={s.status} />
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted">{s.cadence}</span>
            </div>
            <p className="mt-4 font-display text-xl font-bold">{s.title}</p>
            <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div><dt className="eyebrow text-[9px]">Eps</dt><dd className="font-mono text-sm">{s.episodes}</dd></div>
              <div><dt className="eyebrow text-[9px]">Listeners</dt><dd className="font-mono text-sm">{s.avg_listeners ? `${Math.round(s.avg_listeners / 100) / 10}k` : "—"}</dd></div>
              <div><dt className="eyebrow text-[9px]">Booked</dt><dd className="font-mono text-sm">{money(s.booked, { compact: true })}</dd></div>
            </dl>
          </Link>
        ))}
      </div>

      <h2 className="mb-4 mt-12 text-xl font-semibold">Sponsorship pipeline</h2>
      <div className="grid gap-3 overflow-x-auto pb-2 md:grid-cols-3 xl:grid-cols-6">
        {pipelineStages.map((stage) => {
          const col = deals.filter((d) => d.status === stage);
          return (
            <section key={stage} className="min-w-[200px] rounded-2xl border border-line bg-panel/60 p-3">
              <header className="mb-3 flex items-baseline justify-between px-1">
                <span className="text-sm font-semibold">{titleCase(stage)}</span>
                <span className="font-mono text-[11px] text-muted">{money(col.reduce((t, d) => t + d.value_cents, 0), { compact: true })}</span>
              </header>
              <div className="space-y-2">
                {col.map((d) => (
                  <div key={d.id} className="card p-3">
                    <p className="font-medium leading-snug">{d.brand}</p>
                    <p className="text-xs text-muted">{d.show_title}{d.package_name ? ` · ${d.package_name}` : ""}</p>
                    <p className="mt-1 font-mono text-xs">{money(d.value_cents)}</p>
                    <form action={saveDeal} className="mt-2 flex gap-1.5">
                      <input type="hidden" name="id" value={d.id} />
                      <input type="hidden" name="from" value="/admin/shows" />
                      <select name="status" defaultValue={d.status} className="input flex-1 py-1 text-xs" aria-label={`Stage for ${d.brand}`}>
                        {DEAL_STATUSES.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
                      </select>
                      <button className="btn-secondary btn-sm px-2.5">Move</button>
                    </form>
                  </div>
                ))}
                {col.length === 0 && <p className="py-4 text-center text-xs text-dim">—</p>}
              </div>
            </section>
          );
        })}
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        <section className="card p-6">
          <h2 className="text-lg font-semibold">Add a deal</h2>
          <form action={saveDeal} className="mt-4 grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="from" value="/admin/shows" />
            <div>
              <label className="label" htmlFor="show">Show</label>
              <select id="show" name="show" className="input" required>
                {list.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="package">Package</label>
              <select id="package" name="package" className="input">
                <option value="">Custom</option>
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>{list.find((s) => s.id === p.show_id)?.title} · {p.name} ({money(p.price_cents, { compact: true })})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="brand">Brand</label>
              <input id="brand" name="brand" className="input" required />
            </div>
            <div>
              <label className="label" htmlFor="value">Value ($)</label>
              <input id="value" name="value" inputMode="decimal" className="input" placeholder="15000" />
            </div>
            <div>
              <label className="label" htmlFor="contact_name">Contact</label>
              <input id="contact_name" name="contact_name" className="input" />
            </div>
            <div>
              <label className="label" htmlFor="contact_email">Contact email</label>
              <input id="contact_email" name="contact_email" type="email" className="input" />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="notes">Notes</label>
              <textarea id="notes" name="notes" rows={2} className="input" />
            </div>
            <button className="btn-primary justify-self-start">Add to pipeline</button>
          </form>
        </section>

        <section className="card overflow-x-auto">
          <h2 className="px-6 pt-6 text-lg font-semibold">All deals</h2>
          <table className="data-table mt-3">
            <thead><tr><th>Brand</th><th>Show</th><th>Stage</th><th>Created</th><th className="text-right">Value</th></tr></thead>
            <tbody>
              {deals.map((d) => (
                <tr key={d.id}>
                  <td>
                    {d.brand}
                    {d.contact_email && <p className="text-xs text-muted">{d.contact_email}</p>}
                  </td>
                  <td>{d.show_title}</td>
                  <td><StatusChip status={d.status} /></td>
                  <td className="font-mono text-xs">{fmtDate(d.created_at)}</td>
                  <td className="text-right font-mono">{money(d.value_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </>
  );
}
