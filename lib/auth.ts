import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { one } from "./db";
import { SESSION_COOKIE, signSession, verifySession, type Role } from "./session";

export type User = { id: number; name: string; email: string; role: Role; phone: string | null; created_at: string };

export async function getUser(): Promise<User | null> {
  const store = await cookies();
  const session = await verifySession(store.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  return one<User>("SELECT id, name, email, role, phone, created_at FROM users WHERE id = ?", session.uid) ?? null;
}

export async function requireUser(): Promise<User> {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

/** Admins and staff can use the back office. */
export async function requireStaff(): Promise<User> {
  const user = await requireUser();
  if (user.role === "member") redirect("/app");
  return user;
}

export async function startSession(user: { id: number; role: Role }) {
  const store = await cookies();
  store.set(SESSION_COOKIE, await signSession({ uid: user.id, role: user.role }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function endSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export const hashPassword = (pw: string) => bcrypt.hash(pw, 10);
export const checkPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);
