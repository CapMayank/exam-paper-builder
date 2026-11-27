import { describe, expect, it } from "vitest";
import { pageFill } from "./pageFill";

// The print area of an A4 page is 182 x 267 mm (14 mm margins); the first page also carries the school header.
const PAGE = 700 * (267 / 182);

describe("pageFill", () => {
  it("measures a short worksheet as part of one page that fits", () => {
    const r = pageFill(400, 700);
    expect(r.pages).toBeCloseTo(400 / PAGE + 0.12, 2);
    expect(r.level).toBe("fits");
  });

  it("says print will shrink a worksheet a little past two pages", () => {
    expect(pageFill(PAGE * 2.2, 700).level).toBe("shrinks");
  });

  it("warns when print has to shrink a lot", () => {
    expect(pageFill(PAGE * 3.2, 700).level).toBe("tiny");
  });

  it("returns nothing for an empty or unmeasured page", () => {
    expect(pageFill(0, 700)).toEqual({ pages: 0, level: "fits" });
    expect(pageFill(500, 0)).toEqual({ pages: 0, level: "fits" });
  });
});
