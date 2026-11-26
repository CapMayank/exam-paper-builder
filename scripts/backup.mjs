// Backs up everything the app stores: the SQLite database and data/uploads (figures, logos).
//
//   node scripts/backup.mjs                 -> writes backups/exam-paper-builder-<timestamp>.tar.gz
//   node scripts/backup.mjs --include-env   -> also stores .env (secrets: archives are chmod 600, bucket must stay private)
//
// Settings (environment variables, or .env):
//   BACKUP_DIR            where archives go            (default: <project>/backups)
//   BACKUP_KEEP           how many archives to keep    (default: 14)
//   BACKUP_RCLONE_REMOTE  e.g. "oci:exam-backups" - if set, each archive is also copied there
//                         with rclone (needs rclone installed + configured; off-site copy)
//   BACKUP_REMOTE_KEEP_DAYS  off-site archives older than this are deleted (default: 60, min 7)
//
// The database is copied with SQLite's VACUUM INTO, which gives a consistent snapshot while the
// app is running (a plain file copy could catch it mid-write).
import { PrismaClient } from "@prisma/client";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

try { process.loadEnvFile(".env"); } catch { /* no .env: rely on the real environment */ }

const ROOT = process.cwd();
const BACKUP_DIR = path.resolve(process.env.BACKUP_DIR || path.join(ROOT, "backups"));
const KEEP = Math.max(1, Number(process.env.BACKUP_KEEP) || 14);
const PREFIX = "exam-paper-builder-";
const includeEnv = process.argv.includes("--include-env");

function sqliteFile() {
  const m = (process.env.DATABASE_URL || "").match(/^file:(.+)$/);
  if (!m) throw new Error("DATABASE_URL must be a file: SQLite URL");
  // Prisma resolves relative SQLite paths against the schema folder
  return path.isAbsolute(m[1]) ? m[1] : path.resolve(ROOT, "prisma", m[1]);
}

async function main() {
  const dbFile = sqliteFile();
  if (!fs.existsSync(dbFile)) throw new Error(`Database not found: ${dbFile}`);

  const stamp = new Date().toISOString().replace(/[:.]/g, "-").replace("T", "_").slice(0, 19);
  const name = `${PREFIX}${stamp}`;
  const staging = path.join(BACKUP_DIR, `.staging-${name}`);
  fs.mkdirSync(path.join(staging, name), { recursive: true });
  try { fs.chmodSync(BACKUP_DIR, 0o700); } catch { /* not supported (Windows) */ }
  const content = path.join(staging, name);

  try {
    // 1. database snapshot
    const prisma = new PrismaClient();
    try {
      const target = path.join(content, "dev.db").replace(/'/g, "''");
      await prisma.$executeRawUnsafe(`VACUUM INTO '${target}'`);
    } finally {
      await prisma.$disconnect();
    }

    // 2. uploads (skip transient phone-capture sessions)
    const uploads = path.join(ROOT, "data", "uploads");
    if (fs.existsSync(uploads)) {
      fs.cpSync(uploads, path.join(content, "uploads"), {
        recursive: true,
        filter: (src) => path.basename(src) !== ".capture-sessions",
      });
    }

    // 3. optional secrets
    if (includeEnv && fs.existsSync(path.join(ROOT, ".env"))) {
      fs.copyFileSync(path.join(ROOT, ".env"), path.join(content, "env.txt"));
    }

    // 4. archive
    const archive = path.join(BACKUP_DIR, `${name}.tar.gz`);
    // relative archive name + cwd: GNU tar on Windows reads "C:" in a -f path as a remote host
    execFileSync("tar", ["-czf", path.basename(archive), "-C", staging, name], { cwd: BACKUP_DIR });
    fs.chmodSync(archive, 0o600); // may contain .env secrets: owner-only
    const mb = (fs.statSync(archive).size / 1048576).toFixed(1);
    console.log(`Backup written: ${archive} (${mb} MB)`);

    // 5. off-site copy
    const remote = process.env.BACKUP_RCLONE_REMOTE;
    if (remote) {
      execFileSync("rclone", ["copy", archive, remote], { stdio: "inherit" });
      console.log(`Copied off-site to ${remote}`);
      // prune off-site copies older than N days (only our own archives)
      const days = Math.max(7, Number(process.env.BACKUP_REMOTE_KEEP_DAYS) || 60);
      execFileSync("rclone", ["delete", remote, "--min-age", `${days}d`, "--include", `${PREFIX}*.tar.gz`], { stdio: "inherit" });
    }

    // 6. retention (local only)
    const old = fs.readdirSync(BACKUP_DIR)
      .filter((f) => f.startsWith(PREFIX) && f.endsWith(".tar.gz"))
      .sort()
      .reverse()
      .slice(KEEP);
    for (const f of old) {
      fs.rmSync(path.join(BACKUP_DIR, f));
      console.log(`Pruned old backup: ${f}`);
    }
  } finally {
    fs.rmSync(staging, { recursive: true, force: true });
  }
}

main().catch((e) => {
  console.error("BACKUP FAILED:", e.message);
  process.exit(1);
});
