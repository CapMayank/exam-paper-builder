import { describe, expect, it } from "vitest";
import { blankPattern, decadeLead, gridOrder, gridShape, numberCells } from "./gridPlacement";

describe("gridOrder", () => {
  it("keeps row order for ROW", () => {
    expect(gridOrder(6, 3, "ROW")).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("fills down each column, ten to a column, for COLUMN", () => {
    const order = gridOrder(20, 3, "COLUMN");
    expect(order.slice(0, 4)).toEqual([0, 10, 1, 11]);
    expect(order.slice(18)).toEqual([9, 19]);
  });

  it("puts 1–10 in the first column of a 1–50, 5-column grid", () => {
    const order = gridOrder(50, 5, "COLUMN");
    expect(order.slice(0, 5)).toEqual([0, 10, 20, 30, 40]);
    expect(order[45]).toBe(9);
  });

  it("pads the bottom of the last column when the count doesn't fill it", () => {
    const order = gridOrder(23, 5, "COLUMN");
    // 3 columns of ten: 1–10, 11–20, 21–23
    expect(order).toHaveLength(30);
    expect(order.slice(0, 3)).toEqual([0, 10, 20]);
    expect(order.slice(3, 6)).toEqual([1, 11, 21]);
    expect([order[8], order[29]]).toEqual([22, null]);
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
  it("puts ten numbers in each column when counting down, whatever columns were asked for", () => {
    expect(gridShape(20, 5, "COLUMN")).toEqual({ rows: 10, columns: 2 });
    expect(gridShape(50, 10, "COLUMN")).toEqual({ rows: 10, columns: 5 });
    expect(gridShape(100, 5, "COLUMN")).toEqual({ rows: 10, columns: 10 });
    expect(gridShape(23, 5, "COLUMN")).toEqual({ rows: 10, columns: 3 });
  });

  it("uses one short column when all the numbers fit in one ten", () => {
    expect(gridShape(6, 5, "COLUMN")).toEqual({ rows: 6, columns: 1 });
    expect(gridOrder(6, 5, "COLUMN")).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("lines columns up with the tens when the grid starts mid-ten", () => {
    // 5–25: first column is 1–10 with 1–4 empty, then 11–20, then 21–25
    const lead = decadeLead(numberCells(5, 25, "NONE"));
    expect(lead).toBe(4);
    expect(gridShape(21, 10, "COLUMN", lead)).toEqual({ rows: 10, columns: 3 });
    const order = gridOrder(21, 10, "COLUMN", lead);
    expect(order.slice(0, 3)).toEqual([null, 6, 16]); // row 1: (1), 11, 21
    expect(order.slice(12, 15)).toEqual([0, 10, 20]); // row 5: 5, 15, 25
  });

  it("lines descending grids up with the tens too", () => {
    expect(decadeLead(numberCells(1, 100, "NONE", true))).toBe(0);
    expect(decadeLead(numberCells(1, 95, "NONE", true))).toBe(5); // 100–96 empty above 95
    expect(decadeLead(numberCells(0, 20, "NONE"))).toBe(0); // 0–9, 10–19, 20
    expect(decadeLead([{ value: "a" }])).toBe(0);
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

describe("descending number grids", () => {
  it("lists the numbers high to low", () => {
    expect(numberCells(1, 5, "NONE", true).map((c) => c.value)).toEqual([5, 4, 3, 2, 1]);
  });

  it("leaves only the highest printed for all-blank", () => {
    expect(numberCells(1, 4, "ALL_BLANK", true)).toEqual([
      { value: 4, isBlank: false },
      { value: 3, isBlank: true },
      { value: 2, isBlank: true },
      { value: 1, isBlank: true },
    ]);
  });

  it("detects each pattern from a descending grid", () => {
    for (const p of ["ALL_BLANK", "ALTERNATE", "EVERY_THIRD", "NONE"] as const) {
      expect(blankPattern(numberCells(1, 20, p, true))).toBe(p);
    }
  });

  it("is unchanged when not descending", () => {
    expect(numberCells(1, 3, "ALL_BLANK")).toEqual(numberCells(1, 3, "ALL_BLANK", false));
    expect(numberCells(1, 3, "NONE").map((c) => c.value)).toEqual([1, 2, 3]);
  });
});
