import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

const COOKIE = "epb_session";
const MAX_AGE_S = 60 * 60 * 24 * 7;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error("SESSION_SECRET must be set (16+ chars) in .env");
  return s;
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

/**
 * Cookie: `userId.version.expiry.signature`. The version must match User.sessionVersion, which is raised on a
 * password reset, role change or deactivation, so stolen or old cookies stop working at once.
 */
export async function startSession(userId: string, version = 0) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_S;
  const payload = `${userId}.${version}.${exp}`;
  const isSecure =
    process.env.COOKIE_SECURE !== undefined
      ? process.env.COOKIE_SECURE === "true"
      : process.env.NODE_ENV === "production";
  (await cookies()).set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecure,
    path: "/",
    maxAge: MAX_AGE_S,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

/** Signature and expiry check only. Cookies from before versioning (`userId.expiry.signature`) read as version 0. */
export function parseSessionCookie(raw: string | null | undefined): { userId: string; version: number } | null {
  if (!raw) return null;
  const parts = raw.split(".");
  let userId: string, version: string, exp: string, sig: string;
  if (parts.length === 4) [userId, version, exp, sig] = parts;
  else if (parts.length === 3) {
    [userId, exp, sig] = parts;
    version = "";
  } else return null;
  const expected = sign(version === "" ? `${userId}.${exp}` : `${userId}.${version}.${exp}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (Number(exp) < Date.now() / 1000) return null;
  return { userId, version: version === "" ? 0 : Number(version) };
}

function cookieFromRequest(req: Request): string | null {
  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/** Returns the user id from a valid, unexpired session cookie whose version is still current, else null. */
export async function sessionUserId(req?: Request): Promise<string | null> {
  let raw: string | null | undefined;
  if (req) raw = cookieFromRequest(req);
  else {
    try {
      raw = (await cookies()).get(COOKIE)?.value;
    } catch {
      return null;
    }
  }
  const parsed = parseSessionCookie(raw);
  if (!parsed) return null;
  const user = await prisma.user.findUnique({ where: { id: parsed.userId }, select: { sessionVersion: true } });
  if (!user || user.sessionVersion !== parsed.version) return null;
  return parsed.userId;
}
