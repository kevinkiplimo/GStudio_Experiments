import Link from "next/link";
import { bookSession } from "@/app/actions/member";
import { Flash, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { brand } from "@/lib/brand";
import { fmtDate, hours, money } from "@/lib/format";
import { bookingWindowDays, hoursUsed, membershipFor, roomDayBookings, rooms } from "@/lib/studio";
import { addDays, nowLocal, todayDate } from "@/lib/time";

type SP = { room?: string; date?: string; error?: string };

export default async function BookPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const roomList = rooms();
  const m = membershipFor(user.id);
  const activeMember = m?.status === "active";
  const window = bookingWindowDays(user.id);
  const today = todayDate();
  const lastDay = addDays(`${today}T00:00`, window).slice(0, 10);
  const room = roomList.find((r) => String(r.id) === sp.room) ?? roomList[0];
  const date = sp.date && sp.date >= today && sp.date <= lastDay ? sp.date : today;
  const remaining = activeMember ? Math.max(0, m!.hours_per_month - hoursUsed(user.id, `${date}T12:00`)) : 0;

  const now = nowLocal();
  const booked = roomDayBookings(room.id, date);
  const slots = Array.from({ length: brand.studioCloseHour - brand.studioOpenHour }, (_, i) => brand.studioOpenHour + i).map((h) => {
    const start = `${date}T${String(h).padStart(2, "0")}:00`;
    const end = `${date}T${String(h + 1).padStart(2, "0")}:00`;
    const taken = booked.some((b) => b.starts_at < end && b.ends_at > start);
    return { h, start, disabled: taken || start <= now, taken };
  });
  const firstFree = slots.find((s) => !s.disabled)?.h;
  const days = Array.from({ length: Math.min(window, 21) + 1 }, (_, i) => addDays(`${today}T00:00`, i).slice(0, 10));
  const maxWeeks = Math.max(1, Math.floor(window / 7));
  const label = (h: number) => `${((h + 11) % 12) + 1}${h < 12 ? "am" : "pm"}`;

  return (
    <>
      <PageHeader
        eyebrow="Book a session"
        title="Grab your studio time"
        description={
          activeMember
            ? `${m!.plan_name} members can book up to ${window} days ahead. ${hours(remaining)} of membership time left in ${new Date(`${date}T12:00`).toLocaleDateString("en-US", { month: "long" })}.`
            : `Hourly booking is open ${window} days ahead. Members get longer windows, monthly hours and recurring slots.`
        }
        actions={!activeMember && <Link href="/app/membership" className="btn-secondary">See memberships</Link>}
      />
      <Flash error={sp.error} />

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-8">
          {/* Step 1: room */}
          <section>
            <p className="eyebrow mb-3">01 · Studio</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {roomList.map((r) => {
                const active = r.id === room.id;
                return (
                  <Link
                    key={r.id}
                    href={`/app/book?room=${r.id}&date=${date}`}
                    scroll={false}
                    className={`card p-4 transition ${active ? "border-coral shadow-[0_0_24px_rgba(255,51,102,0.18)]" : "card-hover"}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`size-3 rounded-full border ${active ? "border-coral bg-coral shadow-live" : "border-line"}`} />
                      <span className="font-mono text-[11px] text-amber">{money(r.hourly_rate_cents)}/hr</span>
                    </div>
                    <p className="mt-4 font-semibold leading-snug">{r.name}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-muted">{r.description}</p>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* Step 2: date */}
          <section>
            <p className="eyebrow mb-3">02 · Date <span className="normal-case tracking-normal text-dim">— your window runs to {fmtDate(lastDay)}</span></p>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {days.map((d) => {
                const active = d === date;
                const dt = new Date(`${d}T12:00`);
                return (
                  <Link
                    key={d}
                    href={`/app/book?room=${room.id}&date=${d}`}
                    scroll={false}
                    className={`grid w-16 shrink-0 place-items-center rounded-xl border py-2.5 transition ${
                      active ? "border-coral bg-coral/15" : "border-line bg-panel hover:border-white/25"
                    }`}
                  >
                    <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
                      {dt.toLocaleDateString("en-US", { weekday: "short" })}
                    </span>
                    <span className="font-display text-xl font-bold">{dt.getDate()}</span>
                  </Link>
                );
              })}
            </div>
            {window > 21 && (
              <form className="mt-3 flex items-center gap-2" action="/app/book">
                <input type="hidden" name="room" value={room.id} />
                <input type="date" name="date" min={today} max={lastDay} defaultValue={date} className="input w-auto" />
                <button className="btn-secondary btn-sm">Go to date</button>
              </form>
            )}
          </section>

          {/* Step 3: time + details (this form posts the booking) */}
          <form id="book" action={bookSession} className="space-y-8">
            <input type="hidden" name="room" value={room.id} />
            <input type="hidden" name="date" value={date} />
            <section>
              <p className="eyebrow mb-3">03 · Start time · {fmtDate(date)}</p>
              {firstFree === undefined ? (
                <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">
                  {room.name} is fully booked this day — try another date or room.
                </p>
              ) : (
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                  {slots.map((s) => (
                    <label key={s.h} className={s.disabled ? "cursor-not-allowed" : "cursor-pointer"}>
                      <input type="radio" name="hour" value={s.h} disabled={s.disabled} defaultChecked={s.h === firstFree} className="peer sr-only" />
                      <span
                        className={`block rounded-lg border py-2 text-center font-mono text-xs transition ${
                          s.disabled
                            ? `border-line bg-well text-dim ${s.taken ? "line-through" : ""}`
                            : "border-line bg-panel hover:border-white/25 peer-checked:border-coral peer-checked:bg-coral/15 peer-checked:text-ink peer-focus-visible:ring-2 peer-focus-visible:ring-coral"
                        }`}
                      >
                        {label(s.h)}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </section>

            <section className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="hours">04 · Duration</label>
                <select id="hours" name="hours" className="input" defaultValue="2">
                  {[1, 2, 3, 4, 5, 6].map((h) => (
                    <option key={h} value={h}>{h} hour{h > 1 ? "s" : ""} · {money(room.hourly_rate_cents * h)} hourly</option>
                  ))}
                </select>
              </div>
              <div>
                <span className="label">05 · Recurring</span>
                {activeMember ? (
                  <div className="flex items-center gap-3 rounded-xl border border-line bg-well px-3.5 py-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="repeat" className="check" /> Repeat weekly for
                    </label>
                    <select name="weeks" aria-label="Number of weeks" className="input w-auto py-1.5" defaultValue={Math.min(4, maxWeeks)}>
                      {Array.from({ length: Math.min(12, maxWeeks) - 1 }, (_, i) => i + 2).map((w) => (
                        <option key={w} value={w}>{w} weeks</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed border-line px-3.5 py-2.5 text-sm text-muted">Recurring sessions are a member perk.</p>
                )}
              </div>
            </section>

            <div>
              <label className="label" htmlFor="notes">Notes for the studio team</label>
              <textarea id="notes" name="notes" rows={2} className="input" placeholder="Guests, camera setup, anything we should prep…" />
            </div>
          </form>
        </div>

        {/* Summary */}
        <aside className="card h-fit p-6 lg:sticky lg:top-36">
          <p className="eyebrow">Summary</p>
          <dl className="mt-4 divide-y divide-line text-sm">
            <div className="flex justify-between gap-4 py-2.5"><dt className="text-muted">Studio</dt><dd className="text-right">{room.name}</dd></div>
            <div className="flex justify-between gap-4 py-2.5"><dt className="text-muted">Date</dt><dd>{fmtDate(date)}</dd></div>
            <div className="flex justify-between gap-4 py-2.5"><dt className="text-muted">Rate</dt><dd className="font-mono">{money(room.hourly_rate_cents)}/hr</dd></div>
          </dl>
          <div className={`mt-4 rounded-xl border p-3 text-sm ${activeMember && remaining >= 1 ? "border-ok/30 bg-ok/5" : "border-amber/30 bg-amber/5"}`}>
            {activeMember ? (
              <>
                <p className={`font-medium ${remaining >= 1 ? "text-ok" : "text-amber"}`}>{hours(remaining)} of membership time left this month</p>
                <p className="mt-1 text-xs text-muted">
                  Sessions that fit inside your remaining hours are covered. Anything beyond is billed at the hourly rate.
                </p>
              </>
            ) : (
              <>
                <p className="font-medium text-amber">Billed at the hourly rate</p>
                <p className="mt-1 text-xs text-muted">Members save with monthly hours included.</p>
              </>
            )}
          </div>
          <button form="book" className="btn-primary mt-6 w-full" disabled={firstFree === undefined}>Confirm booking</button>
          <p className="mt-3 text-center text-xs text-dim">Free cancellation up to the start time.</p>
        </aside>
      </div>
    </>
  );
}
