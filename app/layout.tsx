import type { Metadata } from "next";
import { JetBrains_Mono, Space_Grotesk, Syne } from "next/font/google";
import { brand } from "@/lib/brand";
import "./globals.css";

const syne = Syne({ subsets: ["latin"], variable: "--font-syne", weight: ["600", "700", "800"] });
const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono", weight: ["500", "600"] });

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: `${brand.name} — Podcast studio memberships, production & shows`, template: `%s · ${brand.name}` },
  description:
    "Monthly recording memberships, full post-production, original shows brands sponsor, and a creator community — all under one roof.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${syne.variable} ${grotesk.variable} ${mono.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
