import { describe, expect, it } from "vitest";
import { BARAKHADI_INSTRUCTIONS, barakhadi } from "./activities/hindiBarakhadi";

describe("barakhadi", () => {
  it("gives the twelve forms of a consonant", () => {
    expect(barakhadi("क")).toEqual(["क", "का", "कि", "की", "कु", "कू", "के", "कै", "को", "कौ", "कं", "कः"]);
  });

  it("has its own instruction for tracing, copying and writing", () => {
    expect(new Set(Object.values(BARAKHADI_INSTRUCTIONS)).size).toBe(3);
    expect(BARAKHADI_INSTRUCTIONS.ALL).toContain("Trace");
  });
});
