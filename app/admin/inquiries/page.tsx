import { setInquiryStatus } from "@/app/actions/admin";
import { Empty, Flash, PageHeader, StatusChip } from "@/components/ui";
import { all } from "@/lib/db";
import { fmtDate, titleCase } from "@/lib/format";

export default async function AdminInquiries({ searchParams }: { searchParams: Promise<{ kind?: string; ok?: string }> }) {
  const sp = await searchParams;
  const kinds = ["sponsorship", "private_event", "production", "general"];
  const kind = kinds.includes(sp.kind ?? "") ? sp.kind! : "";
  const rows = all<{ id: number; kind: string; name: string; email: string; company: string; message: string; status: string; created_at: string }>(
    `SELECT * FROM inquiries ${kind ? "WHERE kind = ?" : ""} ORDER BY status = 'new' DESC, created_at DESC`,
    ...(kind ? [kind] : []),
  );
  const from = `/admin/inquiries${kind ? `?kind=${kind}` : ""}`;
  return (
    <>
      <PageHeader eyebrow="Inquiries" title="Leads" description="Tours, sponsorships, private events and production requests from the website." />
      <Flash ok={sp.ok} />
      <div className="mb-5 flex flex-wrap gap-2">
        {["", ...kinds].map((k) => (
          <a key={k} href={k ? `/admin/inquiries?kind=${k}` : "/admin/inquiries"} className={`btn-sm ${k === kind ? "btn-primary" : "btn-secondary"}`}>
            {k ? titleCase(k) : "All"}
          </a>
        ))}
      </div>
      {rows.length === 0 && <Empty>No inquiries here yet.</Empty>}
      <div className="grid gap-4 lg:grid-cols-2">
        {rows.map((q) => (
          <article key={q.id} className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{q.name}{q.company ? <span className="text-muted"> · {q.company}</span> : null}</p>
                <a href={`mailto:${q.email}`} className="text-sm text-coral-soft hover:underline">{q.email}</a>
              </div>
              <div className="flex items-center gap-2">
                <span className="chip">{titleCase(q.kind)}</span>
                <StatusChip status={q.status} />
              </div>
            </div>
            {q.message && <p className="mt-3 text-sm text-muted">{q.message}</p>}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-[11px] text-dim">{fmtDate(q.created_at)}</span>
              <form action={setInquiryStatus} className="flex gap-2">
                <input type="hidden" name="id" value={q.id} />
                <input type="hidden" name="from" value={from} />
                <select name="status" defaultValue={q.status} className="input w-auto py-1 text-xs" aria-label="Status">
                  {["new", "contacted", "won", "lost"].map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
                </select>
                <button className="btn-secondary btn-sm">Save</button>
              </form>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
