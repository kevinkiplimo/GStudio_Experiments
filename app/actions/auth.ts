"use server";

import { redirect } from "next/navigation";
import { one, run, db } from "@/lib/db";
import { checkPassword, endSession, hashPassword, startSession } from "@/lib/auth";
import { back, safePath, str } from "@/lib/forms";
import type { Role } from "@/lib/session";

export async function login(fd: FormData) {
  const email = str(fd, "email", 200).toLowerCase();
  const password = str(fd, "password", 200);
  const next = safePath(str(fd, "next"), "");
  const user = one<{ id: number; role: Role; password_hash: string }>(
    "SELECT id, role, password_hash FROM users WHERE email = ?",
    email,
  );
  if (!user || !(await checkPassword(password, user.password_hash))) {
    back("/login", { error: "That email and password don't match.", ...(next ? { next } : {}) });
  }
  await startSession(user);
  redirect(next || (user.role === "member" ? "/app" : "/admin"));
}

export async function signup(fd: FormData) {
  const name = str(fd, "name", 120);
  const email = str(fd, "email", 200).toLowerCase();
  const password = str(fd, "password", 200);
  const planSlug = str(fd, "plan", 40);
  const retry = `/signup${planSlug ? `?plan=${encodeURIComponent(planSlug)}` : ""}`;

  if (!name || !/^\S+@\S+\.\S+$/.test(email)) back(retry, { error: "Enter your name and a valid email." });
  if (password.length < 8) back(retry, { error: "Use a password with at least 8 characters." });
  if (one("SELECT 1 FROM users WHERE email = ?", email)) back(retry, { error: "An account with that email already exists — sign in instead." });

  const plan = planSlug
    ? one<{ id: number; name: string; price_cents: number }>("SELECT id, name, price_cents FROM plans WHERE slug = ? AND active = 1", planSlug)
    : undefined;
  const hash = await hashPassword(password);

  const userId = db.transaction(() => {
    const id = Number(run("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'member')", name, email, hash).lastInsertRowid);
    if (plan) {
      run("INSERT INTO memberships (user_id, plan_id, status, started_at) VALUES (?, ?, 'active', strftime('%Y-%m-%dT%H:%M','now','localtime'))", id, plan.id);
      // Payment capture would happen here with your payment provider (e.g. Stripe Checkout).
      run("INSERT INTO payments (user_id, stream, amount_cents, description) VALUES (?, 'membership', ?, ?)", id, plan.price_cents, `${plan.name} membership`);
    }
    return id;
  })();

  await startSession({ id: userId, role: "member" });
  redirect(plan ? `/app?ok=${encodeURIComponent(`Welcome to ${plan.name}! Your hours are ready to book.`)}` : "/app/membership");
}

export async function logout() {
  await endSession();
  redirect("/");
}
