import type { Metadata } from "next";
import Link from "next/link";
import { PlanCard } from "@/components/marketing";
import { brand } from "@/lib/brand";
import { money } from "@/lib/format";
import { plans, rooms } from "@/lib/studio";

export const metadata: Metadata = { title: "Memberships" };

const FAQ = [
  ["Do unused hours roll over?", "Hours reset on the 1st of each month — the point is a consistent recording rhythm. Need more? Extra hours are billed at the room rate."],
  ["What is the booking window?", `It's how far ahead you can book. Members get priority — up to 60 days ahead on Pro — while hourly renters can book ${brand.publicBookingWindowDays} days out.`],
  ["How do recurring sessions work?", "Pick a room, day and time, toggle “Repeat weekly” and we hold that slot for you every week inside your booking window."],
  ["Can I pause or cancel?", "Yes. Pause or cancel any time from your member portal. No contracts."],
];

export default function MembershipsPage() {
  const planList = plans();
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-8">
      <p className="eyebrow">Memberships</p>
      <h1 className="mt-3 max-w-3xl text-5xl font-extrabold sm:text-6xl">Your show deserves a standing slot.</h1>
      <p className="mt-5 max-w-2xl text-lg text-muted">
        Monthly studio hours, priority booking, recurring sessions and member pricing on production. Built for
        creators who publish on a schedule.
      </p>

      <div className="mt-14 grid gap-6 lg:grid-cols-3">
        {planList.map((p, i) => (
          <PlanCard key={p.id} plan={p} featured={i === 1} />
        ))}
      </div>

      <section className="mt-24">
        <h2 className="text-3xl font-bold">The rooms</h2>
        <p className="mt-2 text-muted">Membership hours work in every room. Not a member yet? Book any room hourly.</p>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {rooms().map((r) => (
            <div key={r.id} className="card p-6">
              <div className="flex items-center justify-between">
                <span className="chip">Up to {r.capacity} {r.capacity === 1 ? "person" : "people"}</span>
                <span className="font-mono text-xs text-amber">{money(r.hourly_rate_cents)}/hr</span>
              </div>
              <h3 className="mt-6 text-xl font-semibold">{r.name}</h3>
              <p className="mt-2 text-sm text-muted">{r.description}</p>
            </div>
          ))}
        </div>
        <div className="mt-6">
          <Link href="/signup" className="btn-secondary">Create a free account to book hourly</Link>
        </div>
      </section>

      <section className="mt-24 grid gap-10 lg:grid-cols-[1fr_2fr]">
        <h2 className="text-3xl font-bold">Questions</h2>
        <dl className="divide-y divide-line border-y border-line">
          {FAQ.map(([q, a]) => (
            <div key={q} className="py-5">
              <dt className="font-semibold">{q}</dt>
              <dd className="mt-2 text-sm text-muted">{a}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
