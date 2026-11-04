/**
 * Slows down password guessing: after 5 wrong passwords for one email from one address within 15 minutes,
 * 10 for one email from anywhere (the forwarded address can be faked), or 20 from one address for any emails,
 * sign-in is refused for 15 minutes. Kept in memory: the portal runs as
 * one server process, and a restart only clears the counters.
 */
const WINDOW_MS = 15 * 60 * 1000;
const LIMITS = [5, 10, 20]; // per account+address, per account, per address

type Bucket = { failures: number[]; blockedUntil: number };
const buckets = new Map<string, Bucket>();

function bucket(key: string, now: number): Bucket {
  let b = buckets.get(key);
  if (!b) {
    b = { failures: [], blockedUntil: 0 };
    buckets.set(key, b);
  }
  b.failures = b.failures.filter((t) => now - t < WINDOW_MS);
  return b;
}

const keys = (ip: string, email: string) => {
  const e = email.trim().toLowerCase();
  return [`a:${ip}|${e}`, `e:${e}`, `i:${ip}`];
};

/** Minutes left of a block on this email/address, or 0 when sign-in may be tried. */
export function loginBlockedFor(ip: string, email: string, now = Date.now()): number {
  const until = Math.max(...keys(ip, email).map((k) => bucket(k, now).blockedUntil));
  return until > now ? Math.ceil((until - now) / 60000) : 0;
}

/** Records a wrong password; returns true when this attempt started a block. */
export function recordLoginFailure(ip: string, email: string, now = Date.now()): boolean {
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (v.blockedUntil <= now && v.failures.every((t) => now - t >= WINDOW_MS)) buckets.delete(k);
  }
  let blocked = false;
  keys(ip, email).forEach((k, i) => {
    const b = bucket(k, now);
    b.failures.push(now);
    if (b.failures.length >= LIMITS[i] && b.blockedUntil <= now) {
      b.blockedUntil = now + WINDOW_MS;
      blocked = true;
    }
  });
  return blocked;
}

/** A correct password clears that account's counters (not the address-wide one). */
export function clearLoginFailures(ip: string, email: string) {
  const [account, anywhere] = keys(ip, email);
  buckets.delete(account);
  buckets.delete(anywhere);
}

/** Test helper. */
export function resetLoginThrottle() {
  buckets.clear();
}

/** Client address as seen by the server (first hop of X-Forwarded-For behind the reverse proxy). */
export function clientIp(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim().slice(0, 64);
  return (headers.get("x-real-ip") ?? "").trim().slice(0, 64) || "unknown";
}
