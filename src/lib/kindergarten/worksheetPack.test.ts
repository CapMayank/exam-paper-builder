import { describe, expect, it } from "vitest";
import { seededRandom } from "./seeded";
import { packWorksheet, pageCount, rowHeight, rowsFor, splitColumns, type LayoutRow, type PackItem, type PackPages } from "./worksheetPack";

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
