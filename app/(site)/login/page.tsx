import type { Metadata } from "next";
import Link from "next/link";
import { login } from "@/app/actions/auth";
import { Flash } from "@/components/ui";
import { DEMO_PASSWORD } from "@/lib/seed";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-md px-4 py-20">
      <h1 className="text-4xl font-bold">Welcome back</h1>
      <p className="mt-2 text-muted">Sign in to book sessions, track production and manage your membership.</p>
      <div className="card mt-8 p-6">
        <Flash error={sp.error} />
        <form action={login} className="grid gap-4">
          <input type="hidden" name="next" value={sp.next ?? ""} />
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required autoComplete="email" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input id="password" name="password" type="password" required autoComplete="current-password" className="input" />
          </div>
          <button className="btn-primary">Sign in</button>
        </form>
      </div>
      <p className="mt-6 text-center text-sm text-muted">
        New here? <Link href="/signup" className="text-coral-soft hover:underline">Create an account</Link>
      </p>
      {process.env.NODE_ENV !== "production" && (
        <div className="mt-8 rounded-xl border border-dashed border-line p-4 font-mono text-xs text-muted">
          <p className="mb-2 uppercase tracking-widest text-amber">Demo accounts · password {DEMO_PASSWORD}</p>
          <p>admin@stackstudio.test — back office</p>
          <p>member@stackstudio.test — member portal</p>
        </div>
      )}
    </div>
  );
}
