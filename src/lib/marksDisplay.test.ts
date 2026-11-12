import { describe, expect, it } from "vitest";
import { alternativesCount, resolveMarksStyle, showPartMarks } from "./marksDisplay";

describe("alternativesCount", () => {
  it("returns k when the student answers only k of the parts", () => {
    expect(alternativesCount(4, 1)).toBe(1);
  });

  it("is undefined when every part is answered or the count is not a valid choice", () => {
    expect(alternativesCount(4, 4)).toBeUndefined();
    expect(alternativesCount(4, 0)).toBeUndefined();
    expect(alternativesCount(4, null)).toBeUndefined();
    expect(alternativesCount(4, 5)).toBeUndefined();
    expect(alternativesCount(1, 1)).toBeUndefined();
  });
});

describe("showPartMarks", () => {
  it("hides part marks when the student chooses among parts", () => {
    expect(showPartMarks(4, 1, "INLINE")).toBe(false);
    expect(showPartMarks(4, 2, "RIGHT_COLUMN")).toBe(false);
  });

  it("shows part marks when every part is answered and the style is not suppressed", () => {
    expect(showPartMarks(4, undefined, "INLINE")).toBe(true);
    expect(showPartMarks(4, 4, "INLINE")).toBe(true);
  });

  it("hides part marks when the style is suppressed", () => {
    expect(showPartMarks(4, undefined, "SUPPRESSED")).toBe(false);
  });
});

describe("resolveMarksStyle", () => {
  it("falls back to INLINE for empty or unknown values", () => {
    expect(resolveMarksStyle("")).toBe("INLINE");
    expect(resolveMarksStyle(null)).toBe("INLINE");
    expect(resolveMarksStyle("NOPE")).toBe("INLINE");
  });

  it("keeps a known style", () => {
    expect(resolveMarksStyle("RIGHT_COLUMN")).toBe("RIGHT_COLUMN");
  });
});
