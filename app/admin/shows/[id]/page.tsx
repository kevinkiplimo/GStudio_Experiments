import Link from "next/link";
import { notFound } from "next/navigation";
import { deletePackage, savePackage, saveShow } from "@/app/actions/admin";
import { ShowCover } from "@/components/marketing";
import { Flash, PageHeader } from "@/components/ui";
import { all, one } from "@/lib/db";
import { money } from "@/lib/format";
import type { Show } from "@/lib/studio";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> };

export default async function EditShow({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const isNew = id === "new";
  const show = isNew ? undefined : one<Show>("SELECT * FROM shows WHERE id = ?", Number(id));
  if (!isNew && !show) notFound();
  const packages = show
    ? all<{ id: number; name: string; price_cents: number; description: string }>("SELECT * FROM sponsor_packages WHERE show_id = ? ORDER BY price_cents", show.id)
    : [];
  const from = show ? `/admin/shows/${show.id}` : "/admin/shows/new";

  return (
    <>
      <PageHeader
        eyebrow="Shows & sponsors"
        title={show?.title ?? "New show"}
        actions={show && <Link href={`/shows/${show.slug}`} className="btn-secondary" target="_blank">View public page ↗</Link>}
      />
      <Flash ok={sp.ok} error={sp.error} />
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <form action={saveShow} className="card grid gap-4 p-6 sm:grid-cols-2">
          {show && <input type="hidden" name="id" value={show.id} />}
          <input type="hidden" name="from" value={from} />
          <div className="sm:col-span-2">
            <label className="label" htmlFor="title">Title</label>
            <input id="title" name="title" defaultValue={show?.title} className="input" required />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="tagline">Tagline</label>
            <input id="tagline" name="tagline" defaultValue={show?.tagline} className="input" />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="description">Description</label>
            <textarea id="description" name="description" rows={4} defaultValue={show?.description} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="format">Format</label>
            <input id="format" name="format" defaultValue={show?.format} className="input" placeholder="Video interview · 45 min" />
          </div>
          <div>
            <label className="label" htmlFor="status">Status</label>
            <select id="status" name="status" defaultValue={show?.status ?? "development"} className="input">
              {["development", "production", "live", "paused"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="episodes">Episodes</label>
            <input id="episodes" name="episodes" type="number" min={0} defaultValue={show?.episodes ?? 0} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="avg_listeners">Avg. listeners / episode</label>
            <input id="avg_listeners" name="avg_listeners" type="number" min={0} defaultValue={show?.avg_listeners ?? 0} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="cadence">Cadence</label>
            <input id="cadence" name="cadence" defaultValue={show?.cadence ?? "Weekly"} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="cover_hue">Cover colour (hue 0–359)</label>
            <input id="cover_hue" name="cover_hue" type="number" min={0} max={359} defaultValue={show?.cover_hue ?? 280} className="input" />
          </div>
          <button className="btn-primary justify-self-start">{show ? "Save show" : "Create show"}</button>
        </form>
        {show && <ShowCover title={show.title} hue={show.cover_hue} size="lg" />}
      </div>

      {show && (
        <section className="mt-8">
          <h2 className="mb-4 text-xl font-semibold">Sponsorship packages</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {packages.map((p) => (
              <div key={p.id} className="card p-5">
                <form action={savePackage} className="grid gap-3 sm:grid-cols-[1fr_140px]">
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="show" value={show.id} />
                  <input type="hidden" name="from" value={from} />
                  <input name="name" defaultValue={p.name} className="input" aria-label="Package name" />
                  <input name="price" defaultValue={(p.price_cents / 100).toFixed(0)} className="input" aria-label="Price in dollars" inputMode="decimal" />
                  <textarea name="description" defaultValue={p.description} rows={2} className="input sm:col-span-2" aria-label="Description" />
                  <div className="flex items-center gap-2 sm:col-span-2">
                    <button className="btn-secondary btn-sm">Save</button>
                    <span className="font-mono text-xs text-muted">{money(p.price_cents)}</span>
                    <button formAction={deletePackage} className="btn-ghost ml-auto">Delete</button>
                  </div>
                </form>
              </div>
            ))}
            <div className="card border-dashed p-5">
              <form action={savePackage} className="grid gap-3 sm:grid-cols-[1fr_140px]">
                <input type="hidden" name="show" value={show.id} />
                <input type="hidden" name="from" value={from} />
                <input name="name" placeholder="New package name" className="input" aria-label="Package name" required />
                <input name="price" placeholder="Price ($)" className="input" aria-label="Price in dollars" inputMode="decimal" />
                <textarea name="description" placeholder="What the sponsor gets" rows={2} className="input sm:col-span-2" aria-label="Description" />
                <button className="btn-primary btn-sm justify-self-start">Add package</button>
              </form>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
