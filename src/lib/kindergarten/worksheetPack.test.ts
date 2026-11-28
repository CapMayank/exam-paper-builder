import { describe, expect, it } from "vitest";
import { seededRandom } from "./seeded";
import { arrangeForPrint, blankArea, packPagesAt, packWorksheet, pageCount, printZoomFor, rowHeight, rowsFor, splitColumns, type LayoutRow, type PackItem, type PackPages } from "./worksheetPack";

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

/** Heights (px at 182 mm) of the 28 activities on the test worksheet, roughly as they print at full size. */
const FIXTURE_28: PackItem[] = [
  half("text-match", 190), half("mark-letters", 120), half("join-letters", 210), half("arrange", 130),
  full("sentence", 200), full("answer-lines", 150), full("word-search", 330), full("first-letter", 170),
  half("neighbours", 230), half("compare-sign", 230), full("vertical-sum", 120), half("number-order", 170),
  half("number-match", 200), half("number-names", 200), half("draw", 180), full("shape-sentence", 190),
  full("barakhadi", 130), half("hindi-match", 200), half("hindi-join", 170), full("hindi-sentence", 190),
  half("unjumble", 140), full("hindi-answer", 140), full("missing-letters", 170), full("name-circle", 110),
  full("count-groups", 200), full("tallest", 120), full("add-matra", 70), full("grid-100", 520),
];
const A4: PackPages = { page1: 880, page2: 1000, gap: 8 };
const ids = (items: PackItem[]) => items.map((i) => i.id);
const inOrder = (items: PackItem[], order: string[]) => order.map((id) => items.find((i) => i.id === id)!);

function generated(seed: number): PackItem[] {
  const rand = seededRandom(seed);
  return Array.from({ length: 12 }, (_, i) => ({ id: `a${i}`, half: rand() < 0.5, height: 60 + Math.floor(rand() * 340) }));
}

describe("packWorksheet", () => {
  it("returns every activity exactly once", () => {
    const out = packWorksheet(FIXTURE_28, A4);
    expect(out).toHaveLength(FIXTURE_28.length);
    expect(new Set(out)).toEqual(new Set(ids(FIXTURE_28)));
  });

  it("never needs more pages than the teacher's order", () => {
    expect(pageCount(inOrder(FIXTURE_28, packWorksheet(FIXTURE_28, A4)), A4)).toBeLessThanOrEqual(pageCount(FIXTURE_28, A4));
    for (let s = 1; s <= 50; s++) {
      const items = generated(s);
      expect(pageCount(inOrder(items, packWorksheet(items, A4)), A4), `seed ${s}`).toBeLessThanOrEqual(pageCount(items, A4));
    }
  });

  it("gives the same order when run again on its own result", () => {
    const once = packWorksheet(FIXTURE_28, A4);
    expect(packWorksheet(inOrder(FIXTURE_28, once), A4)).toEqual(once);
  });

  it("brings two small activities together rather than leave each alone", () => {
    const out = packWorksheet([half("H1", 150), full("F", 300), half("H2", 150)], A4);
    expect(Math.abs(out.indexOf("H1") - out.indexOf("H2"))).toBe(1);
  });

  it("fills the rest of page 1 with an activity that fits there", () => {
    const pages = { page1: 500, page2: 1000, gap: 0 };
    expect(packWorksheet([full("A", 300), full("B", 400), full("C", 200)], pages)).toEqual(["A", "C", "B"]);
  });

  it("keeps an order that is already as good as it gets", () => {
    expect(packWorksheet([full("A", 300), full("B", 200)], { page1: 500, page2: 1000, gap: 0 })).toEqual(["A", "B"]);
  });

  it("makes no columns when every activity is full width", () => {
    const items = [300, 120, 450, 80, 200, 260].map((h, i) => full(`f${i}`, h));
    const out = inOrder(items, packWorksheet(items, A4));
    expect(rowsFor(out, A4.gap).every((r) => r.kind === "full")).toBe(true);
  });

  it("copes with an activity taller than a whole page, quickly", () => {
    const items = [...FIXTURE_28, full("huge", 2000)];
    const t = performance.now();
    const out = packWorksheet(items, A4);
    expect(performance.now() - t).toBeLessThan(500);
    expect(new Set(out).size).toBe(items.length);
    expect(Number.isFinite(pageCount(inOrder(items, out), A4))).toBe(true);
  });
});

describe("arrangeForPrint", () => {
  const measured = (order: string[], heights: Record<string, number>, half: Record<string, boolean> = {}) => ({
    order,
    heights,
    half,
    headerPx: 100,
    pageHeightPx: 600,
  });

  it("returns the new order when packing fills page 1 better", () => {
    // page 1 holds (600 − 100) × 0.97 = 485: A (300) + C (180) fit, B (400) goes to page 2
    expect(arrangeForPrint(measured(["A", "B", "C"], { A: 300, B: 400, C: 180 }))).toEqual(["A", "C", "B"]);
  });

  it("returns null when the order is already the packed one", () => {
    expect(arrangeForPrint(measured(["A", "C", "B"], { A: 300, B: 400, C: 180 }))).toBeNull();
  });

  it("returns null for an empty or one-activity worksheet", () => {
    expect(arrangeForPrint(measured([], {}))).toBeNull();
    expect(arrangeForPrint(measured(["A"], { A: 300 }))).toBeNull();
  });

  it("returns null when a height is missing", () => {
    expect(arrangeForPrint(measured(["A", "B"], { A: 300 }))).toBeNull();
  });
});

describe("arrangeForPrint when the worksheet has to shrink", () => {
  it("arranges for the size it will print at, so it fits 2 pages as large as possible", () => {
    const heights = { A: 100, B: 284, C: 443, D: 438, E: 198 };
    const out = arrangeForPrint({ order: ["A", "B", "C", "D", "E"], heights, half: {}, headerPx: 100, pageHeightPx: 600 })!;
    const fitsAt = (z: number) =>
      pageCount(
        out.map((id) => ({ id, half: false, height: heights[id as keyof typeof heights] })),
        { page1: (600 * 0.97) / z - 100, page2: (600 * 0.97) / z, gap: 0 },
      ) <= 2;
    // 68% is the largest print size at which any order of these fits one sheet
    expect(fitsAt(0.68)).toBe(true);
  });
});

describe("arrangeForPrint with the space print leaves between activities", () => {
  it("counts that space, so two activities that only fit without it are not put on one page", () => {
    // page 1 holds 485: A (300) + C (180) = 480 fits, but not with 10 between them
    const m = { order: ["A", "B", "C"], heights: { A: 300, B: 400, C: 180 }, half: {}, headerPx: 100, pageHeightPx: 600, gapPx: 10 };
    expect(arrangeForPrint(m)).toEqual(["B", "A", "C"]);
  });
});

describe("packPagesAt", () => {
  const m = { order: [], heights: {}, half: {}, headerPx: 100, pageHeightPx: 600, gapPx: 8 };

  it("gives full-size page heights at 100%", () => {
    expect(packPagesAt(m, 1)).toEqual({ page1: 600 * 0.97 - 100, page2: 600 * 0.97, gap: 8 });
  });

  it("shrinks the header with everything else when printing smaller", () => {
    // at 50% the page holds twice as much full-size content, and the header is still 100 of it
    expect(packPagesAt(m, 0.5)).toEqual({ page1: (600 * 0.97) / 0.5 - 100, page2: (600 * 0.97) / 0.5, gap: 8 });
  });
});

describe("re-packing for the size print settled on", () => {
  // measured on the 12-activity test worksheet: fits 2 pages at 76% on paper, but print needed 72%
  const ids = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l"];
  const m = {
    order: ids,
    heights: { a: 421, b: 275, c: 265, d: 289, e: 230, f: 158, g: 153, h: 248, i: 245, j: 202, k: 195, l: 189 } as Record<string, number>,
    half: { b: true, c: true, e: true, f: true, g: true, h: true } as Record<string, boolean>,
    headerPx: 221,
    pageHeightPx: 1003,
    gapPx: 8,
  };
  const items = (order: string[]) => order.map((id) => ({ id, half: !!m.half[id], height: m.heights[id] }));

  it("says which print size it arranged for", () => {
    expect(printZoomFor(m)).toBe(0.76);
  });

  it("fills page 1 better when told the real print size", () => {
    const at72 = packPagesAt(m, 0.72);
    const out = arrangeForPrint(m, 0.72) ?? ids;
    expect(pageCount(items(out), at72)).toBe(2);
    expect(blankArea(items(out), at72)).toBeLessThan(blankArea(items(ids), at72));
  });
});

describe("packing time is bounded", () => {
  it("finishes a very large worksheet quickly, the same way every time", () => {
    const rand = seededRandom(99);
    const order = Array.from({ length: 60 }, (_, i) => `a${i}`);
    const m = {
      order,
      heights: Object.fromEntries(order.map((id) => [id, 60 + Math.floor(rand() * 400)])),
      half: Object.fromEntries(order.map((id) => [id, rand() < 0.6])),
      headerPx: 150,
      pageHeightPx: 1000,
      gapPx: 8,
    };
    const t = performance.now();
    const once = arrangeForPrint(m);
    expect(performance.now() - t).toBeLessThan(1500);
    expect(arrangeForPrint(m)).toEqual(once);
  });
});
