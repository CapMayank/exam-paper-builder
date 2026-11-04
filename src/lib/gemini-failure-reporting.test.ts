import { describe, expect, it, vi } from "vitest";
import { describeGeminiFailure } from "./gemini";
import { retryTransient } from "./client";

describe("describeGeminiFailure: say what actually went wrong", () => {
  it("names a spent free-tier daily quota", () => {
    const m = describeGeminiFailure(429, '{"error":{"message":"quota","details":[{"quotaId":"GenerateRequestsPerDayPerProjectPerModel-FreeTier"}]}}');
    expect(m).toMatch(/free-tier/);
    expect(m).toMatch(/daily/);
    expect(m).toMatch(/429/);
  });
  it("separates an overloaded model from quota", () => {
    expect(describeGeminiFailure(503, "high demand")).toMatch(/overloaded/);
    expect(describeGeminiFailure(503, "high demand")).not.toMatch(/quota/);
  });
  it("separates a bad key, a wrong model name, a timeout and a bad reply", () => {
    expect(describeGeminiFailure(403, "")).toMatch(/API key/);
    expect(describeGeminiFailure(400, "API key not valid")).toMatch(/API key/);
    expect(describeGeminiFailure(404, "")).toMatch(/model name/);
    expect(describeGeminiFailure(0, "The operation was aborted due to timeout")).toMatch(/too long/);
    expect(describeGeminiFailure(0, "Unexpected token < in JSON")).toMatch(/not valid JSON/);
  });
});

describe("retryTransient", () => {
  const err = (status: number) => Object.assign(new Error("x"), { status });

  it("retries a 502 and returns the later success", async () => {
    const fn = vi.fn().mockRejectedValueOnce(err(502)).mockResolvedValueOnce("ok");
    const onRetry = vi.fn();
    await expect(retryTransient(fn, { delaysMs: [1, 1], onRetry })).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
  it("gives up after the configured retries", async () => {
    const fn = vi.fn().mockRejectedValue(err(503));
    await expect(retryTransient(fn, { delaysMs: [1, 1] })).rejects.toThrow();
    expect(fn).toHaveBeenCalledTimes(3);
  });
  it("never retries a spent quota or a bad request", async () => {
    for (const status of [429, 400, 422, 409]) {
      const fn = vi.fn().mockRejectedValue(err(status));
      await expect(retryTransient(fn, { delaysMs: [1, 1] })).rejects.toThrow();
      expect(fn).toHaveBeenCalledTimes(1);
    }
  });
});
