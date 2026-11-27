import { describe, expect, it } from "vitest";
import { blankPattern, gridOrder, gridShape, numberCells } from "./gridPlacement";

describe("gridOrder", () => {
  it("keeps row order for ROW", () => {
    expect(gridOrder(6, 3, "ROW")).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("fills down each column for COLUMN", () => {
    expect(gridOrder(6, 3, "COLUMN")).toEqual([0, 2, 4, 1, 3, 5]);
  });

  it("puts 1–10 in the first column of a 1–50, 5-column grid", () => {
    const order = gridOrder(50, 5, "COLUMN");
    expect(order.slice(0, 5)).toEqual([0, 10, 20, 30, 40]);
    expect(order[45]).toBe(9);
  });

  it("pads the bottom of the last column when the count doesn't fill it", () => {
    const order = gridOrder(23, 5, "COLUMN");
    expect(order).toHaveLength(25);
    expect([4, 9, 14, 19, 24].map((p) => order[p])).toEqual([20, 21, 22, null, null]);
  });

  it("does not pad in ROW mode", () => {
    expect(gridOrder(23, 5, "ROW")).toHaveLength(23);
  });

  it("returns nothing for an empty grid", () => {
    expect(gridOrder(0, 5, "COLUMN")).toEqual([]);
  });
});

describe("number grid blanks", () => {
  it("builds cells for each blank pattern", () => {
    expect(numberCells(1, 4, "ALTERNATE").map((c) => c.isBlank)).toEqual([false, true, false, true]);
    expect(numberCells(1, 6, "EVERY_THIRD").map((c) => c.isBlank)).toEqual([false, false, true, false, false, true]);
    expect(numberCells(1, 3, "ALL_BLANK").map((c) => c.isBlank)).toEqual([false, true, true]);
    expect(numberCells(5, 7, "NONE").map((c) => c.value)).toEqual([5, 6, 7]);
  });

  it("recognises the pattern a grid was built with", () => {
    for (const p of ["NONE", "ALTERNATE", "EVERY_THIRD", "ALL_BLANK"] as const) {
      expect(blankPattern(numberCells(1, 20, p))).toBe(p);
    }
  });

  it("calls hand-toggled blanks CUSTOM", () => {
    const cells = numberCells(1, 10, "NONE");
    cells[3] = { ...cells[3], isBlank: true };
    expect(blankPattern(cells)).toBe("CUSTOM");
  });
});

describe("gridShape", () => {
  it("never leaves a whole column empty when counting down", () => {
    expect(gridShape(6, 5, "COLUMN")).toEqual({ rows: 2, columns: 3 });
    expect(gridOrder(6, 5, "COLUMN")).toEqual([0, 2, 4, 1, 3, 5]);
  });

  it("keeps the asked-for columns when they all get numbers", () => {
    expect(gridShape(50, 5, "COLUMN")).toEqual({ rows: 10, columns: 5 });
    expect(gridShape(23, 5, "COLUMN")).toEqual({ rows: 5, columns: 5 });
  });

  it("keeps the old across-rows layout exactly, so saved papers print the same", () => {
    expect(gridShape(3, 10, "ROW")).toEqual({ rows: 1, columns: 10 });
    expect(gridShape(23, 5, "ROW")).toEqual({ rows: 5, columns: 5 });
  });

  it("keeps columns between 2 and 10 like the printed grid", () => {
    expect(gridShape(40, 12, "ROW").columns).toBe(10);
    expect(gridShape(40, 1, "ROW").columns).toBe(2);
  });
});
