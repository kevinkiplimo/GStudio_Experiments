# Design

The UI was designed first in **Google Stitch** and then implemented in code.

- Stitch project: `projects/11021141101500810294` — "Stack Studio — Podcast Studio Platform"
  (open it at https://stitch.withgoogle.com)
- Design system: **Obsidian Broadcast** (`assets/7ce9154542cb484595313a3d5e717eea`). The full token
  set and component guidance lives in [`DESIGN.md`](./DESIGN.md) and is mapped to Tailwind
  theme tokens in `app/globals.css`.

| Screen | Stitch screen id | Implemented at |
| --- | --- | --- |
| Stack Studio – Homepage | `0170f2679b894b8c95016a96fff17dee` | `app/(site)/page.tsx` |
| Member Portal Dashboard | `36d840ea66bc46f8a9f72015a193e57c` | `app/app/page.tsx` |
| Book a Session | `54645db0bf884deb8f3d5cd50781a0e6` | `app/app/book/page.tsx` |
| Admin Operations Dashboard | `8f54e9918d76431bab30037a9b9189d8` | `app/admin/page.tsx` |
| Production Pipeline | `5ad63d48816641b58832a85e4177b819` | `app/admin/production/page.tsx` |

Screenshots of the built app (seeded demo data) are in [`screenshots/`](./screenshots).
