import Link from "next/link";
import { RevenueChart } from "@/components/revenue-chart";
import { Empty, Meter, PageHeader, Section, Stat, StatusChip } from "@/components/ui";
import { brand } from "@/lib/brand";
import { all, one } from "@/lib/db";
import { fmtDate, fmtTime, money, titleCase } from "@/lib/format";
import { eventsWithSales, mrrCents, ORDER_STATUSES, revenueByMonth, rooms, weekUtilization } from "@/lib/studio";
import { addDays, monthStart, nowLocal, todayDate } from "@/lib/time";

export default function AdminOverview() {
  const now = nowLocal();
  const today = todayDate();
  const revenue = revenueByMonth(6);
  const thisMonth = revenue[revenue.length - 1];
  const lastMonth = revenue[revenue.length - 2];
  const util = weekUtilization();
  const k = one<{ members: number; open_orders: number; pipeline: number; overdue: number }>(
    `SELECT
       (SELECT COUNT(*) FROM memberships WHERE status = 'active') AS members,
       (SELECT COUNT(*) FROM orders WHERE status IN ('requested','in_progress','review')) AS open_orders,
       (SELECT COALESCE(SUM(value_cents),0) FROM deals WHERE status IN ('lead','pitched','negotiating')) AS pipeline,
       (SELECT COUNT(*) FROM orders WHERE status IN ('requested','in_progress','review') AND due_date < ?) AS overdue`,
    today,
  )!;
  const orderCounts = all<{ status: string; n: number }>("SELECT status, COUNT(*) AS n FROM orders GROUP BY status");
  const roomList = rooms();
  const schedule = all<{ id: number; room_id: number; starts_at: string; ends_at: string; status: string; member: string }>(
    `SELECT b.id, b.room_id, b.starts_at, b.ends_at, b.status, u.name AS member FROM bookings b JOIN users u ON u.id = b.user_id
     WHERE b.status IN ('confirmed','completed') AND b.starts_at >= ? AND b.starts_at < ? ORDER BY b.starts_at`,
    `${today}T00:00`,
    addDays(`${today}T00:00`, 1),
  );
  const inquiries = all<{ id: number; kind: string; name: string; company: string; status: string; created_at: string }>(
    "SELECT id, kind, name, company, status, created_at FROM inquiries ORDER BY status = 'new' DESC, created_at DESC LIMIT 5",
  );
  const events = eventsWithSales({ upcoming: true, limit: 4 });
  const open = brand.studioOpenHour;
  const span = brand.studioCloseHour - brand.studioOpenHour;
  const growth = lastMonth?.total ? Math.round(((thisMonth.total - lastMonth.total) / lastMonth.total) * 100) : 0;

  return (
    <>
      <PageHeader
        eyebrow={new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        title="Studio overview"
        description="Memberships, production, sponsored shows and experiences — stacked."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <Stat label="MRR" value={money(mrrCents())} hint="Active memberships" />
        <Stat label="Active members" value={k.members} hint={<Link href="/admin/members" className="hover:text-ink">View members →</Link>} />
        <Stat label="Utilization" value={`${util.pct}%`} hint={`${Math.round(util.booked)} of ${util.capacity} room-hours this week`} accent="amber" />
        <Stat label="Open orders" value={k.open_orders} hint={k.overdue ? <span className="text-coral-soft">{k.overdue} overdue</span> : "None overdue"} accent="amber" />
        <Stat label="Sponsor pipeline" value={money(k.pipeline, { compact: true })} hint="Leads → negotiating" accent="violet" />
        <Stat
          label="Revenue this month"
          value={money(thisMonth.total, { compact: true })}
          hint={`${growth >= 0 ? "+" : ""}${growth}% vs ${new Date(`${lastMonth?.month ?? monthStart(now).slice(0, 7)}-15T12:00`).toLocaleDateString("en-US", { month: "short" })}`}
          accent="violet"
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Section title="Revenue by stream · last 6 months">
            <RevenueChart data={revenue} />
          </Section>
        </div>
        <Section title="Production board" action={<Link href="/admin/production" className="btn-ghost">Open board →</Link>}>
          <ul className="space-y-4">
            {ORDER_STATUSES.map((s) => {
              const n = orderCounts.find((c) => c.status === s)?.n ?? 0;
              const max = Math.max(1, ...orderCounts.map((c) => c.n));
              return (
                <li key={s}>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span>{titleCase(s)}</span>
                    <span className="font-mono text-xs text-muted">{n}</span>
                  </div>
                  <Meter value={n} max={max} tone={s === "requested" || s === "review" ? "coral" : "amber"} />
                </li>
              );
            })}
          </ul>
        </Section>
      </div>

      {/* Today's schedule */}
      <div className="mt-6">
        <Section title="Today's schedule" action={<Link href="/admin/bookings" className="btn-ghost">All bookings →</Link>}>
          <div className="overflow-x-auto">
            <div className="min-w-[720px] pr-3">
              <div className="relative ml-36 h-5">
                {Array.from({ length: span + 1 }, (_, i) => (
                  <span key={i} className="absolute -translate-x-1/2 font-mono text-[10px] text-dim" style={{ left: `${(i / span) * 100}%` }}>
                    {((open + i + 11) % 12) + 1}
                  </span>
                ))}
              </div>
              {roomList.map((r) => (
                <div key={r.id} className="flex items-center border-t border-line py-2">
                  <span className="w-36 shrink-0 truncate pr-3 text-sm">{r.name.split(" — ")[0]}</span>
                  <div className="relative h-10 flex-1 rounded-lg bg-well">
                    {schedule
                      .filter((b) => b.room_id === r.id)
                      .map((b) => {
                        const s = Number(b.starts_at.slice(11, 13)) + Number(b.starts_at.slice(14, 16)) / 60;
                        const e = Number(b.ends_at.slice(11, 13)) + Number(b.ends_at.slice(14, 16)) / 60;
                        const live = b.starts_at <= now && b.ends_at > now;
                        return (
                          <div
                            key={b.id}
                            title={`${b.member} · ${fmtTime(b.starts_at)}–${fmtTime(b.ends_at)}`}
                            className={`absolute inset-y-1 overflow-hidden rounded-md border px-2 py-1 text-[11px] leading-tight ${
                              live ? "border-coral bg-coral/25 shadow-live" : b.ends_at <= now ? "border-line bg-raised text-muted" : "border-coral/40 bg-coral/10"
                            }`}
                            style={{ left: `${((s - open) / span) * 100}%`, width: `calc(${((e - s) / span) * 100}% - 2px)` }}
                          >
                            <p className="truncate font-medium">{b.member}</p>
                            <p className="truncate font-mono text-[9px] text-muted">{fmtTime(b.starts_at)}</p>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {schedule.length === 0 && <p className="mt-3 text-sm text-muted">No sessions booked today.</p>}
        </Section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Section title="Recent inquiries" action={<Link href="/admin/inquiries" className="btn-ghost">All →</Link>}>
          {inquiries.length ? (
            <ul className="divide-y divide-line">
              {inquiries.map((q) => (
                <li key={q.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{q.name}{q.company ? ` · ${q.company}` : ""}</p>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-muted">{titleCase(q.kind)} · {fmtDate(q.created_at)}</p>
                  </div>
                  <StatusChip status={q.status} />
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No inquiries yet.</Empty>
          )}
        </Section>
        <Section title="Upcoming events" action={<Link href="/admin/events" className="btn-ghost">Manage →</Link>}>
          {events.length ? (
            <ul className="space-y-4">
              {events.map((e) => (
                <li key={e.id}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-3">
                    <Link href={`/admin/events/${e.id}`} className="truncate font-medium hover:text-coral-soft">{e.title}</Link>
                    <span className="shrink-0 font-mono text-[11px] text-muted">{fmtDate(e.starts_at)} · {e.sold}/{e.capacity}</span>
                  </div>
                  <Meter value={e.sold} max={e.capacity} tone="amber" />
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No upcoming events.</Empty>
          )}
        </Section>
      </div>
    </>
  );
}
