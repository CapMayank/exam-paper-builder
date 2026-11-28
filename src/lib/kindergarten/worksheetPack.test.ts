import { describe, expect, it } from "vitest";
import { rowHeight, rowsFor, splitColumns, type LayoutRow, type PackItem } from "./worksheetPack";

const full = (id: string, height: number): PackItem => ({ id, half: false, height });
const half = (id: string, height: number): PackItem => ({ id, half: true, height });
const flatten = (rows: LayoutRow[]) => rows.flatMap((r) => (r.kind === "full" ? r.ids : [...r.left, ...r.right]));

describe("splitColumns", () => {
  it("puts a single activity in the left column", () => {
    expect(splitColumns([100], 4)).toBe(1);
  });

  it("balances a tall activity against two short ones stacked", () => {
    expect(splitColumns([200, 90, 100], 4)).toBe(1);
  });

  it("splits equal activities down the middle", () => {
    expect(splitColumns([50, 50, 50, 50], 4)).toBe(2);
  });
});

describe("rowsFor", () => {
  const items = [full("F1", 300), half("H1", 200), half("H2", 90), half("H3", 100), full("F2", 150)];

  it("makes one columns row from a run of small activities", () => {
    expect(rowsFor(items, 4)).toEqual([
      { kind: "full", ids: ["F1"] },
      { kind: "columns", left: ["H1"], right: ["H2", "H3"] },
      { kind: "full", ids: ["F2"] },
    ]);
  });

  it("keeps the reading order of the activities", () => {
    expect(flatten(rowsFor(items, 4))).toEqual(items.map((i) => i.id));
  });

  it("measures a columns row by its taller column", () => {
    const heights = new Map(items.map((i) => [i.id, i.height]));
    expect(rowHeight(rowsFor(items, 4)[1], heights, 4)).toBe(200);
  });
});
