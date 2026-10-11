import Link from "next/link";
import { fmtDate, fmtTime, money, titleCase } from "@/lib/format";
import { features, type Plan } from "@/lib/studio";

export function PlanCard({ plan, featured, cta }: { plan: Plan; featured?: boolean; cta?: React.ReactNode }) {
  return (
    <div
      className={`card relative flex flex-col p-7 ${
        featured ? "border-coral/60 shadow-[0_0_48px_rgba(255,51,102,0.18)]" : "card-hover"
      }`}
    >
      {featured && (
        <span className="absolute -top-3 left-7 rounded-full bg-coral px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.1em]">
          Most popular
        </span>
      )}
      <p className="eyebrow">{plan.name}</p>
      <p className="mt-4 flex items-baseline gap-1">
        <span className="font-display text-5xl font-bold">{money(plan.price_cents)}</span>
        <span className="font-mono text-xs text-muted">/MO</span>
      </p>
      <p className="mt-3 text-sm text-muted">{plan.description}</p>
      <div className="my-6 grid grid-cols-3 gap-2 rounded-xl border border-line bg-well p-3 text-center">
        <div>
          <p className="font-display text-xl font-bold">{plan.hours_per_month}</p>
          <p className="font-mono text-[9px] uppercase tracking-widest text-muted">hrs / mo</p>
        </div>
        <div>
          <p className="font-display text-xl font-bold">{plan.booking_window_days}d</p>
          <p className="font-mono text-[9px] uppercase tracking-widest text-muted">window</p>
        </div>
        <div>
          <p className="font-display text-xl font-bold">{plan.production_discount_pct}%</p>
          <p className="font-mono text-[9px] uppercase tracking-widest text-muted">off prod.</p>
        </div>
      </div>
      <ul className="mb-8 space-y-2.5 text-sm">
        {features(plan).map((f) => (
          <li key={f} className="flex gap-2.5">
            <span className={`mt-2 size-1.5 shrink-0 rounded-full ${featured ? "bg-coral" : "bg-amber"}`} />
            {f}
          </li>
        ))}
      </ul>
      <div className="mt-auto">
        {cta ?? (
          <Link href={`/signup?plan=${plan.slug}`} className={`${featured ? "btn-primary" : "btn-secondary"} w-full`}>
            Join {plan.name}
          </Link>
        )}
      </div>
    </div>
  );
}

export type EventRow = {
  id: number;
  slug: string;
  title: string;
  kind: string;
  description: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  price_cents: number;
  sold: number;
};

const KIND_TONE: Record<string, string> = {
  mixer: "text-amber",
  live_recording: "text-coral-soft",
  workshop: "text-violet-soft",
  brand_event: "text-ok",
};

export function EventCard({ e }: { e: EventRow }) {
  const left = Math.max(0, e.capacity - e.sold);
  const d = new Date(e.starts_at);
  return (
    <Link href={`/events/${e.slug}`} className="card card-hover group flex flex-col overflow-hidden">
      <div className="flex items-stretch gap-4 p-5">
        <div className="grid w-16 shrink-0 place-items-center rounded-xl border border-line bg-well py-2 text-center">
          <span className="font-mono text-[10px] uppercase tracking-widest text-coral">
            {d.toLocaleDateString("en-US", { month: "short" })}
          </span>
          <span className="font-display text-2xl font-bold leading-none">{d.getDate()}</span>
        </div>
        <div className="min-w-0">
          <p className={`font-mono text-[10px] uppercase tracking-[0.1em] ${KIND_TONE[e.kind] ?? "text-muted"}`}>{titleCase(e.kind)}</p>
          <h3 className="mt-1 text-lg font-semibold leading-snug group-hover:text-coral-soft">{e.title}</h3>
          <p className="mt-1 text-xs text-muted">{fmtDate(e.starts_at)} · {fmtTime(e.starts_at)}</p>
        </div>
      </div>
      <p className="line-clamp-2 px-5 text-sm text-muted">{e.description}</p>
      <div className="mt-auto flex items-center justify-between border-t border-line px-5 py-3.5 text-sm">
        <span className="font-mono text-xs">{e.price_cents ? money(e.price_cents) : "Free / RSVP"}</span>
        <span className={`font-mono text-[10px] uppercase tracking-widest ${left < 10 ? "text-coral" : "text-muted"}`}>
          {left === 0 ? "Sold out" : `${left} spots left`}
        </span>
      </div>
    </Link>
  );
}

export function ShowCover({ title, hue, size = "md" }: { title: string; hue: number; size?: "md" | "lg" }) {
  return (
    <div
      className={`relative grid aspect-square place-items-center overflow-hidden rounded-xl border border-line ${size === "lg" ? "p-8" : "p-5"}`}
      style={{
        background: `radial-gradient(120% 90% at 20% 10%, hsl(${hue} 90% 55% / 0.55), transparent 60%), radial-gradient(90% 80% at 90% 100%, hsl(${(hue + 50) % 360} 85% 50% / 0.35), transparent 60%), #121216`,
      }}
    >
      <span className={`text-center font-display font-extrabold leading-none tracking-tight ${size === "lg" ? "text-5xl" : "text-2xl"}`}>
        {title}
      </span>
      <span className="absolute bottom-3 left-3 font-mono text-[9px] uppercase tracking-[0.14em] text-white/70">A Stack Studio Original</span>
    </div>
  );
}
