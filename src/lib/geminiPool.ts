/**
 * Several Google AI Studio keys behind one call. Free-tier keys have a small per-minute and a per-day request
 * quota per model, so calls are spread over every key (least recently used first), a key that has run out is
 * skipped until its quota comes back, and a call only fails when every key is unusable for that model.
 *
 * Keys come from GEMINI_API_KEYS (comma, space or newline separated) and, for older setups, GEMINI_API_KEY.
 * Google counts quota per project, so keys must belong to different projects to add capacity.
 */

type Family = "pro" | "flash" | "lite";

const MINUTE = 60_000;
const DEFAULT_RPM: Record<Family, number> = { pro: 4, flash: 8, lite: 12 }; // a little under the usual free-tier 5 / 10 / 15
const MAX_INLINE_WAIT_MS = 4_000; // a call waits this long for a key to free up; beyond that it moves on
const AUTH_COOLDOWN_MS = 10 * MINUTE;
const OVERLOAD_COOLDOWN_MS = 2_000;

export function modelFamily(model: string): Family {
  return /pro/i.test(model) ? "pro" : /lite/i.test(model) ? "lite" : "flash";
}

function rpmLimit(model: string): number {
  const fam = modelFamily(model);
  const fromEnv = Number(process.env[`GEMINI_RPM_${fam.toUpperCase()}`]);
  return Number.isFinite(fromEnv) && fromEnv > 0 ? Math.floor(fromEnv) : DEFAULT_RPM[fam];
}

export function parseKeyList(raw?: string | null): string[] {
  const out: string[] = [];
  for (const part of (raw ?? "").split(/[\s,;]+/)) {
    const k = part.trim().replace(/^["']|["']$/g, "");
    if (k.length > 10 && !out.includes(k)) out.push(k);
  }
  return out;
}

export function configuredKeys(): string[] {
  return parseKeyList([process.env.GEMINI_API_KEYS, process.env.GEMINI_API_KEY].filter(Boolean).join(","));
}

type KeyState = {
  sent: Map<string, number[]>; // model -> request times in the last minute
  blockedUntil: Map<string, number>; // model -> quota cooldown
  disabledUntil: number; // the key itself was refused (invalid, revoked, API not enabled)
};

const states = new Map<string, KeyState>();
let rotation = 0;

function stateOf(key: string): KeyState {
  let s = states.get(key);
  if (!s) {
    s = { sent: new Map(), blockedUntil: new Map(), disabledUntil: 0 };
    states.set(key, s);
  }
  return s;
}

function recentSends(s: KeyState, model: string, now: number): number[] {
  const list = (s.sent.get(model) ?? []).filter((t) => now - t < MINUTE);
  s.sent.set(model, list);
  return list;
}

/** Milliseconds until the daily quota resets (midnight, Pacific time). */
export function msUntilPacificMidnight(now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0) % 24;
  const elapsed = get("hour") * 3600 + get("minute") * 60 + get("second");
  return Math.max(60_000, (86_400 - elapsed) * 1000);
}

export type PickResult = { key: string; label: string } | { key: null; waitMs: number };

/** Chooses the usable key with the fewest recent requests and books a request on it. */
export function pickKey(model: string, onlyKey?: string | null, now: number = Date.now()): PickResult {
  const keys = onlyKey ? [onlyKey] : configuredKeys();
  const limit = rpmLimit(model);
  let best: { key: string; used: number; order: number } | null = null;
  let soonest = Infinity;

  keys.forEach((key, i) => {
    const s = stateOf(key);
    const used = recentSends(s, model, now);
    const blocked = Math.max(s.disabledUntil, s.blockedUntil.get(model) ?? 0);
    if (blocked > now) {
      soonest = Math.min(soonest, blocked - now);
      return;
    }
    if (used.length >= limit) {
      soonest = Math.min(soonest, used[0] + MINUTE - now);
      return;
    }
    const order = (i + rotation) % keys.length;
    if (!best || used.length < best.used || (used.length === best.used && order < best.order)) {
      best = { key, used: used.length, order };
    }
  });

  if (best) {
    const chosen = best as { key: string };
    stateOf(chosen.key).sent.get(model)!.push(now);
    rotation += 1;
    return { key: chosen.key, label: maskKey(chosen.key) };
  }
  return { key: null, waitMs: Number.isFinite(soonest) ? Math.max(soonest, 250) : 0 };
}

export function maskKey(key: string): string {
  return `…${key.slice(-4)}`;
}

/** What a 429 body tells us: how long to back off, and whether it is the daily quota. */
export function interpretRateLimit(body: string, now: Date = new Date()): { cooldownMs: number; daily: boolean } {
  let retryMs: number | null = null;
  let message = body;
  try {
    const parsed = JSON.parse(body);
    message = `${parsed?.error?.message ?? ""} ${JSON.stringify(parsed?.error?.details ?? [])}`;
    for (const d of parsed?.error?.details ?? []) {
      const m = String(d?.retryDelay ?? "").match(/^([\d.]+)s$/);
      if (m) retryMs = Math.ceil(Number(m[1]) * 1000);
    }
  } catch {
    // plain-text body
  }
  // "limit: 0" means the model has no free quota at all on this key: nothing to wait for within the day
  const daily = /PerDay|per day|daily|limit:\s*0\b/i.test(message);
  if (daily) return { cooldownMs: msUntilPacificMidnight(now), daily: true };
  return { cooldownMs: Math.min(Math.max((retryMs ?? 60_000) + 1_000, 5_000), 5 * MINUTE), daily: false };
}

export function reportOutcome(key: string, model: string, status: number, body = "", now: Date = new Date()): void {
  const s = stateOf(key);
  if (status === 429) {
    s.blockedUntil.set(model, now.getTime() + interpretRateLimit(body, now).cooldownMs);
  } else if (status === 503) {
    // the model is overloaded for everyone: a short pause, not a quota problem
    s.blockedUntil.set(model, now.getTime() + OVERLOAD_COOLDOWN_MS);
  } else if (status === 401 || status === 403 || (status === 400 && /API key not valid|API_KEY_INVALID/i.test(body))) {
    s.disabledUntil = now.getTime() + AUTH_COOLDOWN_MS;
  }
}

export type PoolCallResult =
  | { ok: true; json: any; keyLabel: string }
  | { ok: false; status: number; errorText: string; retryAfterMs?: number };

/**
 * POSTs a generateContent body to `model`, rotating over the configured keys. Returns the first success, or the
 * last failure once no key can serve the model right now. Network errors and timeouts propagate to the caller.
 */
export async function geminiGenerate(
  model: string,
  body: unknown,
  opts: { customKey?: string | null; timeoutMs?: number } = {},
): Promise<PoolCallResult> {
  const customKey = opts.customKey && opts.customKey.trim().length > 5 ? opts.customKey.trim() : null;
  const poolSize = customKey ? 1 : Math.max(1, configuredKeys().length);
  let lastStatus = 0;
  let lastText = "";

  for (let attempt = 0; attempt < poolSize + 2; attempt++) {
    const pick = pickKey(model, customKey);
    if (pick.key === null) {
      if (pick.waitMs > 0 && pick.waitMs <= MAX_INLINE_WAIT_MS) {
        await new Promise((r) => setTimeout(r, pick.waitMs));
        continue;
      }
      return {
        ok: false,
        status: lastStatus || 429,
        errorText: lastText || `Every API key is rate limited for ${model}.`,
        retryAfterMs: pick.waitMs || undefined,
      };
    }

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": pick.key },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 120_000),
    });
    if (res.ok) return { ok: true, json: await res.json(), keyLabel: pick.label };

    lastStatus = res.status;
    lastText = await res.text();
    reportOutcome(pick.key, model, res.status, lastText);
    // another key may still work for a quota or key problem; anything else is the model's, so stop here
    if (res.status === 429 || res.status === 401 || res.status === 403 || (res.status === 400 && /API key not valid|API_KEY_INVALID/i.test(lastText))) {
      console.warn(`Gemini key ${pick.label} refused ${model} (${res.status}); trying another key.`);
      continue;
    }
    return { ok: false, status: res.status, errorText: lastText };
  }
  return { ok: false, status: lastStatus || 429, errorText: lastText || "No usable API key." };
}

/** True when no key can take a request for `model` right now (used to explain failures to the user). */
export function allKeysBlocked(model: string, now: number = Date.now()): { blocked: boolean; retryAfterMs: number; daily: boolean } {
  const keys = configuredKeys();
  if (keys.length === 0) return { blocked: false, retryAfterMs: 0, daily: false };
  let soonest = Infinity;
  for (const key of keys) {
    const s = stateOf(key);
    const until = Math.max(s.disabledUntil, s.blockedUntil.get(model) ?? 0);
    const used = recentSends(s, model, now);
    const wait = until > now ? until - now : used.length >= rpmLimit(model) ? used[0] + MINUTE - now : 0;
    if (wait <= 0) return { blocked: false, retryAfterMs: 0, daily: false };
    soonest = Math.min(soonest, wait);
  }
  return { blocked: true, retryAfterMs: soonest, daily: soonest > 15 * MINUTE };
}

export function quotaMessage(retryAfterMs: number, daily: boolean): string {
  if (daily) {
    const hours = Math.ceil(retryAfterMs / 3_600_000);
    return `The free AI quota for today is used up on every configured API key. It resets at midnight Pacific time (in about ${hours} hour${hours === 1 ? "" : "s"}). Add another API key or switch to a paid key to continue now.`;
  }
  const secs = Math.max(5, Math.ceil(retryAfterMs / 1000));
  return `The AI is rate limited on every configured API key. Try again in about ${secs} second${secs === 1 ? "" : "s"}.`;
}

export type KeyStatus = {
  label: string;
  disabledForMs: number;
  models: Array<{ model: string; sentLastMinute: number; blockedForMs: number }>;
};

export function poolStatus(now: number = Date.now()): KeyStatus[] {
  return configuredKeys().map((key) => {
    const s = stateOf(key);
    const models = new Set([...s.sent.keys(), ...s.blockedUntil.keys()]);
    return {
      label: maskKey(key),
      disabledForMs: Math.max(0, s.disabledUntil - now),
      models: [...models].map((model) => ({
        model,
        sentLastMinute: recentSends(s, model, now).length,
        blockedForMs: Math.max(0, (s.blockedUntil.get(model) ?? 0) - now),
      })),
    };
  });
}

/** Test helper: forget every counter. */
export function resetPoolState(): void {
  states.clear();
  rotation = 0;
}
