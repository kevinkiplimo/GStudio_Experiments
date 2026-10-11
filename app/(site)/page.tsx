import Link from "next/link";
import { EventCard, PlanCard } from "@/components/marketing";
import { OnAir } from "@/components/ui";
import { one } from "@/lib/db";
import { money } from "@/lib/format";
import { eventsWithSales, plans, rooms } from "@/lib/studio";

const PILLARS = [
  {
    n: "01",
    title: "Memberships",
    tag: "Recurring",
    body: "Set studio hours, priority booking and a recurring weekly slot. Stop buying random hours — start building consistency.",
    href: "/memberships",
    tone: "text-coral",
  },
  {
    n: "02",
    title: "Production",
    tag: "After the record",
    body: "Editing, audio cleanup, thumbnails and short-form clips. Walk in with an idea, leave with a content library.",
    href: "/production",
    tone: "text-amber",
  },
  {
    n: "03",
    title: "Original Shows",
    tag: "Media IP",
    body: "We develop, produce and grow shows of our own — then package sponsorships brands actually want to buy.",
    href: "/shows",
    tone: "text-violet-soft",
  },
  {
    n: "04",
    title: "Experiences",
    tag: "After hours",
    body: "Creator mixers, live recordings, workshops and brand events. The community becomes part of the business.",
    href: "/events",
    tone: "text-ok",
  },
];

export default function Home() {
  const planList = plans();
  const events = eventsWithSales({ upcoming: true, publishedOnly: true, limit: 3 });
  const pkg = one<{ name: string; description: string; price_cents: number; turnaround_days: number }>(
    "SELECT name, description, price_cents, turnaround_days FROM services WHERE is_package = 1 AND active = 1 ORDER BY sort LIMIT 1",
  );
  const stats = one<{ creators: number; episodes: number }>(
    "SELECT (SELECT COUNT(*) FROM users WHERE role = 'member') AS creators, (SELECT COUNT(*) FROM orders) + (SELECT COALESCE(SUM(episodes),0) FROM shows) AS episodes",
  )!;

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 50% at 75% 20%, rgba(255,51,102,0.22), transparent 70%), radial-gradient(40% 40% at 10% 80%, rgba(138,43,226,0.18), transparent 70%)",
          }}
        />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-20 pt-16 sm:px-8 lg:grid-cols-[1.15fr_1fr] lg:pt-24">
          <div>
            <OnAir label={`Now recording in ${rooms().length} studios`} />
            <h1 className="mt-6 text-[44px] font-extrabold leading-[52px] tracking-[-0.02em] sm:text-[64px] sm:leading-[72px] sm:tracking-[-0.03em]">
              Stop renting hours. <span className="text-coral">Start building a show.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted">
              Monthly recording memberships, full post-production, original shows brands sponsor, and a creator
              community — all under one roof.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/memberships" className="btn-primary px-6 py-3">See memberships</Link>
              <Link href="/contact?kind=general" className="btn-secondary px-6 py-3">Book a tour</Link>
            </div>
            <p className="mt-10 font-mono text-xs uppercase tracking-[0.12em] text-muted">
              {rooms().length} studios · {stats.creators}+ creators · {stats.episodes.toLocaleString()} episodes produced
            </p>
          </div>

          {/* Broadcast console visual */}
          <div className="glass relative rounded-3xl p-4">
            <div className="flex items-center justify-between px-2 pb-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">CAM A · 4K · 23.976</span>
              <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-coral">
                <span className="live-dot" /> REC 00:42:17
              </span>
            </div>
            <div
              className="relative aspect-video overflow-hidden rounded-2xl border border-line"
              style={{
                background:
                  "radial-gradient(50% 70% at 30% 40%, rgba(255,51,102,0.45), transparent 70%), radial-gradient(40% 60% at 75% 55%, rgba(255,159,28,0.3), transparent 70%), linear-gradient(180deg,#1a1a22,#0a0a0c)",
              }}
            >
              <svg viewBox="0 0 400 225" className="absolute inset-0 h-full w-full" aria-hidden>
                <g fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="3" strokeLinecap="round">
                  <path d="M120 60 v40 a20 20 0 0 0 40 0 v-40 a20 20 0 0 0 -40 0z" fill="rgba(10,10,12,0.85)" />
                  <path d="M110 95 a30 30 0 0 0 60 0 M140 125 v35 M120 160 h40" />
                  <path d="M240 60 v40 a20 20 0 0 0 40 0 v-40 a20 20 0 0 0 -40 0z" fill="rgba(10,10,12,0.85)" />
                  <path d="M230 95 a30 30 0 0 0 60 0 M260 125 v35 M240 160 h40" />
                </g>
              </svg>
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-panel to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                <span className="rounded-md bg-black/50 px-2 py-1 font-mono text-[10px] uppercase tracking-widest">Studio A — The Lounge</span>
                <span className="rounded-md bg-black/50 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-amber">-12 LUFS</span>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-3 px-1">
              {["HOST", "GUEST", "MUSIC", "MASTER"].map((ch, i) => (
                <div key={ch}>
                  <div className="flex h-12 items-end gap-[3px]">
                    {Array.from({ length: 10 }).map((_, j) => {
                      const lit = j < [8, 6, 4, 7][i];
                      return (
                        <span
                          key={j}
                          className={`w-full rounded-sm ${lit ? (j > 7 ? "bg-coral" : j > 5 ? "bg-amber" : "bg-ok/80") : "bg-raised"}`}
                          style={{ height: `${30 + j * 7}%` }}
                        />
                      );
                    })}
                  </div>
                  <p className="mt-1.5 font-mono text-[9px] tracking-[0.14em] text-muted">{ch}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* The stack */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-8">
        <p className="eyebrow">The stack</p>
        <h2 className="mt-3 max-w-3xl text-4xl font-bold sm:text-5xl">Four businesses. One studio.</h2>
        <p className="mt-4 max-w-2xl text-muted">
          We don&apos;t just rent rooms by the hour. Every creator who records here can plug into the whole stack.
        </p>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((p) => (
            <Link key={p.n} href={p.href} className="card card-hover group flex flex-col p-6">
              <div className="flex items-center justify-between">
                <span className={`font-mono text-xs ${p.tone}`}>{p.n}</span>
                <span className="chip">{p.tag}</span>
              </div>
              <h3 className="mt-10 text-2xl font-bold">{p.title}</h3>
              <p className="mt-3 text-sm text-muted">{p.body}</p>
              <span className="mt-6 font-mono text-[11px] uppercase tracking-[0.1em] text-muted transition group-hover:text-coral">
                Explore →
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="eyebrow">Memberships</p>
            <h2 className="mt-3 text-4xl font-bold sm:text-5xl">Sell consistency, not hours.</h2>
          </div>
          <Link href="/memberships" className="btn-ghost">Compare plans →</Link>
        </div>
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {planList.map((p, i) => (
            <PlanCard key={p.id} plan={p} featured={i === 1} />
          ))}
        </div>
      </section>

      {/* Production package */}
      {pkg && (
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-8">
          <div className="card grid gap-10 overflow-hidden p-8 sm:p-12 lg:grid-cols-2">
            <div>
              <p className="eyebrow text-amber">Production</p>
              <h2 className="mt-3 text-4xl font-bold">Walk in with an idea. Leave with a content library.</h2>
              <p className="mt-4 text-muted">
                Our editors take it from the moment you stop recording. One order covers the full episode, clean
                audio, thumbnails and clips for every platform.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/production" className="btn-primary">See the production menu</Link>
              </div>
            </div>
            <div className="rounded-2xl border border-line bg-well p-6">
              <div className="flex items-center justify-between">
                <p className="font-display text-xl font-bold">{pkg.name}</p>
                <span className="chip border-amber/40 text-amber">{pkg.turnaround_days}-day delivery</span>
              </div>
              <ul className="mt-6 divide-y divide-line text-sm">
                {["Full episode edit (audio + video)", "Audio cleanup & mastering", "3 thumbnail options", "6 short-form vertical clips"].map((x, i) => (
                  <li key={x} className="flex items-center gap-4 py-3">
                    <span className="font-mono text-xs text-amber">0{i + 1}</span>
                    {x}
                  </li>
                ))}
              </ul>
              <p className="mt-6 flex items-baseline gap-2">
                <span className="font-display text-4xl font-bold">{money(pkg.price_cents)}</span>
                <span className="font-mono text-xs text-muted">PER EPISODE · MEMBERS SAVE UP TO 20%</span>
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Events */}
      {events.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="eyebrow">Live at Stack</p>
              <h2 className="mt-3 text-4xl font-bold sm:text-5xl">After hours, the studio becomes the venue.</h2>
            </div>
            <Link href="/events" className="btn-ghost">All events →</Link>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {events.map((e) => (
              <EventCard key={e.id} e={e} />
            ))}
          </div>
        </section>
      )}

      {/* Brands */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-8">
        <div
          className="relative overflow-hidden rounded-3xl border border-line p-10 sm:p-16"
          style={{ background: "radial-gradient(70% 120% at 100% 0%, rgba(138,43,226,0.35), transparent 60%), #121216" }}
        >
          <p className="eyebrow text-violet-soft">For brands</p>
          <h2 className="mt-3 max-w-2xl text-4xl font-bold sm:text-5xl">Sponsor a show built to be sponsored.</h2>
          <p className="mt-4 max-w-xl text-muted">
            Our original shows are developed with partners in mind — engaged audiences, host-read integrations,
            live activations and clips that travel.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/contact?kind=sponsorship" className="btn-primary">Partner with us</Link>
            <Link href="/shows" className="btn-secondary">See our shows</Link>
          </div>
        </div>
      </section>
    </>
  );
}
