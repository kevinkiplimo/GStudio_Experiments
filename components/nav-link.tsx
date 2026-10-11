"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({
  href,
  children,
  exact,
  variant = "tab",
}: {
  href: string;
  children: React.ReactNode;
  exact?: boolean;
  variant?: "tab" | "side";
}) {
  const path = usePathname();
  const active = exact ? path === href : path === href || path.startsWith(`${href}/`);
  if (variant === "side") {
    return (
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
          active ? "bg-coral/10 text-ink shadow-[inset_2px_0_0_var(--color-coral)]" : "text-muted hover:bg-white/[0.03] hover:text-ink"
        }`}
      >
        {children}
      </Link>
    );
  }
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`shrink-0 border-b-2 px-1 py-3 text-sm transition ${
        active ? "border-coral text-ink" : "border-transparent text-muted hover:text-ink"
      }`}
    >
      {children}
    </Link>
  );
}
