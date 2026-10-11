import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { NavLink } from "@/components/nav-link";
import { Logo } from "@/components/ui";
import { requireStaff } from "@/lib/auth";
import { one } from "@/lib/db";

export const metadata = { title: "Back office" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();
  const counts = one<{ inquiries: number; requested: number }>(
    "SELECT (SELECT COUNT(*) FROM inquiries WHERE status = 'new') AS inquiries, (SELECT COUNT(*) FROM orders WHERE status = 'requested') AS requested",
  )!;
  const NAV = [
    { href: "/admin", label: "Overview", exact: true },
    { href: "/admin/bookings", label: "Bookings" },
    { href: "/admin/members", label: "Members" },
    { href: "/admin/production", label: "Production", badge: counts.requested },
    { href: "/admin/shows", label: "Shows & Sponsors" },
    { href: "/admin/events", label: "Events" },
    { href: "/admin/inquiries", label: "Inquiries", badge: counts.inquiries },
    { href: "/admin/payments", label: "Payments" },
    { href: "/admin/settings", label: "Settings" },
  ];

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="border-b border-line bg-panel lg:sticky lg:top-0 lg:h-dvh lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between px-5 py-4 lg:block">
          <Logo href="/admin" />
          <p className="eyebrow mt-1 hidden lg:block">Back office</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible">
          {NAV.map((n) => (
            <NavLink key={n.href} href={n.href} exact={n.exact} variant="side">
              <span className="flex-1 whitespace-nowrap">{n.label}</span>
              {!!n.badge && <span className="rounded-full bg-coral px-1.5 font-mono text-[10px] text-white">{n.badge}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="hidden border-t border-line px-5 py-4 lg:absolute lg:inset-x-0 lg:bottom-0 lg:block">
          <p className="text-sm">{user.name}</p>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">{user.role}</p>
          <div className="mt-3 flex gap-2">
            <Link href="/" className="btn-ghost px-0">View site</Link>
            <form action={logout}><button className="btn-ghost">Sign out</button></form>
          </div>
        </div>
      </aside>
      <main className="min-w-0 px-4 py-8 sm:px-8">{children}</main>
    </div>
  );
}
