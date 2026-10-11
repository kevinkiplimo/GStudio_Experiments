import Link from "next/link";
import { getUser } from "@/lib/auth";
import { brand } from "@/lib/brand";
import { Logo, OnAir } from "@/components/ui";

const NAV = [
  { href: "/memberships", label: "Memberships" },
  { href: "/production", label: "Production" },
  { href: "/shows", label: "Shows" },
  { href: "/events", label: "Events" },
];

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  const home = user ? (user.role === "member" ? "/app" : "/admin") : null;
  return (
    <>
      <header className="glass sticky top-0 z-40 border-x-0 border-t-0">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3.5 sm:px-8">
          <Logo />
          <span className="hidden md:inline-flex"><OnAir /></span>
          <nav className="ml-auto hidden items-center gap-7 text-sm text-muted lg:flex">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="transition hover:text-ink">{n.label}</Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2 lg:ml-4">
            {home ? (
              <Link href={home} className="btn-primary btn-sm">{user!.role === "member" ? "My studio" : "Back office"}</Link>
            ) : (
              <>
                <Link href="/login" className="btn-ghost hidden sm:inline-flex">Sign in</Link>
                <Link href="/memberships" className="btn-primary btn-sm">Become a member</Link>
              </>
            )}
          </div>
        </div>
        <nav className="flex gap-5 overflow-x-auto border-t border-line px-4 py-2 text-sm text-muted lg:hidden">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="shrink-0 hover:text-ink">{n.label}</Link>
          ))}
        </nav>
      </header>
      <main>{children}</main>
      <footer className="mt-24 border-t border-line">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <Logo />
            <p className="mt-4 max-w-sm text-sm text-muted">
              Memberships, production, original shows and experiences — all from one studio in the {brand.city}.
            </p>
          </div>
          <div>
            <p className="eyebrow mb-3">Studio</p>
            <ul className="space-y-2 text-sm text-muted">
              {NAV.map((n) => (
                <li key={n.href}><Link href={n.href} className="hover:text-ink">{n.label}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <p className="eyebrow mb-3">Talk to us</p>
            <ul className="space-y-2 text-sm text-muted">
              <li><Link href="/contact?kind=general" className="hover:text-ink">Book a tour</Link></li>
              <li><Link href="/contact?kind=sponsorship" className="hover:text-ink">Partner with us</Link></li>
              <li><Link href="/contact?kind=private_event" className="hover:text-ink">Host a private event</Link></li>
              <li><a href={`mailto:${brand.email}`} className="hover:text-ink">{brand.email}</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-line px-4 py-5 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-dim">
          © {new Date().getFullYear()} {brand.name} · {brand.city}
        </div>
      </footer>
    </>
  );
}
