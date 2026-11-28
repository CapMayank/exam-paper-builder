import { describe, expect, it } from "vitest";
import { createArrangePlan } from "./arrangePlan";
import type { WorksheetMeasure } from "@/lib/kindergarten/worksheetPack";

// measured on the 12-activity test worksheet: planned for 76%, print needed 72%
const heights: Record<string, number> = { a: 421, b: 275, c: 265, d: 289, e: 230, f: 158, g: 153, h: 248, i: 245, j: 202, k: 195, l: 189 };
const half: Record<string, boolean> = { b: true, c: true, e: true, f: true, g: true, h: true };
const measure = (order: string[]): WorksheetMeasure => ({ order, heights, half, headerPx: 221, pageHeightPx: 1003, gapPx: 8 });
// reversed, as on the test worksheet before print arranged it
const start = ["l", "k", "j", "i", "h", "g", "f", "e", "d", "c", "b", "a"];

describe("createArrangePlan", () => {
  it("ignores a print size reported before the arranged order has been drawn", () => {
    const plan = createArrangePlan();
    const first = plan.measured(measure(start));
    expect(first).not.toBeNull(); // nothing to correct yet: the size below belongs to the old layout
    expect(plan.fitScale(0.6)).toBeNull();
  });

  it("re-arranges once for the size print settles on after drawing the arranged order", () => {
    const plan = createArrangePlan();
    const first = plan.measured(measure(start)) ?? start;
    plan.saved(first);
    plan.measured(measure(first)); // print drew the arranged order
    expect(plan.fitScale(0.72)).not.toBeNull();
    expect(plan.fitScale(0.68)).toBeNull(); // only once
  });

  it("does nothing when print fits at the planned size or larger", () => {
    const plan = createArrangePlan();
    const first = plan.measured(measure(start)) ?? start;
    plan.saved(first);
    plan.measured(measure(first));
    expect(plan.fitScale(0.76)).toBeNull();
  });

  it("arranges only on the first measurement of a visit", () => {
    const plan = createArrangePlan();
    plan.measured(measure(start));
    expect(plan.measured(measure([...start].reverse()))).toBeNull();
  });

  it("stops after Undo", () => {
    const plan = createArrangePlan();
    const first = plan.measured(measure(start)) ?? start;
    plan.saved(first);
    plan.measured(measure(first));
    plan.stop();
    expect(plan.fitScale(0.5)).toBeNull();
  });
});
