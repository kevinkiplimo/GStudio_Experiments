import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { NavLink } from "@/components/nav-link";
import { Logo } from "@/components/ui";
import { requireUser } from "@/lib/auth";

const TABS = [
  { href: "/app", label: "Dashboard", exact: true },
  { href: "/app/book", label: "Book a session" },
  { href: "/app/sessions", label: "My sessions" },
  { href: "/app/production", label: "Production" },
  { href: "/app/membership", label: "Membership" },
  { href: "/app/billing", label: "Billing" },
];

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="min-h-dvh">
      <header className="glass sticky top-0 z-40 border-x-0 border-t-0">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 pt-3 sm:px-8">
          <Logo href="/app" />
          <span className="chip hidden sm:inline-flex">Member portal</span>
          <div className="ml-auto flex items-center gap-3">
            {user.role !== "member" && (
              <Link href="/admin" className="btn-secondary btn-sm">Back office</Link>
            )}
            <span className="hidden text-sm text-muted sm:inline">{user.name}</span>
            <span className="grid size-8 place-items-center rounded-full bg-raised font-mono text-xs text-coral-soft">
              {user.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
            </span>
            <form action={logout}>
              <button className="btn-ghost">Sign out</button>
            </form>
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-6 overflow-x-auto px-4 sm:px-8">
          {TABS.map((t) => (
            <NavLink key={t.href} href={t.href} exact={t.exact}>{t.label}</NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-8">{children}</main>
    </div>
  );
}
