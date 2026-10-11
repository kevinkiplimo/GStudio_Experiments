import type { Metadata } from "next";
import Link from "next/link";
import { EventCard } from "@/components/marketing";
import { Empty, Flash } from "@/components/ui";
import { eventsWithSales } from "@/lib/studio";

export const metadata: Metadata = { title: "Events" };

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  const events = eventsWithSales({ upcoming: true, publishedOnly: true });
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-8">
      <Flash error={sp.error} />
      <p className="eyebrow text-ok">Experiences</p>
      <h1 className="mt-3 max-w-3xl text-5xl font-extrabold sm:text-6xl">After hours, baby.</h1>
      <p className="mt-5 max-w-2xl text-lg text-muted">
        Creator mixers, live recordings, workshops and brand events. Come for the night — stay for the community.
      </p>
      <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {events.map((e) => (
          <EventCard key={e.id} e={e} />
        ))}
      </div>
      {events.length === 0 && <Empty>No events on the calendar right now — check back soon.</Empty>}
      <div className="card mt-20 flex flex-wrap items-center justify-between gap-6 p-8">
        <div>
          <h2 className="text-2xl font-bold">Host your own event here</h2>
          <p className="mt-1 text-muted">Launch parties, live tapings, panels and brand activations for up to 100 guests.</p>
        </div>
        <Link href="/contact?kind=private_event" className="btn-primary">Enquire about a private event</Link>
      </div>
    </div>
  );
}
