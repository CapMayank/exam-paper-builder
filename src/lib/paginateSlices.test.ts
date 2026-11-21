import { describe, expect, it } from "vitest";
import { paginateSlices } from "./layout";

describe("paginateSlices: a passage or a part's options cross the page instead of leaving it empty", () => {
  it("cuts a block at the lowest cut that still fits and carries the rest overleaf", () => {
    // 40px used, a 100px passage with a cut every 10px, page 100px tall
    const pages = paginateSlices([40, 100], [false, false], 100, undefined, undefined, [null, [20, 30, 40, 50, 60, 70, 80]]);
    expect(pages).toEqual([
      [{ i: 0, from: 0 }, { i: 1, from: 0, to: 60 }],
      [{ i: 1, from: 60 }],
    ]);
  });

  it("moves a block whole when no cut fits", () => {
    const pages = paginateSlices([90, 50], [false, false], 100, undefined, undefined, [null, [20, 30]]);
    expect(pages).toEqual([[{ i: 0, from: 0 }], [{ i: 1, from: 0 }]]);
  });

  it("keeps blocks that fit whole and never cuts one that fits", () => {
    const pages = paginateSlices([30, 30], [false, false], 100, undefined, undefined, [[10, 20], [10, 20]]);
    expect(pages).toEqual([[{ i: 0, from: 0 }, { i: 1, from: 0 }]]);
  });

  it("a passage glued to its first part is cut inside the passage so the part goes with its end", () => {
    // passage 60 (cuts every 10) glued to a 40px part that cannot be cut; 50px left on the page
    const pages = paginateSlices([50, 60, 40], [false, true, false], 100, undefined, undefined, [null, [10, 20, 30, 40, 50], null]);
    expect(pages).toEqual([
      [{ i: 0, from: 0 }, { i: 1, from: 0, to: 50 }],
      [{ i: 1, from: 50 }, { i: 2, from: 0 }],
    ]);
  });

  it("reserves the continuation banner on the page the rest of a question opens", () => {
    const pages = paginateSlices([70, 120], [false, false], 100, ["q1", "q2"], undefined, [null, [20, 50, 80, 110]]);
    // q2: 20 on page 1; then 24px banner + 90 left > 100, so cut again at 80 (24 + 60 = 84)
    expect(pages).toEqual([
      [{ i: 0, from: 0 }, { i: 1, from: 0, to: 20 }],
      [{ i: 1, from: 20, to: 80 }],
      [{ i: 1, from: 80 }],
    ]);
  });

  it("a block taller than a page is cut across pages", () => {
    const cuts = Array.from({ length: 24 }, (_, k) => (k + 1) * 10);
    const pages = paginateSlices([250], [false], 100, undefined, undefined, [cuts]);
    expect(pages).toEqual([[{ i: 0, from: 0, to: 100 }], [{ i: 0, from: 100, to: 200 }], [{ i: 0, from: 200 }]]);
  });
});
