import { submitInquiry } from "@/app/actions/public";

const KIND_LABELS: Record<string, string> = {
  general: "Book a tour / general question",
  sponsorship: "Brand partnership / sponsorship",
  private_event: "Private event or live recording",
  production: "Production services",
};

export function InquiryForm({
  from,
  kind = "general",
  showId,
  packages,
  lockKind,
}: {
  from: string;
  kind?: string;
  showId?: number;
  packages?: { id: number; name: string }[];
  lockKind?: boolean;
}) {
  return (
    <form action={submitInquiry} className="grid gap-4">
      <input type="hidden" name="from" value={from} />
      {showId && <input type="hidden" name="show" value={showId} />}
      {lockKind ? (
        <input type="hidden" name="kind" value={kind} />
      ) : (
        <div>
          <label className="label" htmlFor="kind">What can we help with?</label>
          <select id="kind" name="kind" defaultValue={kind} className="input">
            {Object.entries(KIND_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="name">Name</label>
          <input id="name" name="name" required className="input" autoComplete="name" />
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required className="input" autoComplete="email" />
        </div>
      </div>
      <div className={packages?.length ? "grid gap-4 sm:grid-cols-2" : ""}>
        <div>
          <label className="label" htmlFor="company">Company / brand</label>
          <input id="company" name="company" className="input" autoComplete="organization" />
        </div>
        {packages && packages.length > 0 && (
          <div>
            <label className="label" htmlFor="package">Interested in</label>
            <select id="package" name="package" className="input">
              <option value="">Not sure yet</option>
              {packages.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>
      <div>
        <label className="label" htmlFor="message">Message</label>
        <textarea id="message" name="message" rows={4} className="input" placeholder="Dates, goals, budget — anything useful." />
      </div>
      <button className="btn-primary justify-self-start">Send</button>
    </form>
  );
}
