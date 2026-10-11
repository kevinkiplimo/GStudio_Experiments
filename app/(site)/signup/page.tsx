import type { Metadata } from "next";
import Link from "next/link";
import { signup } from "@/app/actions/auth";
import { Flash } from "@/components/ui";
import { money } from "@/lib/format";
import { plans } from "@/lib/studio";

export const metadata: Metadata = { title: "Create account" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ plan?: string; error?: string }> }) {
  const sp = await searchParams;
  const plan = plans().find((p) => p.slug === sp.plan);
  return (
    <div className="mx-auto max-w-md px-4 py-20">
      <h1 className="text-4xl font-bold">{plan ? `Join ${plan.name}` : "Create your account"}</h1>
      <p className="mt-2 text-muted">
        {plan
          ? `${money(plan.price_cents)}/month · ${plan.hours_per_month} studio hours · book ${plan.booking_window_days} days ahead.`
          : "Book hourly sessions, order production and grab event tickets. Upgrade to a membership any time."}
      </p>
      <div className="card mt-8 p-6">
        <Flash error={sp.error} />
        <form action={signup} className="grid gap-4">
          {plan && <input type="hidden" name="plan" value={plan.slug} />}
          <div>
            <label className="label" htmlFor="name">Name</label>
            <input id="name" name="name" required autoComplete="name" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required autoComplete="email" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input id="password" name="password" type="password" minLength={8} required autoComplete="new-password" className="input" />
          </div>
          <button className="btn-primary">{plan ? `Start ${plan.name} — ${money(plan.price_cents)}/mo` : "Create account"}</button>
          {plan && <p className="text-xs text-dim">Billing is simulated in this build — connect Stripe to charge cards.</p>}
        </form>
      </div>
      <p className="mt-6 text-center text-sm text-muted">
        Already a member? <Link href="/login" className="text-coral-soft hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
