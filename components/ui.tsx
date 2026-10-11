import Link from "next/link";
import { titleCase } from "@/lib/format";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 font-display text-lg font-bold tracking-tight">
      <span className="grid size-7 place-items-center rounded-full bg-coral shadow-live">
        <span className="size-2 rounded-full bg-white" />
      </span>
      Stack Studio
    </Link>
  );
}

export function OnAir({ label = "On air" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-coral bg-coral/10 px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-coral-soft">
      <span className="live-dot" />
      {label}
    </span>
  );
}

const STATUS_STYLES: Record<string, string> = {
  // bookings
  confirmed: "border-coral/40 text-coral-soft",
  completed: "border-line text-muted",
  cancelled: "border-line text-dim line-through",
  no_show: "border-amber/40 text-amber",
  // orders
  requested: "border-violet/50 text-violet-soft",
  in_progress: "border-amber/40 text-amber",
  review: "border-coral/40 text-coral-soft",
  delivered: "border-ok/40 text-ok",
  // memberships
  active: "border-ok/40 text-ok",
  paused: "border-amber/40 text-amber",
  // shows
  development: "border-violet/50 text-violet-soft",
  production: "border-amber/40 text-amber",
  live: "border-coral/50 text-coral-soft",
  // deals
  lead: "border-line text-muted",
  pitched: "border-violet/50 text-violet-soft",
  negotiating: "border-amber/40 text-amber",
  signed: "border-ok/40 text-ok",
  lost: "border-line text-dim",
  // inquiries
  new: "border-coral/50 text-coral-soft",
  contacted: "border-amber/40 text-amber",
  won: "border-ok/40 text-ok",
};

export function StatusChip({ status }: { status: string }) {
  return <span className={`chip ${STATUS_STYLES[status] ?? ""}`}>{titleCase(status)}</span>;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Flash({ error, ok }: { error?: string; ok?: string }) {
  if (!error && !ok) return null;
  return (
    <div
      role={error ? "alert" : "status"}
      className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
        error ? "border-coral/50 bg-coral/10 text-coral-soft" : "border-ok/40 bg-ok/10 text-ok"
      }`}
    >
      {error ?? ok}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  accent?: "coral" | "amber" | "violet";
}) {
  const bar = accent === "amber" ? "bg-amber" : accent === "violet" ? "bg-violet" : "bg-coral";
  return (
    <div className="card relative overflow-hidden p-5">
      <span className={`absolute inset-x-0 top-0 h-px ${bar} opacity-70`} />
      <p className="eyebrow">{label}</p>
      <p className="mt-3 font-display text-3xl font-bold">{value}</p>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </div>
  );
}

/** Linear VU-style meter. */
export function Meter({ value, max, tone = "coral" }: { value: number; max: number; tone?: "coral" | "amber" }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-raised" role="meter" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <div
        className={`h-full rounded-full ${tone === "amber" ? "bg-amber" : "bg-coral"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-dashed border-line px-6 py-10 text-center text-sm text-muted">{children}</div>;
}

export function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="card p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
