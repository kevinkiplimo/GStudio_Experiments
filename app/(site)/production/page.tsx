import type { Metadata } from "next";
import Link from "next/link";
import { money } from "@/lib/format";
import { plans, services } from "@/lib/studio";

export const metadata: Metadata = { title: "Production" };

const STEPS = [
  ["Record", "Book your session and record in any of our rooms."],
  ["Order", "Pick services from your member portal — or bundle it all in one package."],
  ["We produce", "Editors, audio engineers and designers get to work. Track every stage live."],
  ["Publish", "Download your master, clips and thumbnails straight from the portal."],
];

export default function ProductionPage() {
  const list = services();
  const packages = list.filter((s) => s.is_package);
  const singles = list.filter((s) => !s.is_package);
  const maxDiscount = Math.max(0, ...plans().map((p) => p.production_discount_pct));

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-8">
      <p className="eyebrow text-amber">Production</p>
      <h1 className="mt-3 max-w-3xl text-5xl font-extrabold sm:text-6xl">The money is made after the record button.</h1>
      <p className="mt-5 max-w-2xl text-lg text-muted">
        Creators don&apos;t just need footage. They need a finished episode, clean audio, thumbnails and clips for
        every platform. We package the whole thing.
      </p>

      <ol className="mt-14 grid gap-4 md:grid-cols-4">
        {STEPS.map(([t, d], i) => (
          <li key={t} className="card p-5">
            <span className="font-mono text-xs text-amber">0{i + 1}</span>
            <p className="mt-4 font-display text-lg font-semibold">{t}</p>
            <p className="mt-1 text-sm text-muted">{d}</p>
          </li>
        ))}
      </ol>

      <h2 className="mt-20 text-3xl font-bold">Packages</h2>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {packages.map((p, i) => (
          <div key={p.id} className={`card p-8 ${i === 0 ? "border-amber/50 shadow-tungsten" : ""}`}>
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-2xl font-bold">{p.name}</h3>
              <span className="chip border-amber/40 text-amber">{p.turnaround_days}-day delivery</span>
            </div>
            <p className="mt-3 text-muted">{p.description}</p>
            <p className="mt-6 flex items-baseline gap-2">
              <span className="font-display text-4xl font-bold">{money(p.price_cents)}</span>
              <span className="font-mono text-xs uppercase text-muted">{p.unit}</span>
            </p>
          </div>
        ))}
      </div>

      <h2 className="mt-20 text-3xl font-bold">À la carte</h2>
      <div className="card mt-6 overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Service</th>
              <th className="hidden md:table-cell">What you get</th>
              <th>Turnaround</th>
              <th className="text-right">Price</th>
            </tr>
          </thead>
          <tbody>
            {singles.map((s) => (
              <tr key={s.id}>
                <td>
                  <p className="font-medium">{s.name}</p>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-muted">{s.category}</p>
                </td>
                <td className="hidden text-muted md:table-cell">{s.description}</td>
                <td className="font-mono text-xs">{s.turnaround_days} days</td>
                <td className="text-right font-mono">
                  {money(s.price_cents)} <span className="text-[10px] text-muted">{s.unit}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-4">
        <Link href="/app/production/new" className="btn-primary">Order production</Link>
        <p className="text-sm text-muted">Members save up to {maxDiscount}% on every order.</p>
        <Link href="/contact?kind=production" className="btn-ghost">Recorded elsewhere? Talk to us →</Link>
      </div>
    </div>
  );
}
