# Stack Studio

A podcast studio business in one app: a **public website**, a **member SaaS portal**, and a **back office**, built
around four revenue streams stacked on one studio:

1. **Memberships** – monthly studio hours, priority booking windows and recurring weekly sessions (recurring revenue instead of random hours).
2. **Production** – editing, audio cleanup, thumbnails and short-form clips, ordered after a session and tracked through delivery.
3. **Original shows** – studio-owned shows with sponsorship packages and a sponsor deal pipeline (media IP brands can buy into).
4. **Experiences** – creator mixers, live recordings, workshops and brand events with ticketing.

The UI was designed first in **Google Stitch** (design system "Obsidian Broadcast"). See [`design/`](./design).

## What's inside

| Area | Path | Highlights |
| --- | --- | --- |
| Website | `/`, `/memberships`, `/production`, `/shows`, `/events`, `/contact` | Plan pricing, production menu, show pages with sponsor inquiry → deal pipeline, event ticketing, lead capture |
| Member portal | `/app` | Hours-used meter, booking with availability, priority windows and weekly recurrence, cancellations and refunds, production orders with member discounts and deliverable downloads, plan changes/pause/cancel, billing history |
| Back office | `/admin` | KPI overview (MRR, utilization, pipelines), revenue-by-stream chart, today's room timeline, bookings, members, production kanban with editor assignment and deliverables, shows and sponsorship pipeline, events and guest lists, inquiries, payments ledger, catalog settings (plans, rooms, services) |

### Business rules

- Membership hours reset on the 1st of each month. A session is covered when it fits in the remaining hours; otherwise it is billed at the room's hourly rate.
- Booking window: members book as far ahead as their plan allows (14/30/60 days), and non-members 7 days.
- Recurring weekly sessions are members-only. Each occurrence is checked separately, and conflicts or dates outside the window are skipped and reported.
- Production orders get the plan's discount (0/10/20%).
- Sponsorship revenue is recorded once, when a deal moves to *signed*, *live* or *completed*.
- Every charge is written to `payments` with its stream. The back-office revenue chart and ledger read from that table.

## Stack

Next.js 15 (App Router, server components, server actions) · TypeScript · Tailwind CSS v4 · SQLite (`better-sqlite3`) · JWT session cookies (`jose`) · `bcryptjs`.

There is no external service to configure. The database file is created and seeded with demo data on first run.

## Getting started

```bash
npm install
npm run dev            # http://localhost:3000
```

Demo accounts (password `studio123`):

- `admin@stackstudio.test` – back office
- `member@stackstudio.test` – member portal (Creator plan)

Other scripts:

```bash
npm run typecheck      # tsc --noEmit
npm run build && SESSION_SECRET=<long-random-string> npm start
npm run db:reset       # delete the local DB; it is re-seeded on next start
```

### Configuration

| Variable | Purpose |
| --- | --- |
| `SESSION_SECRET` | **Required in production.** Signs session cookies. |
| `DATABASE_PATH` | SQLite file location (default `./data/studio.db`). |
| `TZ` | Set to the studio's timezone (e.g. `America/Los_Angeles`). Booking times are stored as studio-local wall-clock time. |

## Going live checklist

- **Payments are simulated.** They are recorded in `payments` but no card is charged. Plug in a provider where the code says so: memberships in `app/actions/auth.ts` and `app/actions/member.ts` (e.g. Stripe Billing), and one-off charges in `app/actions/member.ts` and `app/actions/public.ts` (e.g. Stripe Checkout).
- **Email** for ticket confirmations and inquiry replies is not sent yet.
- **Deliverables** are stored as links (Drive, Frame.io, Dropbox). Add object storage if you want uploads.
- SQLite fits a single-server deployment. Move to Postgres if you need several instances.

## Project layout

```
app/
  (site)/        public website
  app/           member portal (auth required)
  admin/         back office (staff/admin only)
  actions/       server actions (auth, member, public, admin)
components/      UI building blocks
lib/             db + schema, seed data, auth/session, domain logic (studio.ts), formatting
design/          Stitch design system (DESIGN.md) and screen references
middleware.ts    route protection for /app and /admin
```
