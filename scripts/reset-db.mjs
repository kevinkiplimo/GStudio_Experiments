// Deletes the local SQLite database. It is recreated and re-seeded with demo data on the next request.
import fs from "node:fs";
import path from "node:path";

const file = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "studio.db");
for (const f of [file, `${file}-wal`, `${file}-shm`]) {
  if (fs.existsSync(f)) fs.rmSync(f);
}
console.log(`Removed ${file}. Demo data will be re-seeded on next start.`);
