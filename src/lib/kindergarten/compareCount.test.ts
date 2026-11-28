import { describe, expect, it } from "vitest";
import { comparePlugin, rowSizes, tallestShortest } from "./activities/compare";
import { countItemsPlugin } from "./activities/countItems";
import type { CompareConfig, CountItemsConfig } from "./types";

describe("compare: tallest and shortest", () => {
  it("still validates an old config with no sizes", () => {
    const old: CompareConfig = { mode: "TALLER", instruction: "x", rows: [{ clipartId: "apple", left: 2, right: 4 }] };
    expect(comparePlugin.validateConfig(old).valid).toBe(true);
    expect(rowSizes(old.rows[0])).toEqual([2, 4]);
  });

  it("accepts distinct tallest and shortest", () => {
    const c: CompareConfig = { mode: "TALLEST_SHORTEST", instruction: "x", rows: [{ clipartId: "tree", left: 1, right: 5, sizes: [2, 5, 3] }] };
    expect(comparePlugin.validateConfig(c).valid).toBe(true);
    expect(tallestShortest([2, 5, 3])).toEqual({ tallest: 1, shortest: 0 });
  });

  it("rejects a row where two pictures tie for tallest or shortest", () => {
    const tallTie: CompareConfig = { mode: "TALLEST_SHORTEST", instruction: "x", rows: [{ clipartId: "tree", left: 1, right: 5, sizes: [5, 5, 2] }] };
    const shortTie: CompareConfig = { mode: "TALLEST_SHORTEST", instruction: "x", rows: [{ clipartId: "tree", left: 1, right: 5, sizes: [1, 1, 4] }] };
    expect(comparePlugin.validateConfig(tallTie).valid).toBe(false);
    expect(comparePlugin.validateConfig(shortTie).valid).toBe(false);
  });

  it("is never half width", () => {
    const c: CompareConfig = { mode: "TALLEST_SHORTEST", instruction: "x", rows: [{ clipartId: "tree", left: 1, right: 5, sizes: [2, 5, 3] }] };
    expect(comparePlugin.halfWidth?.(c)).toBe(false);
  });
});

describe("count objects: groups", () => {
  const base: CountItemsConfig = { clipartId: "balloon", count: 5, layout: "GRID", answerStyle: "SQUARE_BOX", objectName: "balloons", instruction: "x" };

  it("keeps old configs unchanged", () => {
    expect(countItemsPlugin.validateConfig(base).valid).toBe(true);
    expect(countItemsPlugin.getSummary!(base, "")).toBe("Count 5 balloons");
  });

  it("mentions the number of groups", () => {
    const c = { ...base, groups: [{ clipartId: "apple", count: 3 }, { clipartId: "ball", count: 2 }] };
    expect(countItemsPlugin.validateConfig(c).valid).toBe(true);
    expect(countItemsPlugin.getSummary!(c, "")).toContain("3 groups");
    expect(countItemsPlugin.getSummary!({ ...base, groups: [] }, "")).toBe("Count 5 balloons");
  });
});
