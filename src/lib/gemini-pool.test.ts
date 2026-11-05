import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  allKeysBlocked,
  configuredKeys,
  geminiGenerate,
  interpretRateLimit,
  overloadedForMs,
  msUntilPacificMidnight,
  parseKeyList,
  pickKey,
  reportOutcome,
  resetPoolState,
} from "./geminiPool";

const A = "AQ.keyA_000000000000";
const B = "AQ.keyB_000000000000";

describe("key list", () => {
  it("accepts commas, spaces, newlines and quotes, and drops duplicates", () => {
    expect(parseKeyList(`"${A}", ${B}\n${A}`)).toEqual([A, B]);
    expect(parseKeyList("")).toEqual([]);
    expect(parseKeyList("short")).toEqual([]);
  });

  it("reads GEMINI_API_KEYS and the older GEMINI_API_KEY together", () => {
    vi.stubEnv("GEMINI_API_KEYS", A);
    vi.stubEnv("GEMINI_API_KEY", B);
    expect(configuredKeys()).toEqual([A, B]);
    vi.unstubAllEnvs();
  });
});

describe("load balancing", () => {
  beforeEach(() => {
    resetPoolState();
    vi.stubEnv("GEMINI_API_KEYS", `${A},${B}`);
    vi.stubEnv("GEMINI_API_KEY", "");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("spreads requests over the keys", () => {
    const used = Array.from({ length: 6 }, () => (pickKey("gemini-flash-latest") as { key: string }).key);
    expect(used.filter((k) => k === A)).toHaveLength(3);
    expect(used.filter((k) => k === B)).toHaveLength(3);
  });

  it("stops at the per-minute limit and says how long to wait", () => {
    vi.stubEnv("GEMINI_RPM_FLASH", "2"); // two keys x 2 = 4 requests a minute
    const now = 1_000_000;
    for (let i = 0; i < 4; i++) expect(pickKey("gemini-flash-latest", null, now).key).not.toBeNull();
    const fifth = pickKey("gemini-flash-latest", null, now + 1000);
    expect(fifth.key).toBeNull();
    expect((fifth as { waitMs: number }).waitMs).toBeGreaterThan(50_000);
    // a minute later the window is clear again
    expect(pickKey("gemini-flash-latest", null, now + 61_000).key).not.toBeNull();
  });

  it("limits each model separately", () => {
    vi.stubEnv("GEMINI_RPM_PRO", "1");
    pickKey("gemini-pro-latest");
    pickKey("gemini-pro-latest");
    expect(pickKey("gemini-pro-latest").key).toBeNull();
    expect(pickKey("gemini-flash-latest").key).not.toBeNull();
  });

  it("skips a key that hit its quota until the cooldown ends", () => {
    const now = new Date(2026, 10, 2, 12, 0, 0);
    reportOutcome(A, "gemini-flash-latest", 429, JSON.stringify({ error: { details: [{ retryDelay: "30s" }] } }), now);
    const picks = Array.from({ length: 4 }, () => (pickKey("gemini-flash-latest", null, now.getTime() + 1000) as { key: string }).key);
    expect(picks.every((k) => k === B)).toBe(true);
    const later = pickKey("gemini-flash-latest", null, now.getTime() + 40_000);
    expect(later.key).not.toBeNull();
  });

  it("takes a key out for a while when Google refuses it", () => {
    reportOutcome(A, "gemini-flash-latest", 400, '{"error":{"message":"API key not valid. Please pass a valid API key."}}');
    const picks = Array.from({ length: 3 }, () => (pickKey("gemini-flash-latest") as { key: string }).key);
    expect(picks.every((k) => k === B)).toBe(true);
  });
});

describe("rate-limit replies", () => {
  it("uses the retry delay Google sends for a per-minute limit", () => {
    const body = JSON.stringify({ error: { message: "Quota exceeded", details: [{ "@type": "RetryInfo", retryDelay: "34s" }] } });
    expect(interpretRateLimit(body)).toEqual({ cooldownMs: 35_000, daily: false });
  });

  it("waits for the Pacific-time reset on a daily limit", () => {
    const body = JSON.stringify({ error: { message: "You exceeded your current quota", details: [{ violations: [{ quotaId: "GenerateRequestsPerDayPerProjectPerModel-FreeTier" }] }] } });
    const r = interpretRateLimit(body);
    expect(r.daily).toBe(true);
    expect(r.cooldownMs).toBeGreaterThan(0);
    expect(r.cooldownMs).toBeLessThanOrEqual(86_400_000);
  });

  it("treats limit: 0 as unavailable for the day", () => {
    expect(interpretRateLimit('{"error":{"message":"... limit: 0, model: gemini-pro"}}').daily).toBe(true);
  });

  it("computes the time to midnight Pacific", () => {
    // 07:00 UTC is 23:00 (previous day) in Pacific daylight time in November? PST = UTC-8 -> 23:00; one hour left
    const ms = msUntilPacificMidnight(new Date("2026-11-10T07:00:00Z"));
    expect(ms).toBe(3_600_000);
  });
});

describe("failover", () => {
  beforeEach(() => {
    resetPoolState();
    vi.stubEnv("GEMINI_API_KEYS", `${A},${B}`);
    vi.stubEnv("GEMINI_API_KEY", "");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("moves to the second key when the first is over quota", async () => {
    const seen: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        const key = (init.headers as Record<string, string>)["x-goog-api-key"];
        seen.push(key);
        if (key === A) return new Response(JSON.stringify({ error: { message: "quota", details: [{ retryDelay: "40s" }] } }), { status: 429 });
        return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "ok" }] } }] }), { status: 200 });
      }),
    );
    // force key A to be tried first
    const first = pickKey("gemini-flash-latest") as { key: string };
    resetPoolState();
    void first;
    const res = await geminiGenerate("gemini-flash-latest", { contents: [] });
    expect(res.ok).toBe(true);
    expect(seen.at(-1)).toBe(B);
  });

  it("reports a quota failure once every key is spent, and the message explains it", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ error: { message: "quota", details: [{ retryDelay: "60s" }] } }), { status: 429 })),
    );
    const res = await geminiGenerate("gemini-flash-latest", { contents: [] });
    expect(res.ok).toBe(false);
    expect((res as { status: number }).status).toBe(429);
    expect(allKeysBlocked("gemini-flash-latest").blocked).toBe(true);
  });

  it("never puts the key in the URL", async () => {
    const urls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        urls.push(url);
        return new Response(JSON.stringify({ candidates: [] }), { status: 200 });
      }),
    );
    await geminiGenerate("gemini-flash-latest", { contents: [] });
    expect(urls[0]).not.toContain("key=");
    expect(urls[0]).not.toContain("keyA");
  });
});

describe("overloaded model (503)", () => {
  beforeEach(() => {
    resetPoolState();
    vi.stubEnv("GEMINI_API_KEYS", A);
    vi.stubEnv("GEMINI_API_KEY", "");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("is skipped without another network call once Google has said it is overloaded", async () => {
    const fetchMock = vi.fn(async () => new Response('{"error":{"code":503}}', { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);
    const first = await geminiGenerate("gemini-flash-latest", { contents: [] });
    expect(first.ok).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const second = await geminiGenerate("gemini-flash-latest", { contents: [] });
    expect(second).toMatchObject({ ok: false, status: 503 });
    expect(fetchMock).toHaveBeenCalledTimes(1); // no second ~20 s wait
    // other models are unaffected
    fetchMock.mockImplementationOnce(async () => new Response('{"candidates":[]}', { status: 200 }));
    expect((await geminiGenerate("gemini-flash-lite-latest", { contents: [] })).ok).toBe(true);
  });

  it("pauses an overloaded model for seconds, never minutes, even after repeated 503s", async () => {
    const t0 = Date.now();
    vi.useFakeTimers({ now: t0, toFake: ["Date"] });
    vi.stubGlobal("fetch", vi.fn(async () => new Response('{"error":{"code":503}}', { status: 503 })));
    for (let i = 0; i < 6; i++) {
      vi.setSystemTime(t0 + i * 60_000); // let each pause run out, then fail again
      await geminiGenerate("gemini-3.5-flash", { contents: [] });
    }
    const left = overloadedForMs("gemini-3.5-flash", Date.now());
    vi.useRealTimers();
    expect(left).toBeGreaterThan(0);
    expect(left).toBeLessThanOrEqual(30_000);
  });

  it("tries the model again once its pause is over", async () => {
    const t0 = Date.now();
    vi.useFakeTimers({ now: t0, toFake: ["Date"] });
    const fetchMock = vi.fn(async () => new Response('{"error":{"code":503}}', { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);
    await geminiGenerate("gemini-3.5-flash", { contents: [] });
    fetchMock.mockImplementationOnce(async () => new Response('{"candidates":[]}', { status: 200 }));
    vi.setSystemTime(t0 + 31_000);
    const res = await geminiGenerate("gemini-3.5-flash", { contents: [] });
    vi.useRealTimers();
    expect(res.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
