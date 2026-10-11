import type { Metadata } from "next";
import { InquiryForm } from "@/components/inquiry-form";
import { Flash } from "@/components/ui";
import { brand } from "@/lib/brand";

export const metadata: Metadata = { title: "Contact" };

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ kind?: string; ok?: string; error?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-8 lg:grid-cols-2">
      <div>
        <p className="eyebrow">Contact</p>
        <h1 className="mt-3 text-5xl font-extrabold">Let&apos;s make something.</h1>
        <p className="mt-5 text-lg text-muted">
          Tours, sponsorships, private events or production for shows recorded elsewhere — tell us what you need and
          we&apos;ll get back within one business day.
        </p>
        <dl className="mt-10 space-y-4 text-sm">
          <div>
            <dt className="eyebrow">Studio</dt>
            <dd className="mt-1">{brand.city}</dd>
          </div>
          <div>
            <dt className="eyebrow">Hours</dt>
            <dd className="mt-1">Daily, {brand.studioOpenHour}am – {brand.studioCloseHour - 12}pm · events after hours</dd>
          </div>
          <div>
            <dt className="eyebrow">Email</dt>
            <dd className="mt-1">{brand.email}</dd>
          </div>
        </dl>
      </div>
      <div className="card p-6 sm:p-8">
        <Flash ok={sp.ok} error={sp.error} />
        <InquiryForm from="/contact" kind={sp.kind ?? "general"} />
      </div>
    </div>
  );
}
