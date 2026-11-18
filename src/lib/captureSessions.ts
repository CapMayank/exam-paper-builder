import { randomBytes } from "node:crypto";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { UPLOAD_DIR } from "./uploads";

const SESSION_DIR = path.join(UPLOAD_DIR, ".capture-sessions");
const SESSION_TTL_MS = 10 * 60 * 1000;
const TOKEN_RE = /^[a-f0-9]{32}$/;

interface SessionMeta {
  createdAt: number;
  expiresAt: number;
  status: "pending" | "ready";
  mimeType?: string;
}

export function isValidCaptureToken(token: string): boolean {
  return TOKEN_RE.test(token);
}

function metaPath(token: string): string {
  return path.join(/*turbopackIgnore: true*/ SESSION_DIR, `${token}.json`);
}

function binPath(token: string): string {
  return path.join(/*turbopackIgnore: true*/ SESSION_DIR, `${token}.bin`);
}

async function deleteSessionFiles(token: string): Promise<void> {
  await Promise.allSettled([
    rm(metaPath(token), { force: true }),
    rm(binPath(token), { force: true }),
  ]);
}

async function readMeta(token: string): Promise<SessionMeta | null> {
  if (!isValidCaptureToken(token)) return null;
  try {
    const raw = await readFile(metaPath(token), "utf8");
    const parsed = JSON.parse(raw) as SessionMeta;
    if (!parsed || typeof parsed.expiresAt !== "number" || Date.now() > parsed.expiresAt) {
      await deleteSessionFiles(token);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function pruneExpiredSessions(): Promise<void> {
  try {
    const entries = await readdir(SESSION_DIR);
    const now = Date.now();
    await Promise.all(
      entries
        .filter((name) => name.endsWith(".json"))
        .map(async (name) => {
          const token = name.slice(0, -5);
          if (!isValidCaptureToken(token)) return;
          try {
            const raw = await readFile(metaPath(token), "utf8");
            const parsed = JSON.parse(raw) as SessionMeta;
            if (!parsed || typeof parsed.expiresAt !== "number" || now > parsed.expiresAt) {
              await deleteSessionFiles(token);
            }
          } catch {
            await deleteSessionFiles(token);
          }
        }),
    );
  } catch {
    // Directory may not exist yet
  }
}

export async function createCaptureSession(): Promise<{ token: string; expiresAt: number }> {
  await mkdir(SESSION_DIR, { recursive: true });
  void pruneExpiredSessions();
  const token = randomBytes(16).toString("hex");
  const now = Date.now();
  const expiresAt = now + SESSION_TTL_MS;
  const meta: SessionMeta = { createdAt: now, expiresAt, status: "pending" };
  await writeFile(metaPath(token), JSON.stringify(meta), "utf8");
  return { token, expiresAt };
}

export async function getCaptureSessionStatus(
  token: string,
): Promise<{ status: "pending" | "ready"; expiresAt: number } | null> {
  const meta = await readMeta(token);
  if (!meta) return null;
  return { status: meta.status, expiresAt: meta.expiresAt };
}

export async function saveCaptureSessionImage(
  token: string,
  buffer: Buffer,
  mimeType: string,
): Promise<boolean> {
  const meta = await readMeta(token);
  if (!meta) return false;
  await writeFile(binPath(token), buffer);
  const next: SessionMeta = { ...meta, status: "ready", mimeType };
  await writeFile(metaPath(token), JSON.stringify(next), "utf8");
  return true;
}

export async function consumeCaptureSessionImage(
  token: string,
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const meta = await readMeta(token);
  if (!meta || meta.status !== "ready" || !meta.mimeType) return null;
  try {
    const buffer = await readFile(binPath(token));
    await deleteSessionFiles(token);
    return { buffer, mimeType: meta.mimeType };
  } catch {
    await deleteSessionFiles(token);
    return null;
  }
}
