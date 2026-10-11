import { STREAM_META } from "@/components/revenue-chart";
import { PageHeader, Stat } from "@/components/ui";
import { all, one } from "@/lib/db";
import { fmtDate, money, titleCase } from "@/lib/format";
import { STREAMS } from "@/lib/studio";
import { monthStart, nowLocal } from "@/lib/time";

export default async function AdminPayments({ searchParams }: { searchParams: Promise<{ stream?: string }> }) {
  const sp = await searchParams;
  const stream = (STREAMS as readonly string[]).includes(sp.stream ?? "") ? sp.stream! : "";
  const rows = all<{ id: number; stream: string; amount_cents: number; description: string; created_at: string; name: string | null }>(
    `SELECT p.*, u.name FROM payments p LEFT JOIN users u ON u.id = p.user_id ${stream ? "WHERE p.stream = ?" : ""}
     ORDER BY p.created_at DESC, p.id DESC LIMIT 200`,
    ...(stream ? [stream] : []),
  );
  const since = monthStart(nowLocal()).replace("T", " ");
  const byStream = all<{ stream: string; v: number }>(
    "SELECT stream, SUM(amount_cents) AS v FROM payments WHERE created_at >= ? GROUP BY stream",
    since,
  );
  const ytd = one<{ v: number }>("SELECT COALESCE(SUM(amount_cents),0) AS v FROM payments WHERE created_at >= strftime('%Y-01-01','now','localtime')")!.v;

  return (
    <>
      <PageHeader eyebrow="Payments" title="Revenue ledger" description={`${money(ytd)} year to date across every stream.`} />
      <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-5">
        {STREAM_META.map((s) => (
          <Stat key={s.key} label={`${s.label} · this month`} value={money(byStream.find((b) => b.stream === s.key)?.v ?? 0, { compact: true })} />
        ))}
      </div>
      <div className="my-6 flex flex-wrap gap-2">
        {["", ...STREAMS].map((k) => (
          <a key={k} href={k ? `/admin/payments?stream=${k}` : "/admin/payments"} className={`btn-sm ${k === stream ? "btn-primary" : "btn-secondary"}`}>
            {k ? titleCase(k) : "All"}
          </a>
        ))}
      </div>
      <div className="card overflow-x-auto">
        <table className="data-table">
          <thead><tr><th>Date</th><th>Description</th><th>Customer</th><th>Stream</th><th className="text-right">Amount</th></tr></thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td className="whitespace-nowrap font-mono text-xs">{fmtDate(p.created_at)}</td>
                <td>{p.description}</td>
                <td className="text-muted">{p.name ?? "—"}</td>
                <td><span className="chip">{titleCase(p.stream)}</span></td>
                <td className={`text-right font-mono ${p.amount_cents < 0 ? "text-ok" : ""}`}>{money(p.amount_cents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-dim">Showing the latest 200 entries.</p>
    </>
  );
}
