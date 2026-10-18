import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

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

export async function startSession(userId: string) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_S;
  const payload = `${userId}.${exp}`;
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

function parseRawSessionCookie(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 3) return null;
  const [userId, exp, sig] = parts;
  const expected = sign(`${userId}.${exp}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (Number(exp) < Date.now() / 1000) return null;
  return userId;
}

/** Extracts session cookie directly from incoming HTTP Request headers without triggering hanging prerender promises. */
export function sessionUserIdFromRequest(req: Request): string | null {
  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]*)`));
  if (!match) return null;
  return parseRawSessionCookie(decodeURIComponent(match[1]));
}

/** Returns the user id from a valid, unexpired session cookie, else null. */
export async function sessionUserId(req?: Request): Promise<string | null> {
  if (req) {
    return sessionUserIdFromRequest(req);
  }
  try {
    const raw = (await cookies()).get(COOKIE)?.value;
    return parseRawSessionCookie(raw);
  } catch {
    return null;
  }
}
