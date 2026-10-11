import { notFound } from "next/navigation";
import { InquiryForm } from "@/components/inquiry-form";
import { ShowCover } from "@/components/marketing";
import { Flash, StatusChip } from "@/components/ui";
import { all, one } from "@/lib/db";
import { money } from "@/lib/format";
import type { Show } from "@/lib/studio";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ ok?: string; error?: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const show = one<Show>("SELECT * FROM shows WHERE slug = ?", slug);
  return { title: show?.title ?? "Show" };
}

export default async function ShowPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const show = one<Show>("SELECT * FROM shows WHERE slug = ?", slug);
  if (!show) notFound();
  const packages = all<{ id: number; name: string; price_cents: number; description: string }>(
    "SELECT id, name, price_cents, description FROM sponsor_packages WHERE show_id = ? ORDER BY price_cents",
    show.id,
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-8">
      <div className="grid gap-12 lg:grid-cols-[360px_1fr]">
        <ShowCover title={show.title} hue={show.cover_hue} size="lg" />
        <div>
          <div className="flex items-center gap-3">
            <StatusChip status={show.status} />
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted">{show.format}</span>
          </div>
          <h1 className="mt-4 text-5xl font-extrabold">{show.title}</h1>
          <p className="mt-3 text-xl text-muted">{show.tagline}</p>
          <p className="mt-6 max-w-2xl">{show.description}</p>
          <dl className="mt-8 grid max-w-lg grid-cols-3 gap-3">
            {[
              ["Episodes", show.episodes.toLocaleString()],
              ["Avg. listeners", show.avg_listeners ? show.avg_listeners.toLocaleString() : "Pilot"],
              ["Cadence", show.cadence],
            ].map(([k, v]) => (
              <div key={k} className="card p-4">
                <dt className="eyebrow">{k}</dt>
                <dd className="mt-2 font-display text-2xl font-bold">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {packages.length > 0 && (
        <section className="mt-20">
          <p className="eyebrow text-violet-soft">Sponsorship</p>
          <h2 className="mt-3 text-3xl font-bold">Partner with {show.title}</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {packages.map((p, i) => (
              <div key={p.id} className={`card p-6 ${i === packages.length - 1 ? "border-violet/50 shadow-chroma" : ""}`}>
                <p className="eyebrow">{p.name}</p>
                <p className="mt-3 font-display text-3xl font-bold">{money(p.price_cents)}</p>
                <p className="mt-3 text-sm text-muted">{p.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section id="partner" className="mt-16 grid gap-10 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <h2 className="text-3xl font-bold">Start a conversation</h2>
          <p className="mt-3 text-muted">
            Tell us about your brand and goals. We&apos;ll send audience data, past integrations and available dates.
          </p>
        </div>
        <div className="card p-6">
          <Flash ok={sp.ok} error={sp.error} />
          <InquiryForm from={`/shows/${show.slug}#partner`} kind="sponsorship" lockKind showId={show.id} packages={packages} />
        </div>
      </section>
    </div>
  );
}
