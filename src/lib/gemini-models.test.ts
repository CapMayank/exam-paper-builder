import { afterEach, describe, expect, it, vi } from "vitest";
import { normalizeModelName, resolveModelChain } from "./gemini";

afterEach(() => vi.unstubAllEnvs());

describe("Gemini model resolution", () => {
  it("maps retired model names onto maintained aliases", () => {
    expect(normalizeModelName("gemini-2.5-pro")).toBe("gemini-pro-latest");
    expect(normalizeModelName("gemini-2.5-flash")).toBe("gemini-flash-latest");
    expect(normalizeModelName("gemini-2.0-flash-lite")).toBe("gemini-flash-lite-latest");
    expect(normalizeModelName("some-new-model")).toBe("some-new-model");
    expect(normalizeModelName("  ")).toBeUndefined();
  });

  it("never puts a retired model in the chain", () => {
    vi.stubEnv("GEMINI_MODEL", "gemini-2.5-flash");
    for (const chosen of ["gemini-2.5-pro", "gemini-2.0-flash", undefined]) {
      for (const m of resolveModelChain(chosen)) expect(m).not.toMatch(/^gemini-(1\.5|2\.0|2\.5)/);
    }
  });

  it("starts with the requested tier and falls back to cheaper ones", () => {
    vi.stubEnv("GEMINI_MODEL", "");
    expect(resolveModelChain("gemini-pro-latest")).toEqual(["gemini-pro-latest", "gemini-flash-latest", "gemini-flash-lite-latest"]);
    expect(resolveModelChain(undefined)).toEqual(["gemini-flash-latest", "gemini-flash-lite-latest"]);
  });
});
