import { describe, expect, it } from "vitest";
import { barakhadi } from "./activities/hindiBarakhadi";

describe("barakhadi", () => {
  it("gives the twelve forms of a consonant", () => {
    expect(barakhadi("क")).toEqual(["क", "का", "कि", "की", "कु", "कू", "के", "कै", "को", "कौ", "कं", "कः"]);
  });
});
