import { describe, expect, it } from "vitest";
import {
  BOOKLET_MAX_PAGES,
  describeFit,
  FIT_LEVELS,
  fitMm,
  getFit,
  LAST_FIT_LEVEL,
  MIN_FONT_ZOOM,
  MIN_LINE_HEIGHT,
  MIN_QUESTION_GAP_MM,
  nextFitLevel,
} from "./printFit";

describe("print fit levels", () => {
  it("starts at the configured spacing", () => {
    expect(getFit(0)).toMatchObject({ gap: 1, space: 1, zoom: 1 });
  });

  it("only ever tightens, level by level", () => {
    for (let i = 1; i < FIT_LEVELS.length; i++) {
      const a = FIT_LEVELS[i - 1];
      const b = FIT_LEVELS[i];
      expect(b.level).toBe(i);
      expect(b.gap).toBeLessThan(a.gap);
      expect(b.lineHeight).toBeLessThanOrEqual(a.lineHeight);
      expect(b.space).toBeLessThan(a.space);
      expect(b.zoom).toBeLessThanOrEqual(a.zoom);
    }
  });

  it("never goes below the readability floors", () => {
    for (const f of FIT_LEVELS) {
      expect(f.zoom).toBeGreaterThanOrEqual(MIN_FONT_ZOOM);
      expect(f.lineHeight).toBeGreaterThanOrEqual(MIN_LINE_HEIGHT);
    }
  });

  it("keeps a usable staple margin and footer room as page padding shrinks", () => {
    for (let i = 1; i < FIT_LEVELS.length; i++) {
      expect(FIT_LEVELS[i].padX).toBeLessThanOrEqual(FIT_LEVELS[i - 1].padX);
      expect(FIT_LEVELS[i].padTop).toBeLessThanOrEqual(FIT_LEVELS[i - 1].padTop);
      expect(FIT_LEVELS[i].padBottom).toBeLessThanOrEqual(FIT_LEVELS[i - 1].padBottom);
    }
    for (const f of FIT_LEVELS) {
      expect(f.padX).toBeGreaterThanOrEqual(6);
      expect(f.padTop).toBeGreaterThanOrEqual(6);
      expect(f.padBottom).toBeGreaterThanOrEqual(12);
    }
  });

  it("clamps out-of-range levels", () => {
    expect(getFit(-3).level).toBe(0);
    expect(getFit(99).level).toBe(LAST_FIT_LEVEL);
  });
});

describe("fitMm", () => {
  it("leaves level 0 untouched", () => {
    expect(fitMm(3, getFit(0), MIN_QUESTION_GAP_MM)).toBe("3mm");
  });

  it("scales spacing but respects the floor", () => {
    const tight = getFit(LAST_FIT_LEVEL);
    expect(fitMm(4, tight, MIN_QUESTION_GAP_MM)).toBe(`${MIN_QUESTION_GAP_MM}mm`);
    expect(fitMm(10, getFit(2))).toBe("6.5mm");
  });

  it("never grows a spacing that is already below the floor", () => {
    expect(fitMm(0.4, getFit(3), 1.2)).toBe("0.4mm");
  });
});

describe("nextFitLevel", () => {
  it("stops when the paper fits", () => {
    expect(nextFitLevel(0, BOOKLET_MAX_PAGES)).toBeNull();
    expect(nextFitLevel(2, 5)).toBeNull();
  });

  it("steps one level down while it is too long", () => {
    expect(nextFitLevel(0, 9)).toBe(1);
    expect(nextFitLevel(3, 12)).toBe(4);
  });

  it("gives up at the tightest level", () => {
    expect(nextFitLevel(LAST_FIT_LEVEL, 9)).toBeNull();
  });

  it("respects a custom page limit", () => {
    expect(nextFitLevel(0, 5, 4)).toBe(1);
    expect(nextFitLevel(0, 4, 4)).toBeNull();
  });

  it("settles on the loosest level that fits a simulated paper", () => {
    // Pages shrink as spacing tightens: 11, 10, 9, 8, ...
    const pagesAt = (level: number) => 11 - level;
    let level = 0;
    for (let next = nextFitLevel(level, pagesAt(level)); next !== null; next = nextFitLevel(level, pagesAt(level))) {
      level = next;
    }
    expect(level).toBe(3);
    expect(pagesAt(level)).toBeLessThanOrEqual(BOOKLET_MAX_PAGES);
  });
});

describe("describeFit", () => {
  it("flags tightening and overflow", () => {
    expect(describeFit(0, 8)).toMatchObject({ tightened: false, overLimit: false });
    expect(describeFit(3, 8)).toMatchObject({ tightened: true, overLimit: false });
    expect(describeFit(LAST_FIT_LEVEL, 10)).toMatchObject({ tightened: true, overLimit: true, maxPages: 8 });
  });
});
