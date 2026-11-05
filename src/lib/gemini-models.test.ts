import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { callGeminiApi, DEFAULT_GENERATION_MODEL, FLASH_MODEL_TIER, normalizeModelName, quotaErrorText, resolveModelChain, validAttemptCount } from "./gemini";
import { reportOutcome, resetPoolState } from "./geminiPool";

afterEach(() => vi.unstubAllEnvs());

describe("Gemini model resolution", () => {
  it("maps retired model names onto maintained models", () => {
    expect(normalizeModelName("gemini-2.5-pro")).toBe("gemini-pro-latest");
    expect(normalizeModelName("gemini-2.5-flash")).toBe("gemini-3.5-flash");
    expect(normalizeModelName("gemini-2.0-flash-lite")).toBe("gemini-3.5-flash-lite");
    expect(normalizeModelName("some-new-model")).toBe("some-new-model");
    expect(normalizeModelName("  ")).toBeUndefined();
  });

  it("never puts a retired model in the chain", () => {
    vi.stubEnv("GEMINI_MODEL", "gemini-2.5-flash");
    for (const chosen of ["gemini-2.5-pro", "gemini-2.0-flash", undefined]) {
      for (const m of resolveModelChain(chosen)) expect(m).not.toMatch(/^gemini-(1\.5|2\.0|2\.5)/);
    }
  });

  it("starts with the requested tier and falls back to the flash models", () => {
    vi.stubEnv("GEMINI_MODEL", "");
    expect(resolveModelChain("gemini-pro-latest")).toEqual(["gemini-pro-latest", ...FLASH_MODEL_TIER]);
    expect(resolveModelChain(undefined)).toEqual(FLASH_MODEL_TIER);
  });

  it("leads with a pinned flash model, not the -latest alias Google keeps re-pointing", () => {
    vi.stubEnv("GEMINI_MODEL", "");
    expect(DEFAULT_GENERATION_MODEL).not.toMatch(/latest|pro/);
    expect(resolveModelChain(undefined)[0]).toBe(DEFAULT_GENERATION_MODEL);
    // more than one distinct model, so a 503 on one of them is not the end of the chain
    expect(new Set(resolveModelChain(undefined)).size).toBeGreaterThanOrEqual(3);
  });

  it("keeps an administrator's GEMINI_MODEL in the chain right after the chosen model", () => {
    vi.stubEnv("GEMINI_MODEL", "gemini-flash-lite-latest");
    expect(resolveModelChain("gemini-3.5-flash").slice(0, 2)).toEqual(["gemini-3.5-flash", "gemini-flash-lite-latest"]);
  });
});

describe("quota message", () => {
  const KEY = "AQ.keyQ_000000000000";
  beforeEach(() => {
    resetPoolState();
    vi.stubEnv("GEMINI_API_KEYS", KEY);
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("GEMINI_MODEL", "");
  });

  const daily = '{"error":{"message":"Quota exceeded ... limit: 20, requests per day ... limit: 0"}}';

  it("is not shown while any model of the chain still has quota", () => {
    // Pro and both -latest aliases spent for the day, the pinned flash models still free
    for (const m of ["gemini-pro-latest", "gemini-flash-latest", "gemini-flash-lite-latest"]) reportOutcome(KEY, m, 429, daily);
    expect(quotaErrorText("gemini-pro-latest")).toBeNull();
  });

  it("is shown, as the daily quota, once every model of the chain is spent", () => {
    for (const m of ["gemini-pro-latest", ...FLASH_MODEL_TIER]) reportOutcome(KEY, m, 429, daily);
    expect(quotaErrorText("gemini-pro-latest")).toMatch(/quota for today is used up/);
  });
});

describe("attempt any N", () => {
  it("is kept only when there are more sub-questions than must be attempted", () => {
    expect(validAttemptCount(4, 5)).toBe(4);
    expect(validAttemptCount(4, 0)).toBeUndefined(); // copied from the prompt's example onto a plain question
    expect(validAttemptCount(3, 3)).toBeUndefined(); // "attempt all": nothing to choose
    expect(validAttemptCount(undefined, 5)).toBeUndefined();
  });
});

describe("every model paused after recent 503s", () => {
  const KEY = "AQ.keyP_000000000000";
  beforeEach(() => {
    resetPoolState();
    vi.stubEnv("GEMINI_API_KEYS", KEY);
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("GEMINI_MODEL", "");
  });
  afterEach(() => vi.unstubAllGlobals());

  it("still sends one real request instead of failing without trying", async () => {
    const fetchMock = vi.fn(async () => new Response('{"error":{"code":503}}', { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);
    await callGeminiApi("hi", "sys", { json: false }); // every model of the chain answers 503 and is paused
    const before = fetchMock.mock.calls.length;
    fetchMock.mockImplementation(async () =>
      new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "ok" }] }, finishReason: "STOP" }] }), { status: 200 }),
    );
    const res = await callGeminiApi<string>("hi", "sys", { json: false });
    expect(fetchMock.mock.calls.length).toBeGreaterThan(before);
    expect(res.success).toBe(true);
    expect(res.data).toBe("ok");
  });
});
