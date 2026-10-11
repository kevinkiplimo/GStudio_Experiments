import { notFound } from "next/navigation";
import { setMemberPlan, setUserRole } from "@/app/actions/admin";
import { Flash, Meter, PageHeader, Section, Stat, StatusChip } from "@/components/ui";
import { getUser } from "@/lib/auth";
import { all, one } from "@/lib/db";
import { fmtDate, fmtDateTime, hours, money, titleCase } from "@/lib/format";
import { ordersWhere, userBookings } from "@/lib/portal";
import { hoursUsed, membershipFor, plans } from "@/lib/studio";
import { nowLocal } from "@/lib/time";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> };

export default async function MemberDetail({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const me = await getUser();
  const user = one<{ id: number; name: string; email: string; phone: string | null; role: string; created_at: string }>(
    "SELECT id, name, email, phone, role, created_at FROM users WHERE id = ?",
    Number(id),
  );
  if (!user) notFound();
  const m = membershipFor(user.id);
  const used = hoursUsed(user.id);
  const now = nowLocal();
  const upcoming = userBookings(user.id, "AND b.status = 'confirmed' AND b.starts_at > ? ORDER BY b.starts_at LIMIT 8", now);
  const orders = ordersWhere("WHERE o.user_id = ? ORDER BY o.created_at DESC LIMIT 8", user.id);
  const payments = all<{ id: number; stream: string; amount_cents: number; description: string; created_at: string }>(
    "SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC LIMIT 10",
    user.id,
  );
  const spend = one<{ v: number }>("SELECT COALESCE(SUM(amount_cents),0) AS v FROM payments WHERE user_id = ?", user.id)!.v;
  const from = `/admin/members/${user.id}`;

  return (
    <>
      <PageHeader eyebrow={`Member since ${fmtDate(user.created_at)}`} title={user.name} description={`${user.email}${user.phone ? ` · ${user.phone}` : ""}`} />
      <Flash ok={sp.ok} error={sp.error} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Plan" value={m ? m.plan_name : "None"} hint={m ? <StatusChip status={m.status} /> : "Hourly customer"} />
        <Stat label="Hours this month" value={m ? `${hours(used)} / ${m.hours_per_month}h` : hours(used)} hint={m && <Meter value={used} max={m.hours_per_month} />} accent="amber" />
        <Stat label="Lifetime spend" value={money(spend)} accent="violet" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Section title="Membership">
          <form action={setMemberPlan} className="grid gap-3">
            <input type="hidden" name="user" value={user.id} />
            <input type="hidden" name="from" value={from} />
            <label className="label" htmlFor="plan">Plan</label>
            <select id="plan" name="plan" defaultValue={m?.plan_id ?? ""} className="input">
              <option value="">No membership</option>
              {plans(true).map((p) => <option key={p.id} value={p.id}>{p.name} · {money(p.price_cents)}/mo</option>)}
            </select>
            <button className="btn-secondary justify-self-start">Update membership</button>
          </form>
          {me?.role === "admin" && (
            <form action={setUserRole} className="mt-6 grid gap-3 border-t border-line pt-5">
              <input type="hidden" name="user" value={user.id} />
              <input type="hidden" name="from" value={from} />
              <label className="label" htmlFor="role">Access</label>
              <select id="role" name="role" defaultValue={user.role} className="input">
                <option value="member">Member (portal only)</option>
                <option value="staff">Staff (back office)</option>
                <option value="admin">Admin (everything)</option>
              </select>
              <button className="btn-secondary justify-self-start">Update access</button>
            </form>
          )}
        </Section>

        <Section title="Upcoming sessions">
          {upcoming.length ? (
            <ul className="divide-y divide-line text-sm">
              {upcoming.map((b) => (
                <li key={b.id} className="py-2.5">
                  <p className="font-mono text-xs text-amber">{fmtDateTime(b.starts_at)}</p>
                  <p>{b.room_name}{b.series_id ? " · weekly" : ""}</p>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted">Nothing booked.</p>}
        </Section>

        <Section title="Production orders">
          {orders.length ? (
            <ul className="divide-y divide-line text-sm">
              {orders.map((o) => (
                <li key={o.id} className="flex items-center justify-between py-2.5">
                  <a href={`/admin/production?order=${o.id}`} className="font-mono hover:text-coral-soft">#{o.id} · {money(o.total_cents)}</a>
                  <StatusChip status={o.status} />
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted">No orders.</p>}
        </Section>
      </div>

      <div className="mt-6">
        <Section title="Recent payments">
          <div className="overflow-x-auto">
            <table className="data-table">
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="font-mono text-xs">{fmtDate(p.created_at)}</td>
                    <td>{p.description}</td>
                    <td><span className="chip">{titleCase(p.stream)}</span></td>
                    <td className="text-right font-mono">{money(p.amount_cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      </div>
    </>
  );
}
