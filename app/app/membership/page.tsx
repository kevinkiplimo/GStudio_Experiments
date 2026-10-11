import { changePlan, setMembershipStatus, updateProfile } from "@/app/actions/member";
import { PlanCard } from "@/components/marketing";
import { Flash, PageHeader, StatusChip } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { fmtDateLong } from "@/lib/format";
import { membershipFor, plans } from "@/lib/studio";

export default async function MembershipPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const m = membershipFor(user.id);
  const list = plans();

  return (
    <>
      <PageHeader
        eyebrow="Membership"
        title={m ? `You're on ${m.plan_name}` : "Pick your plan"}
        description={m ? `Member since ${fmtDateLong(m.started_at)}.` : "Monthly hours, priority booking and production discounts. Cancel any time."}
      />
      <Flash ok={sp.ok} error={sp.error} />

      {m && (
        <div className="card mb-10 flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex items-center gap-3">
            <StatusChip status={m.status} />
            <span className="text-sm text-muted">
              {m.status === "paused" ? "Paused — your hours and priority window are on hold." : "Renews on the 1st of every month."}
            </span>
          </div>
          <div className="flex gap-2">
            <form action={setMembershipStatus}>
              <input type="hidden" name="status" value={m.status === "paused" ? "active" : "paused"} />
              <button className="btn-secondary btn-sm">{m.status === "paused" ? "Resume" : "Pause membership"}</button>
            </form>
            <form action={setMembershipStatus}>
              <input type="hidden" name="status" value="cancelled" />
              <button className="btn-danger btn-sm">Cancel</button>
            </form>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {list.map((p, i) => {
          const current = m?.plan_id === p.id;
          return (
            <PlanCard
              key={p.id}
              plan={p}
              featured={current || (!m && i === 1)}
              cta={
                current ? (
                  <span className="btn-secondary pointer-events-none w-full">Current plan</span>
                ) : (
                  <form action={changePlan}>
                    <input type="hidden" name="plan" value={p.id} />
                    <button className={`${!m && i === 1 ? "btn-primary" : "btn-secondary"} w-full`}>
                      {m ? (p.price_cents > m.price_cents ? `Upgrade to ${p.name}` : `Switch to ${p.name}`) : `Join ${p.name}`}
                    </button>
                  </form>
                )
              }
            />
          );
        })}
      </div>

      <section className="card mt-12 max-w-2xl p-6">
        <h2 className="text-lg font-semibold">Profile</h2>
        <form action={updateProfile} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="name">Name</label>
            <input id="name" name="name" defaultValue={user.name} className="input" required />
          </div>
          <div>
            <label className="label" htmlFor="phone">Phone</label>
            <input id="phone" name="phone" defaultValue={user.phone ?? ""} className="input" />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="email">Email</label>
            <input id="email" value={user.email} disabled className="input opacity-60" />
          </div>
          <button className="btn-secondary justify-self-start">Save profile</button>
        </form>
      </section>
    </>
  );
}
