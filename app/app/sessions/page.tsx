import Link from "next/link";
import { cancelSession } from "@/app/actions/member";
import { Empty, Flash, PageHeader, StatusChip } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { fmtDate, fmtTime, hours, money } from "@/lib/format";
import { userBookings } from "@/lib/portal";
import { hoursBetween, nowLocal } from "@/lib/time";

export default async function SessionsPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const now = nowLocal();
  const upcoming = userBookings(user.id, "AND b.status = 'confirmed' AND b.starts_at > ? ORDER BY b.starts_at", now);
  const past = userBookings(user.id, "AND (b.starts_at <= ? OR b.status != 'confirmed') ORDER BY b.starts_at DESC LIMIT 30", now);

  return (
    <>
      <PageHeader eyebrow="My sessions" title="Your studio calendar" actions={<Link href="/app/book" className="btn-primary">Book a session</Link>} />
      <Flash ok={sp.ok} error={sp.error} />

      <h2 className="mb-3 text-lg font-semibold">Upcoming</h2>
      {upcoming.length ? (
        <div className="card overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr><th>When</th><th>Studio</th><th>Length</th><th>Billing</th><th className="text-right">Actions</th></tr>
            </thead>
            <tbody>
              {upcoming.map((b) => (
                <tr key={b.id}>
                  <td className="font-mono text-xs"><span className="text-amber">{fmtDate(b.starts_at)}</span> · {fmtTime(b.starts_at)}</td>
                  <td>
                    {b.room_name}
                    {b.series_id && <span className="chip ml-2">Weekly</span>}
                  </td>
                  <td className="font-mono text-xs">{hours(hoursBetween(b.starts_at, b.ends_at))}</td>
                  <td>
                    <span className={`chip ${b.uses_membership ? "border-ok/40 text-ok" : "border-amber/40 text-amber"}`}>
                      {b.uses_membership ? "Membership" : money(b.price_cents)}
                    </span>
                  </td>
                  <td>
                    <div className="flex justify-end gap-1">
                      <form action={cancelSession}>
                        <input type="hidden" name="id" value={b.id} />
                        <button className="btn-ghost">Cancel</button>
                      </form>
                      {b.series_id && (
                        <form action={cancelSession}>
                          <input type="hidden" name="id" value={b.id} />
                          <input type="hidden" name="series" value="1" />
                          <button className="btn-ghost">Cancel series</button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty>No upcoming sessions. <Link href="/app/book" className="text-coral-soft">Book one now</Link>.</Empty>
      )}

      <h2 className="mb-3 mt-12 text-lg font-semibold">History</h2>
      {past.length ? (
        <div className="card overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr><th>When</th><th>Studio</th><th>Length</th><th>Status</th><th className="text-right">Next step</th></tr>
            </thead>
            <tbody>
              {past.map((b) => (
                <tr key={b.id}>
                  <td className="font-mono text-xs">{fmtDate(b.starts_at)} · {fmtTime(b.starts_at)}</td>
                  <td>{b.room_name}</td>
                  <td className="font-mono text-xs">{hours(hoursBetween(b.starts_at, b.ends_at))}</td>
                  <td><StatusChip status={b.status} /></td>
                  <td className="text-right">
                    {b.status === "completed" && (
                      <Link href={`/app/production/new?booking=${b.id}`} className="btn-ghost">Order production →</Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty>No past sessions yet.</Empty>
      )}
    </>
  );
}
