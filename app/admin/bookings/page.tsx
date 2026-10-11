import Link from "next/link";
import { setBookingStatus } from "@/app/actions/admin";
import { Empty, Flash, PageHeader, StatusChip } from "@/components/ui";
import { all } from "@/lib/db";
import { fmtDateLong, fmtTime, hours, money } from "@/lib/format";
import { rooms } from "@/lib/studio";
import { addDays, hoursBetween, todayDate } from "@/lib/time";

type SP = { date?: string; room?: string; ok?: string; error?: string };

export default async function AdminBookings({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const date = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : todayDate();
  const roomId = Number(sp.room) || 0;
  const roomList = rooms(true);
  const list = all<{
    id: number; room_id: number; room_name: string; member: string; user_id: number; starts_at: string; ends_at: string;
    status: string; series_id: string | null; uses_membership: number; price_cents: number; notes: string;
  }>(
    `SELECT b.*, r.name AS room_name, u.name AS member FROM bookings b JOIN rooms r ON r.id = b.room_id JOIN users u ON u.id = b.user_id
     WHERE b.starts_at >= ? AND b.starts_at < ? ${roomId ? "AND b.room_id = ?" : ""} ORDER BY b.starts_at, r.id`,
    `${date}T00:00`, addDays(`${date}T00:00`, 1), ...(roomId ? [roomId] : []),
  );
  const from = `/admin/bookings?date=${date}${roomId ? `&room=${roomId}` : ""}`;
  const prev = addDays(`${date}T00:00`, -1).slice(0, 10);
  const next = addDays(`${date}T00:00`, 1).slice(0, 10);
  const bookedHours = list.filter((b) => b.status !== "cancelled").reduce((s, b) => s + hoursBetween(b.starts_at, b.ends_at), 0);

  return (
    <>
      <PageHeader eyebrow="Bookings" title={fmtDateLong(`${date}T00:00`)} description={`${list.length} bookings · ${hours(bookedHours)} booked`} />
      <Flash ok={sp.ok} error={sp.error} />
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Link href={`/admin/bookings?date=${prev}${roomId ? `&room=${roomId}` : ""}`} className="btn-secondary btn-sm">← Prev</Link>
        <Link href={`/admin/bookings${roomId ? `?room=${roomId}` : ""}`} className="btn-secondary btn-sm">Today</Link>
        <Link href={`/admin/bookings?date=${next}${roomId ? `&room=${roomId}` : ""}`} className="btn-secondary btn-sm">Next →</Link>
        <form className="ml-auto flex flex-wrap gap-2" action="/admin/bookings">
          <input type="date" name="date" defaultValue={date} className="input w-auto py-1.5" aria-label="Date" />
          <select name="room" defaultValue={roomId || ""} className="input w-auto py-1.5" aria-label="Room">
            <option value="">All rooms</option>
            {roomList.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <button className="btn-secondary btn-sm">Filter</button>
        </form>
      </div>
      {list.length ? (
        <div className="card overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr><th>Time</th><th>Room</th><th>Member</th><th>Billing</th><th>Status</th><th className="text-right">Update</th></tr>
            </thead>
            <tbody>
              {list.map((b) => (
                <tr key={b.id}>
                  <td className="whitespace-nowrap font-mono text-xs">{fmtTime(b.starts_at)}–{fmtTime(b.ends_at)}</td>
                  <td className="whitespace-nowrap">{b.room_name.split(" — ")[0]}</td>
                  <td>
                    <Link href={`/admin/members/${b.user_id}`} className="hover:text-coral-soft">{b.member}</Link>
                    {b.series_id && <span className="chip ml-2">Weekly</span>}
                    {b.notes && <p className="text-xs text-muted">{b.notes}</p>}
                  </td>
                  <td><span className="font-mono text-xs">{b.uses_membership ? "Membership" : money(b.price_cents)}</span></td>
                  <td><StatusChip status={b.status} /></td>
                  <td>
                    <form action={setBookingStatus} className="flex justify-end gap-2">
                      <input type="hidden" name="id" value={b.id} />
                      <input type="hidden" name="from" value={from} />
                      <select name="status" defaultValue={b.status} className="input w-auto py-1 text-xs" aria-label="Status">
                        {["confirmed", "completed", "no_show", "cancelled"].map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                      </select>
                      <button className="btn-secondary btn-sm">Save</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty>No bookings for this day.</Empty>
      )}
    </>
  );
}
