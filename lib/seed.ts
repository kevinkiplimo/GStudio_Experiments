import type Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import { addDays, addHours, monthStart, nowLocal } from "./time";

/** Demo password for every seeded account. */
export const DEMO_PASSWORD = "studio123";

// Small deterministic PRNG so the demo data looks the same on every fresh install.
function rng(seedValue: number) {
  let s = seedValue;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export function seed(db: Database.Database) {
  const rand = rng(42);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
  const hash = bcrypt.hashSync(DEMO_PASSWORD, 10);
  const now = nowLocal();
  const today = now.slice(0, 10);

  const tx = db.transaction(() => {
    // ---- Plans -----------------------------------------------------------
    const insPlan = db.prepare(
      `INSERT INTO plans (slug,name,price_cents,hours_per_month,booking_window_days,production_discount_pct,description,features,sort)
       VALUES (?,?,?,?,?,?,?,?,?)`,
    );
    insPlan.run("starter", "Starter", 19900, 4, 14, 0, "For new shows finding their rhythm.", JSON.stringify([
      "4 studio hours every month",
      "Book up to 14 days ahead",
      "Member rate on extra hours",
      "Access to creator mixers",
    ]), 1);
    insPlan.run("creator", "Creator", 44900, 10, 30, 10, "For weekly shows that need a reliable slot.", JSON.stringify([
      "10 studio hours every month",
      "Priority booking 30 days ahead",
      "Lock in a recurring weekly session",
      "10% off all production",
      "Free entry to workshops",
    ]), 2);
    insPlan.run("pro", "Pro", 89900, 24, 60, 20, "For shows running like a media business.", JSON.stringify([
      "24 studio hours every month",
      "Priority booking 60 days ahead",
      "Multiple recurring sessions",
      "20% off all production",
      "Dedicated producer check-ins",
      "First look at sponsorship deals",
    ]), 3);

    // ---- Rooms -----------------------------------------------------------
    const insRoom = db.prepare(`INSERT INTO rooms (slug,name,description,hourly_rate_cents,capacity) VALUES (?,?,?,?,?)`);
    insRoom.run("studio-a", "Studio A — The Lounge", "Warm, sofa-style set for conversational shows. 4 mics, 3 cameras.", 9500, 4);
    insRoom.run("studio-b", "Studio B — Video Set", "Three-camera 4K set with switchable backdrops and key lighting.", 15000, 3);
    insRoom.run("studio-c", "Studio C — Solo Booth", "Treated booth for solo episodes, voiceover and audiobooks.", 6000, 1);

    // ---- Services --------------------------------------------------------
    const insSvc = db.prepare(
      `INSERT INTO services (name,category,description,price_cents,unit,turnaround_days,is_package,sort) VALUES (?,?,?,?,?,?,?,?)`,
    );
    insSvc.run("Full episode edit (audio)", "Editing", "Cut the ums, tighten the pacing, add intro/outro.", 15000, "per episode", 3, 0, 1);
    insSvc.run("Multi-cam video edit", "Editing", "Camera switching, lower thirds and colour for YouTube.", 30000, "per episode", 5, 0, 2);
    insSvc.run("Audio cleanup & mastering", "Audio", "Noise removal, levelling and loudness mastering.", 7500, "per episode", 2, 0, 3);
    insSvc.run("Thumbnail set", "Design", "3 click-tested thumbnail options.", 9000, "set of 3", 2, 0, 4);
    insSvc.run("Short-form clips", "Clips", "6 vertical clips with captions for TikTok, Reels and Shorts.", 18000, "pack of 6", 3, 0, 5);
    insSvc.run("Show notes & transcript", "Writing", "SEO show notes, chapters and a full transcript.", 4500, "per episode", 2, 0, 6);
    insSvc.run("Content Library Package", "Package", "Full edit, audio cleanup, 3 thumbnails and 6 short-form clips. Walk in with an idea, leave with a content library.", 49900, "per episode", 4, 1, 7);
    insSvc.run("Show Launch Package", "Package", "Trailer, first 3 episodes edited, cover art and launch clips.", 149900, "per launch", 14, 1, 8);

    // ---- Users -----------------------------------------------------------
    const insUser = db.prepare(`INSERT INTO users (name,email,password_hash,role,phone,created_at) VALUES (?,?,?,?,?,?)`);
    const created = (daysAgo: number) => addDays(now, -daysAgo).replace("T", " ") + ":00";
    insUser.run("Jordan Reyes", "admin@stackstudio.test", hash, "admin", "", created(400));
    insUser.run("Sam Okafor", "sam@stackstudio.test", hash, "staff", "", created(300));
    insUser.run("Lena Park", "lena@stackstudio.test", hash, "staff", "", created(250));
    const editors = [2, 3];

    const members: { name: string; email: string; plan: string; since: number }[] = [
      { name: "Maya Johnson", email: "member@stackstudio.test", plan: "creator", since: 210 },
      { name: "Devon Carter", email: "devon@example.com", plan: "pro", since: 190 },
      { name: "Aaliyah Brooks", email: "aaliyah@example.com", plan: "creator", since: 170 },
      { name: "Marcus Lee", email: "marcus@example.com", plan: "starter", since: 160 },
      { name: "Priya Shah", email: "priya@example.com", plan: "pro", since: 150 },
      { name: "Tasha Green", email: "tasha@example.com", plan: "creator", since: 120 },
      { name: "Chris Alvarez", email: "chris@example.com", plan: "starter", since: 100 },
      { name: "Nia Thompson", email: "nia@example.com", plan: "creator", since: 80 },
      { name: "Omar Haddad", email: "omar@example.com", plan: "starter", since: 60 },
      { name: "Jess Morgan", email: "jess@example.com", plan: "creator", since: 40 },
      { name: "Kofi Mensah", email: "kofi@example.com", plan: "pro", since: 25 },
      { name: "Riley Chen", email: "riley@example.com", plan: "", since: 15 },
    ];
    const planRow = (slug: string) =>
      db.prepare("SELECT id, name, price_cents FROM plans WHERE slug = ?").get(slug) as
        | { id: number; name: string; price_cents: number }
        | undefined;
    const insMembership = db.prepare(`INSERT INTO memberships (user_id,plan_id,status,started_at) VALUES (?,?,?,?)`);
    const insPayment = db.prepare(`INSERT INTO payments (user_id,stream,amount_cents,description,created_at) VALUES (?,?,?,?,?)`);
    const memberIds: number[] = [];
    for (const m of members) {
      const uid = Number(insUser.run(m.name, m.email, hash, "member", "", created(m.since)).lastInsertRowid);
      memberIds.push(uid);
      const plan = m.plan ? planRow(m.plan) : undefined;
      if (!plan) continue;
      const started = addDays(now, -m.since);
      insMembership.run(uid, plan.id, "active", started);
      // One membership charge per month since joining.
      for (let month = monthStart(started); month <= now; month = monthStart(addDays(month, 32))) {
        const chargeAt = month < started ? started : addHours(month, 9);
        insPayment.run(uid, "membership", plan.price_cents, `${plan.name} membership`, chargeAt.replace("T", " ") + ":00");
      }
    }

    // ---- Bookings --------------------------------------------------------
    const planHours: Record<string, number> = { starter: 4, creator: 10, pro: 24 };
    const rooms = db.prepare("SELECT id, hourly_rate_cents FROM rooms").all() as { id: number; hourly_rate_cents: number }[];
    const overlaps = db.prepare(
      `SELECT 1 FROM bookings WHERE room_id = ? AND status IN ('confirmed','completed') AND starts_at < ? AND ends_at > ? LIMIT 1`,
    );
    const insBooking = db.prepare(
      `INSERT INTO bookings (user_id,room_id,starts_at,ends_at,status,series_id,uses_membership,price_cents,notes) VALUES (?,?,?,?,?,?,?,?,?)`,
    );
    // Track membership hours per member per month so seeded usage respects each plan's allowance.
    const allowance = new Map<number, number>();
    members.forEach((m, i) => allowance.set(memberIds[i], m.plan ? planHours[m.plan] : 0));
    const usage = new Map<string, number>();
    const book = (uid: number, roomId: number, start: string, hours: number, series: string | null, hasPlan: boolean) => {
      const end = addHours(start, hours);
      if (overlaps.get(roomId, end, start)) return null;
      const room = rooms.find((r) => r.id === roomId)!;
      const key = `${uid}:${start.slice(0, 7)}`;
      const used = usage.get(key) ?? 0;
      const member = hasPlan && used + hours <= (allowance.get(uid) ?? 0);
      if (member) usage.set(key, used + hours);
      const status = end <= now ? "completed" : "confirmed";
      const price = member ? 0 : room.hourly_rate_cents * hours;
      const id = Number(insBooking.run(uid, roomId, start, end, status, series, member ? 1 : 0, price, "").lastInsertRowid);
      if (!member) insPayment.run(uid, "hourly", price, `Hourly booking`, addDays(start, -2).replace("T", " ") + ":00");
      return id;
    };

    // Maya's recurring weekly Tuesday session, 10:00–11:30 in Studio A.
    const d = new Date();
    const daysToTue = (2 - d.getDay() + 7) % 7;
    const firstTue = addDays(`${today}T10:00`, daysToTue - 42);
    for (let w = 0; w < 10; w++) book(memberIds[0], 1, addDays(firstTue, w * 7), 1.5, "series-maya-tue", true);
    // Plus one extra video session next week.
    book(memberIds[0], 2, addDays(`${today}T14:00`, 8), 2, null, true);

    // A spread of other sessions over the past 6 weeks and the next 3 weeks.
    for (let day = -42; day <= 21; day++) {
      const sessions = 2 + Math.floor(rand() * 4);
      for (let i = 0; i < sessions; i++) {
        // Skip the demo member (index 0) so their dashboard tells a clean story.
        const idx = 1 + Math.floor(rand() * (memberIds.length - 1));
        const uid = memberIds[idx];
        const hasPlan = members[idx].plan !== "";
        const hour = 9 + Math.floor(rand() * 11);
        const hours = pick([1, 2, 2, 3]);
        if (hour + hours > 22) continue;
        book(uid, pick(rooms).id, addDays(`${today}T${String(hour).padStart(2, "0")}:00`, day), hours, null, hasPlan);
      }
    }

    // ---- Production orders ----------------------------------------------
    const services = db.prepare("SELECT id, name, price_cents, turnaround_days FROM services").all() as {
      id: number; name: string; price_cents: number; turnaround_days: number;
    }[];
    const insOrder = db.prepare(
      `INSERT INTO orders (user_id,booking_id,status,notes,subtotal_cents,discount_cents,total_cents,due_date,assignee_id,created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
    );
    const insItem = db.prepare(`INSERT INTO order_items (order_id,service_id,name,qty,unit_price_cents) VALUES (?,?,?,?,?)`);
    const insDeliv = db.prepare(`INSERT INTO deliverables (order_id,title,url,kind,created_at) VALUES (?,?,?,?,?)`);
    const discountFor = db.prepare(
      `SELECT p.production_discount_pct AS pct FROM memberships m JOIN plans p ON p.id = m.plan_id WHERE m.user_id = ? AND m.status = 'active'`,
    );
    const completed = db.prepare(
      `SELECT id, user_id, ends_at FROM bookings WHERE status = 'completed' ORDER BY starts_at DESC LIMIT 60`,
    ).all() as { id: number; user_id: number; ends_at: string }[];
    // Give the demo member a few orders at different stages, then fill in everyone else's.
    const pastBookings = [
      ...completed.filter((b) => b.user_id === memberIds[0]).slice(0, 3),
      ...completed.filter((b) => b.user_id !== memberIds[0]).slice(0, 36),
    ];
    const bundles = [[6], [0, 2], [0, 3, 4], [1, 3], [4], [0, 2, 5], [6], [1, 4, 3]];
    pastBookings.forEach((b, i) => {
      if (i % 2 === 1 && i > 6) return;
      const items = bundles[i % bundles.length].map((ix) => services[ix]);
      const subtotal = items.reduce((s, it) => s + it.price_cents, 0);
      const pct = (discountFor.get(b.user_id) as { pct: number } | undefined)?.pct ?? 0;
      const discount = Math.round((subtotal * pct) / 100);
      const turnaround = Math.max(...items.map((it) => it.turnaround_days));
      const createdAt = b.ends_at;
      const due = addDays(createdAt, turnaround).slice(0, 10);
      const ageDays = (Date.now() - new Date(createdAt).getTime()) / 86_400_000;
      const status = ageDays > 6 ? "delivered" : ageDays > 4 ? "review" : ageDays > 2 ? "in_progress" : "requested";
      const assignee = status === "requested" ? null : editors[i % 2];
      const notes = pick(["", "Please cut the first 5 minutes of small talk.", "Clips: focus on the funding story.", "Use our new intro music.", ""]);
      const oid = Number(
        insOrder.run(b.user_id, b.id, status, notes, subtotal, discount, subtotal - discount, due, assignee, createdAt.replace("T", " ") + ":00")
          .lastInsertRowid,
      );
      for (const it of items) insItem.run(oid, it.id, it.name, 1, it.price_cents);
      insPayment.run(b.user_id, "production", subtotal - discount, `Production order #${oid}`, createdAt.replace("T", " ") + ":00");
      if (status === "delivered") {
        const at = addDays(createdAt, turnaround).replace("T", " ") + ":00";
        insDeliv.run(oid, "Final episode master", "https://example.com/deliverables/episode-master.mp4", "video", at);
        if (items.some((it) => it.name.includes("clips") || it.name.includes("Package")))
          insDeliv.run(oid, "Short-form clips (6)", "https://example.com/deliverables/clips.zip", "clips", at);
        if (items.some((it) => it.name.includes("Thumbnail") || it.name.includes("Package")))
          insDeliv.run(oid, "Thumbnails", "https://example.com/deliverables/thumbnails.zip", "image", at);
      }
    });

    // ---- Shows & sponsorship --------------------------------------------
    const insShow = db.prepare(
      `INSERT INTO shows (slug,title,tagline,description,format,status,episodes,avg_listeners,cadence,cover_hue) VALUES (?,?,?,?,?,?,?,?,?,?)`,
    );
    const insPkg = db.prepare(`INSERT INTO sponsor_packages (show_id,name,price_cents,description) VALUES (?,?,?,?)`);
    const insDeal = db.prepare(
      `INSERT INTO deals (show_id,package_id,brand,contact_name,contact_email,status,value_cents,paid,notes,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)`,
    );
    const shows = [
      {
        slug: "built-different", title: "Built Different", tagline: "Founders on the moment everything almost fell apart.",
        description: "Long-form conversations with first-time founders about the decisions that made — or nearly broke — their companies.",
        format: "Video interview · 50 min", status: "live", episodes: 86, listeners: 42000, cadence: "Weekly", hue: 345,
      },
      {
        slug: "night-shift", title: "Night Shift", tagline: "Creatives who do their best work after dark.",
        description: "Musicians, chefs, DJs and designers on the craft, the grind and the culture of working nights.",
        format: "Lounge conversation · 40 min", status: "live", episodes: 34, listeners: 18500, cadence: "Bi-weekly", hue: 275,
      },
      {
        slug: "money-moves-daily", title: "Money Moves Daily", tagline: "Ten minutes of money news for people building wealth.",
        description: "A fast daily briefing on markets, side income and personal finance — produced in Studio C every weekday morning.",
        format: "Solo daily · 10 min", status: "production", episodes: 6, listeners: 2400, cadence: "Weekdays", hue: 32,
      },
      {
        slug: "the-group-chat", title: "The Group Chat", tagline: "Three friends, zero filter, one hot topic a week.",
        description: "A panel show in development. Pilot taping with a live audience at our next recording night.",
        format: "Panel · 45 min", status: "development", episodes: 0, listeners: 0, cadence: "Weekly", hue: 190,
      },
    ];
    const brands = ["Northwind Bank", "Lumen Coffee", "Kinetic Shoes", "Arcadia Hosting", "Bloom Skincare", "Fieldnote Notebooks", "Orbit Mobile"];
    const dealStatuses = ["completed", "live", "signed", "negotiating", "pitched", "lead", "lost"] as const;
    let b = 0;
    for (const s of shows) {
      const sid = Number(
        insShow.run(s.slug, s.title, s.tagline, s.description, s.format, s.status, s.episodes, s.listeners, s.cadence, s.hue).lastInsertRowid,
      );
      const scale = Math.max(1, Math.round(s.listeners / 10000));
      const pkgs = [
        Number(insPkg.run(sid, "Pre-roll spot", 75000 * scale, "15-second pre-roll on every episode for a month.").lastInsertRowid),
        Number(insPkg.run(sid, "Host-read mid-roll", 150000 * scale, "60-second host-read ad plus a link in the show notes for 4 episodes.").lastInsertRowid),
        Number(insPkg.run(sid, "Presenting sponsor", 600000 * scale, "Season naming rights, branded segment, social clips and a live event activation.").lastInsertRowid),
      ];
      if (s.status === "development") continue;
      const dealCount = s.status === "live" ? 4 : 2;
      for (let i = 0; i < dealCount; i++) {
        const status = dealStatuses[(b + i) % dealStatuses.length];
        const pkgIdx = i % 3;
        const value = [75000, 150000, 600000][pkgIdx] * scale;
        const paid = status === "signed" || status === "live" || status === "completed" ? 1 : 0;
        const at = addDays(now, -Math.floor(rand() * 150) - 5);
        const brand = brands[(b + i) % brands.length];
        insDeal.run(sid, pkgs[pkgIdx], brand, "Partnerships team", `partners@${brand.toLowerCase().replace(/\s+/g, "")}.example`, status, value, paid, "", at.replace("T", " ") + ":00");
        if (paid) insPayment.run(null, "sponsorship", value, `${brand} × ${s.title}`, addDays(at, 7).replace("T", " ") + ":00");
      }
      b += dealCount;
    }

    // ---- Events ----------------------------------------------------------
    const insEvent = db.prepare(
      `INSERT INTO events (slug,title,kind,description,starts_at,ends_at,capacity,price_cents,published) VALUES (?,?,?,?,?,?,?,?,1)`,
    );
    const insTicket = db.prepare(`INSERT INTO tickets (event_id,user_id,name,email,qty,total_cents,created_at) VALUES (?,?,?,?,?,?,?)`);
    const events = [
      { slug: "creator-mixer-past", title: "Creator Mixer: Summer Edition", kind: "mixer", day: -24, hour: 19, len: 3, cap: 60, price: 2500, sold: 52,
        desc: "Drinks, DJ and speed-collabs with the studio's creator community." },
      { slug: "creator-mixer", title: "Creator Mixer: Collab Night", kind: "mixer", day: 9, hour: 19, len: 3, cap: 60, price: 2500, sold: 31,
        desc: "Meet hosts, editors and brand managers. Bring your pitch — leave with a co-host." },
      { slug: "built-different-live", title: "Built Different — Live Taping", kind: "live_recording", day: 16, hour: 18, len: 2, cap: 80, price: 3500, sold: 57,
        desc: "Watch a live recording of Built Different with a surprise founder guest and audience Q&A." },
      { slug: "grow-your-show", title: "Workshop: Grow Your Show to 10k", kind: "workshop", day: 23, hour: 11, len: 3, cap: 25, price: 9900, sold: 14,
        desc: "A hands-on session on clips strategy, guest booking and packaging your show for sponsors." },
      { slug: "brand-night-lumen", title: "Lumen Coffee Brand Night", kind: "brand_event", day: 30, hour: 18, len: 3, cap: 100, price: 0, sold: 40,
        desc: "An invite-only activation hosted with Lumen Coffee — live tastings and a podcast panel." },
    ];
    for (const e of events) {
      const start = addDays(`${today}T${String(e.hour).padStart(2, "0")}:00`, e.day);
      const eid = Number(insEvent.run(e.slug, e.title, e.kind, e.desc, start, addHours(start, e.len), e.cap, e.price).lastInsertRowid);
      let sold = 0;
      let n = 0;
      while (sold < e.sold) {
        const qty = Math.min(e.sold - sold, 1 + Math.floor(rand() * 3));
        const memberIdx = n % memberIds.length;
        const isMember = n % 3 === 0;
        const name = isMember ? members[memberIdx].name : `Guest ${n + 1}`;
        const email = isMember ? members[memberIdx].email : `guest${n + 1}@example.com`;
        const at = addDays(start, -1 - Math.floor(rand() * 20));
        insTicket.run(eid, isMember ? memberIds[memberIdx] : null, name, email, qty, qty * e.price, at.replace("T", " ") + ":00");
        if (e.price > 0) insPayment.run(isMember ? memberIds[memberIdx] : null, "events", qty * e.price, `${e.title} × ${qty}`, at.replace("T", " ") + ":00");
        sold += qty;
        n++;
      }
    }

    // ---- Inquiries -------------------------------------------------------
    const insInq = db.prepare(`INSERT INTO inquiries (kind,name,email,company,message,status,created_at) VALUES (?,?,?,?,?,?,?)`);
    const inquiries = [
      ["sponsorship", "Dana Whitfield", "dana@orbitmobile.example", "Orbit Mobile", "Interested in a Q1 presenting sponsorship on Built Different.", "new", 1],
      ["private_event", "Elena Ruiz", "elena@example.com", "", "Looking to host a 40-person album listening party on a Friday night.", "new", 2],
      ["production", "Tyler Brooks", "tyler@example.com", "Brooks Media", "We record remotely — can you do edits and clips for 4 episodes a month?", "contacted", 4],
      ["sponsorship", "Grace Kim", "grace@bloom.example", "Bloom Skincare", "Would love to explore a host-read campaign on Night Shift.", "contacted", 6],
      ["private_event", "Andre Wallace", "andre@example.com", "Wallace & Co", "Company offsite + live panel recording for 60 people.", "won", 12],
      ["general", "Sophie Turner", "sophie@example.com", "", "Do you offer tours before signing up for a membership?", "new", 0],
    ] as const;
    for (const [kind, name, email, company, message, status, days] of inquiries)
      insInq.run(kind, name, email, company, message, status, addDays(now, -days).replace("T", " ") + ":00");
  });
  tx();
}
