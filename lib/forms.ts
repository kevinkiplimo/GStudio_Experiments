import { redirect } from "next/navigation";

export const str = (fd: FormData, key: string, max = 2000) => String(fd.get(key) ?? "").trim().slice(0, max);
export const int = (fd: FormData, key: string, fallback = 0) => {
  const n = Number.parseInt(String(fd.get(key) ?? ""), 10);
  return Number.isFinite(n) ? n : fallback;
};
/** Parses a dollar amount ("1,250.50") into cents. */
export const cents = (fd: FormData, key: string) => {
  const n = Number.parseFloat(String(fd.get(key) ?? "").replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
};
export const bool = (fd: FormData, key: string) => fd.get(key) === "on" || fd.get(key) === "1";

/** Only allow redirects back to same-site paths. */
export function safePath(p: string, fallback = "/") {
  return p.startsWith("/") && !p.startsWith("//") ? p : fallback;
}

export function back(path: string, params: Record<string, string>): never {
  const [withoutHash, hash] = path.split("#");
  const [base, existing] = withoutHash.split("?");
  const qs = new URLSearchParams(existing);
  for (const [k, v] of Object.entries(params)) qs.set(k, v);
  redirect(`${base}?${qs.toString()}${hash ? `#${hash}` : ""}`);
}

export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong.");
