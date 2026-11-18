import { describe, expect, it } from "vitest";
import {
  consumeCaptureSessionImage,
  createCaptureSession,
  getCaptureSessionStatus,
  isValidCaptureToken,
  saveCaptureSessionImage,
} from "./captureSessions";

describe("captureSessions", () => {
  it("rejects malformed or path-traversal tokens", () => {
    expect(isValidCaptureToken("../etc/passwd")).toBe(false);
    expect(isValidCaptureToken("abc")).toBe(false);
    expect(isValidCaptureToken("a".repeat(32))).toBe(true);
  });

  it("creates, saves, and consumes a single-use session image", async () => {
    const { token, expiresAt } = await createCaptureSession();
    expect(isValidCaptureToken(token)).toBe(true);
    expect(expiresAt).toBeGreaterThan(Date.now());
    expect((await getCaptureSessionStatus(token))?.status).toBe("pending");

    const sample = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    const saved = await saveCaptureSessionImage(token, sample, "image/png");
    expect(saved).toBe(true);
    expect((await getCaptureSessionStatus(token))?.status).toBe("ready");

    // Second upload to an already-ready session must be rejected
    expect(await saveCaptureSessionImage(token, sample, "image/png")).toBe(false);

    const consumed = await consumeCaptureSessionImage(token);
    expect(consumed?.mimeType).toBe("image/png");
    expect(consumed?.buffer.equals(sample)).toBe(true);

    // Single-use: second consume returns null
    expect(await consumeCaptureSessionImage(token)).toBeNull();
  });
});
