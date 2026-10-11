import type { Metadata } from "next";
import Link from "next/link";
import { ShowCover } from "@/components/marketing";
import { StatusChip } from "@/components/ui";
import { shows } from "@/lib/studio";

export const metadata: Metadata = { title: "Original Shows" };

export default function ShowsPage() {
  const list = shows();
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-8">
      <p className="eyebrow text-violet-soft">Stack Studio Originals</p>
      <h1 className="mt-3 max-w-3xl text-5xl font-extrabold sm:text-6xl">We don&apos;t wait for sponsors. We build shows worth sponsoring.</h1>
      <p className="mt-5 max-w-2xl text-lg text-muted">
        Develop the concept, produce the episodes, grow the audience — then package partnerships around the show.
      </p>
      <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {list.map((s) => (
          <Link key={s.id} href={`/shows/${s.slug}`} className="group">
            <ShowCover title={s.title} hue={s.cover_hue} />
            <div className="mt-4 flex items-center gap-2">
              <StatusChip status={s.status} />
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted">{s.cadence}</span>
            </div>
            <h2 className="mt-2 text-xl font-semibold group-hover:text-coral-soft">{s.title}</h2>
            <p className="mt-1 text-sm text-muted">{s.tagline}</p>
          </Link>
        ))}
      </div>
      <div className="card mt-20 flex flex-wrap items-center justify-between gap-6 p-8">
        <div>
          <h2 className="text-2xl font-bold">Have a show idea that needs a home?</h2>
          <p className="mt-1 text-muted">We co-develop formats with creators and brands.</p>
        </div>
        <Link href="/contact?kind=sponsorship" className="btn-primary">Pitch us</Link>
      </div>
    </div>
  );
}
