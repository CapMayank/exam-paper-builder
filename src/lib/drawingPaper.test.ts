import { describe, expect, it } from "vitest";
import { DRAWING_LAYOUT, isDrawingSubject, layoutForSubject } from "./drawingPaper";

describe("Drawing papers", () => {
  it("recognises the Drawing subject", () => {
    expect(isDrawingSubject("Drawing")).toBe(true);
    expect(isDrawingSubject("drawing")).toBe(true);
    expect(isDrawingSubject("Drawing / चित्रकला")).toBe(true);
    expect(isDrawingSubject("चित्रकला")).toBe(true);
    expect(isDrawingSubject("Art & Craft")).toBe(false);
    expect(isDrawingSubject("Engineering Drawing Basics")).toBe(true);
    expect(isDrawingSubject("General Knowledge")).toBe(false);
    expect(isDrawingSubject(null)).toBe(false);
  });
  it("always prints on single portrait pages, never the folded booklet", () => {
    expect(DRAWING_LAYOUT).toBe("PAGE");
    expect(layoutForSubject("Drawing", "BOOKLET")).toBe("PAGE");
    expect(layoutForSubject("Drawing", "BOOKLET_A4")).toBe("PAGE");
    expect(layoutForSubject("Mathematics", "BOOKLET")).toBe("BOOKLET");
  });
});
