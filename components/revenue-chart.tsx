import { fmtMonth, money } from "@/lib/format";

// Categorical order validated for the dark panel surface (#121216) with the dataviz palette validator.
export const STREAM_META = [
  { key: "membership", label: "Memberships", color: "#FF3366" },
  { key: "sponsorship", label: "Sponsorships", color: "#9B5CF6" },
  { key: "production", label: "Production", color: "#D97706" },
  { key: "events", label: "Events", color: "#0D9488" },
  { key: "hourly", label: "Hourly bookings", color: "#3B82F6" },
] as const;

type Row = { month: string; total: number } & Record<(typeof STREAM_META)[number]["key"], number>;

export function RevenueChart({ data }: { data: Row[] }) {
  const max = Math.max(1, ...data.map((d) => d.total));
  // Round the axis top to a friendly number.
  const step = 10 ** Math.floor(Math.log10(max));
  const top = Math.ceil(max / step) * step;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * top);

  return (
    <figure>
      <ul className="mb-5 flex flex-wrap gap-x-5 gap-y-2" aria-label="Legend">
        {STREAM_META.map((s) => (
          <li key={s.key} className="flex items-center gap-2 text-xs text-muted">
            <span className="size-2.5 rounded-sm" style={{ background: s.color }} />
            {s.label}
          </li>
        ))}
      </ul>
      <div className="relative mt-8 h-64 pl-12">
        {ticks.map((t) => (
          <div key={t} className="absolute inset-x-0 flex translate-y-1/2 items-center" style={{ bottom: `${(t / top) * 100}%` }}>
            <span className="w-12 shrink-0 pr-2 text-right font-mono text-[10px] text-dim">{money(t, { compact: true })}</span>
            <span className={`h-px flex-1 ${t === 0 ? "bg-line" : "bg-line/50"}`} />
          </div>
        ))}
        <div className="relative flex h-full items-end gap-[6%] pl-2">
          {data.map((d) => (
            <div key={d.month} className="group relative flex h-full flex-1 flex-col items-center justify-end outline-none" tabIndex={0}>
              <span className="mb-1 font-mono text-[10px] text-muted">{money(d.total, { compact: true })}</span>
              <div
                className="flex w-full max-w-14 flex-col-reverse gap-[2px] transition group-hover:brightness-110"
                style={{ height: `${(d.total / top) * 100}%` }}
              >
                {STREAM_META.map((s, i) => {
                  const v = d[s.key];
                  if (v <= 0) return null;
                  const isTop = STREAM_META.slice(i + 1).every((n) => d[n.key] <= 0);
                  return (
                    <span
                      key={s.key}
                      className={isTop ? "rounded-t" : ""}
                      style={{ background: s.color, flexGrow: v, flexBasis: 0, minHeight: 2 }}
                    />
                  );
                })}
              </div>
              {/* Hover / focus tooltip */}
              <div className="pointer-events-none absolute bottom-full z-10 mb-2 hidden w-48 rounded-xl border border-line bg-raised p-3 text-xs shadow-xl group-hover:block group-focus:block">
                <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted">{fmtMonth(d.month)} {d.month.slice(0, 4)}</p>
                {STREAM_META.map((s) => (
                  <p key={s.key} className="flex items-center justify-between gap-3 py-0.5">
                    <span className="flex items-center gap-2 text-muted">
                      <span className="size-2 rounded-sm" style={{ background: s.color }} />
                      {s.label}
                    </span>
                    <span className="font-mono text-ink">{money(d[s.key], { compact: true })}</span>
                  </p>
                ))}
                <p className="mt-1.5 flex justify-between border-t border-line pt-1.5 font-mono text-ink">
                  <span>Total</span>
                  <span>{money(d.total)}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex gap-[6%] pl-14">
        {data.map((d) => (
          <span key={d.month} className="flex-1 text-center font-mono text-[10px] uppercase tracking-widest text-muted">
            {fmtMonth(d.month)}
          </span>
        ))}
      </div>
      <details className="mt-5 text-sm">
        <summary className="btn-ghost cursor-pointer px-0">View as table</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Month</th>
                {STREAM_META.map((s) => <th key={s.key} className="text-right">{s.label}</th>)}
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.month}>
                  <td className="font-mono text-xs">{d.month}</td>
                  {STREAM_META.map((s) => <td key={s.key} className="text-right font-mono text-xs">{money(d[s.key])}</td>)}
                  <td className="text-right font-mono text-xs">{money(d.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
