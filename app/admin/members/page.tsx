import Link from "next/link";
import { Empty, PageHeader, StatusChip } from "@/components/ui";
import { all } from "@/lib/db";
import { fmtDate, hours, money } from "@/lib/format";
import { hoursUsed } from "@/lib/studio";

type SP = { q?: string; plan?: string };

export default async function AdminMembers({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const rows = all<{
    id: number; name: string; email: string; role: string; created_at: string; plan_name: string | null; plan_slug: string | null;
    hours_per_month: number | null; status: string | null; spend: number; last_session: string | null;
  }>(
    `SELECT u.id, u.name, u.email, u.role, u.created_at, p.name AS plan_name, p.slug AS plan_slug, p.hours_per_month, m.status,
       (SELECT COALESCE(SUM(amount_cents),0) FROM payments WHERE user_id = u.id) AS spend,
       (SELECT MAX(starts_at) FROM bookings WHERE user_id = u.id AND status = 'completed') AS last_session
     FROM users u
     LEFT JOIN memberships m ON m.id = (SELECT id FROM memberships WHERE user_id = u.id AND status IN ('active','paused') ORDER BY id DESC LIMIT 1)
     LEFT JOIN plans p ON p.id = m.plan_id
     WHERE (? = '' OR u.name LIKE ? OR u.email LIKE ?) ${sp.plan === "none" ? "AND m.id IS NULL" : sp.plan ? "AND p.slug = ?" : ""}
     ORDER BY u.role = 'member' DESC, spend DESC`,
    q, `%${q}%`, `%${q}%`, ...(sp.plan && sp.plan !== "none" ? [sp.plan] : []),
  );
  const plans = all<{ slug: string; name: string }>("SELECT slug, name FROM plans ORDER BY sort");

  return (
    <>
      <PageHeader eyebrow="Members" title="People" description={`${rows.filter((r) => r.status === "active").length} active members · ${rows.length} accounts shown`} />
      <form className="mb-5 flex flex-wrap gap-2" action="/admin/members">
        <input name="q" defaultValue={q} placeholder="Search name or email" className="input max-w-xs py-1.5" aria-label="Search" />
        <select name="plan" defaultValue={sp.plan ?? ""} className="input w-auto py-1.5" aria-label="Plan">
          <option value="">All plans</option>
          {plans.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}
          <option value="none">No membership</option>
        </select>
        <button className="btn-secondary btn-sm">Filter</button>
      </form>
      {rows.length ? (
        <div className="card overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr><th>Name</th><th>Plan</th><th>Hours this month</th><th>Last session</th><th className="text-right">Lifetime spend</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link href={`/admin/members/${r.id}`} className="font-medium hover:text-coral-soft">{r.name}</Link>
                    {r.role !== "member" && <span className="chip ml-2">{r.role}</span>}
                    <p className="text-xs text-muted">{r.email}</p>
                  </td>
                  <td>{r.plan_name ? <span className="flex items-center gap-2">{r.plan_name} <StatusChip status={r.status!} /></span> : <span className="text-muted">—</span>}</td>
                  <td className="font-mono text-xs">{r.hours_per_month ? `${hours(hoursUsed(r.id))} / ${r.hours_per_month}h` : "—"}</td>
                  <td className="font-mono text-xs">{r.last_session ? fmtDate(r.last_session) : "—"}</td>
                  <td className="text-right font-mono">{money(r.spend)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty>No one matches that search.</Empty>
      )}
    </>
  );
}
