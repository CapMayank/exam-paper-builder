import { describe, expect, it } from "vitest";
import { numberNeighboursDefaultConfig, numberNeighboursPlugin } from "./numberNeighbours";
import { numberCompareSignDefaultConfig, numberCompareSignPlugin } from "./numberCompareSign";

describe("number neighbours", () => {
  it("refuses 'before 0', which has no answer a KG child knows", () => {
    const c = { ...numberNeighboursDefaultConfig(), mode: "BEFORE" as const, rows: [{ a: 0 }] };
    expect(numberNeighboursPlugin.validateConfig(c).valid).toBe(false);
    expect(numberNeighboursPlugin.validateConfig({ ...c, rows: [{ a: 1 }] }).valid).toBe(true);
  });

  it("refuses numbers below zero or above 100", () => {
    const c = numberNeighboursDefaultConfig();
    expect(numberNeighboursPlugin.validateConfig({ ...c, rows: [{ a: -3 }] }).valid).toBe(false);
    expect(numberNeighboursPlugin.validateConfig({ ...c, rows: [{ a: 100 }] }).valid).toBe(false); // after 100 is 101
  });
});

describe("compare numbers", () => {
  it("refuses numbers outside 0–100", () => {
    const c = numberCompareSignDefaultConfig();
    expect(numberCompareSignPlugin.validateConfig({ ...c, rows: [{ a: -1, b: 3 }] }).valid).toBe(false);
    expect(numberCompareSignPlugin.validateConfig({ ...c, rows: [{ a: 4, b: 500 }] }).valid).toBe(false);
    expect(numberCompareSignPlugin.validateConfig({ ...c, rows: [{ a: 4, b: 4 }] }).valid).toBe(true);
  });
});
