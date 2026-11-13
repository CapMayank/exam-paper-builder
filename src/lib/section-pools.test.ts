import { describe, expect, it } from "vitest";
import { applySlotDeltas, poolOf, rebalanceProblem } from "./sectionPools";

const sec = (id: string, type: string, count: number, extra: Record<string, unknown> = {}) => ({
  id,
  title: `Section ${id}`,
  type,
  count,
  marksEach: 1,
  flexible: true,
  role: "STANDARD",
  ...extra,
});
const sections = [sec("a", "MCQ", 5), sec("b", "FILL_BLANK", 5), sec("c", "SHORT", 3, { marksEach: 2 }), sec("d", "TRUE_FALSE", 4, { flexible: false })];

describe("poolOf", () => {
  it("groups same-mark flexible objective sections", () => {
    expect(poolOf(sections[0], sections).sort()).toEqual(["a", "b"]);
  });
  it("a 2-mark section, a rigid section and a match section have no pool partners", () => {
    expect(poolOf(sections[2], sections)).toEqual(["c"]);
    expect(poolOf(sections[3], sections)).toEqual(["d"]);
    expect(poolOf(sec("m", "MATCH_COLUMN", 4), [...sections, sec("m", "MATCH_COLUMN", 4)])).toEqual(["m"]);
  });
  it("a non-standard role (passage, grammar) never pools", () => {
    const s = [sec("a", "MCQ", 5), sec("p", "MCQ", 5, { role: "PASSAGE" })];
    expect(poolOf(s[0], s)).toEqual(["a"]);
  });
});

describe("rebalanceProblem", () => {
  const filled = { a: 4, b: 1 };
  it("moves free slots between pool partners", () => {
    expect(rebalanceProblem(sections, filled, "a", "b", 1)).toBeNull();
  });
  it("refuses taking slots that are already filled", () => {
    expect(rebalanceProblem(sections, filled, "a", "b", 2)).toMatch(/already has 4/);
  });
  it("refuses leaving a section with no slot at all", () => {
    expect(rebalanceProblem([sec("a", "MCQ", 1), sec("b", "FILL_BLANK", 5)], { a: 0, b: 0 }, "a", "b", 1)).toMatch(/at least one/);
  });
  it("refuses unlike sections, same section, and non-positive counts", () => {
    expect(rebalanceProblem(sections, filled, "a", "c", 1)).toMatch(/same marks/);
    expect(rebalanceProblem(sections, filled, "a", "a", 1)).toMatch(/different/);
    expect(rebalanceProblem(sections, filled, "a", "b", 0)).toMatch(/at least 1/);
    expect(rebalanceProblem(sections, filled, "a", "zzz", 1)).toMatch(/not part/);
  });
});

describe("applySlotDeltas", () => {
  it("adds each section's delta and keeps the pool's total", () => {
    const out = applySlotDeltas(sections, [{ sectionId: "a", delta: -2 }, { sectionId: "b", delta: 2 }]);
    expect(out.map((s) => s.count)).toEqual([3, 7, 3, 4]);
    expect(out[0].count + out[1].count).toBe(10);
  });
  it("ignores deltas for sections that no longer exist", () => {
    expect(applySlotDeltas(sections, [{ sectionId: "gone", delta: 3 }]).map((s) => s.count)).toEqual([5, 5, 3, 4]);
  });
});
