// Restores a backup made by scripts/backup.mjs.
//
//   node scripts/restore.mjs backups/exam-paper-builder-<timestamp>.tar.gz          -> dry run
//   node scripts/restore.mjs backups/exam-paper-builder-<timestamp>.tar.gz --yes    -> restore
//   add --with-env to also restore .env (the current one is kept as .env.before-restore-*)
//
// STOP THE APP FIRST (pm2 stop ...). The current database and uploads are moved aside to
// "*.before-restore-<timestamp>" instead of being deleted, so a restore can itself be undone.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

try { process.loadEnvFile(".env"); } catch { /* ignore */ }

const ROOT = process.cwd();
const archive = process.argv[2];
const apply = process.argv.includes("--yes");
if (!archive || archive.startsWith("--") || !fs.existsSync(archive)) {
  console.error("Usage: node scripts/restore.mjs <backup.tar.gz> [--yes] [--with-env]");
  process.exit(1);
}

const m = (process.env.DATABASE_URL || "").match(/^file:(.+)$/);
if (!m) { console.error("DATABASE_URL must be a file: SQLite URL"); process.exit(1); }
const dbFile = path.isAbsolute(m[1]) ? m[1] : path.resolve(ROOT, "prisma", m[1]);
const uploads = path.join(ROOT, "data", "uploads");

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "restore-"));
try {
  // relative archive name + cwd: GNU tar on Windows reads "C:" in a -f path as a remote host
  const full = path.resolve(archive);
  fs.copyFileSync(full, path.join(tmp, "backup.tar.gz"));
  fs.mkdirSync(path.join(tmp, "x"));
  execFileSync("tar", ["-xzf", "backup.tar.gz", "-C", "x"], { cwd: tmp });
  const [dir] = fs.readdirSync(path.join(tmp, "x"));
  const src = path.join(tmp, "x", dir);
  if (!fs.existsSync(path.join(src, "dev.db"))) throw new Error("Archive has no dev.db - not a valid backup");
  const count = fs.existsSync(path.join(src, "uploads")) ? fs.readdirSync(path.join(src, "uploads")).length : 0;

  console.log(`Backup ${dir}: database + ${count} upload file(s)`);
  console.log(`Will replace: ${dbFile}\n              ${uploads}`);
  if (!apply) { console.log("\nDry run. Stop the app, then re-run with --yes."); process.exit(0); }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  for (const ext of ["", "-wal", "-shm", "-journal"]) {
    if (fs.existsSync(dbFile + ext)) fs.renameSync(dbFile + ext, `${dbFile}${ext}.before-restore-${stamp}`);
  }
  fs.copyFileSync(path.join(src, "dev.db"), dbFile);

  if (fs.existsSync(uploads)) fs.renameSync(uploads, `${uploads}.before-restore-${stamp}`);
  fs.mkdirSync(path.dirname(uploads), { recursive: true });
  if (fs.existsSync(path.join(src, "uploads"))) fs.cpSync(path.join(src, "uploads"), uploads, { recursive: true });
  else fs.mkdirSync(uploads);

  if (process.argv.includes("--with-env")) {
    if (!fs.existsSync(path.join(src, "env.txt"))) console.log("No .env in this backup (made without --include-env).");
    else {
      const envFile = path.join(ROOT, ".env");
      if (fs.existsSync(envFile)) fs.renameSync(envFile, `${envFile}.before-restore-${stamp}`);
      fs.copyFileSync(path.join(src, "env.txt"), envFile);
      console.log("Restored .env (restart with: pm2 restart exam-paper-builder --update-env).");
    }
  } else if (fs.existsSync(path.join(src, "env.txt"))) {
    console.log("This backup also holds .env; add --with-env to restore it too.");
  }
  console.log("Restored. Start the app again. Previous data was kept as *.before-restore-" + stamp);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
