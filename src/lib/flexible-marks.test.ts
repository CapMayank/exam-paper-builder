import { describe, expect, it } from "vitest";
import { paperStatus, slotPlacement, spansSlots, whyCannotAdd, type BlueprintDef } from "./blueprint";
import { isFlexibleClass, withEffectiveAllowedTypes } from "./sectionTypes";

const pairs = (n: number) => Array.from({ length: n }, (_, i) => `A${i} ||| B${i}`);
const match = (n: number) => ({ type: "MATCH_COLUMN", text: "Match the following", options: pairs(n) });

const mcqSection = (flexible: boolean, extra: Record<string, unknown> = {}) => ({
  id: "s1",
  title: "Section A",
  type: "MCQ",
  count: 5,
  marksEach: 1,
  allowedTypesJson: '["MCQ","MATCH_COLUMN"]',
  flexible,
  ...extra,
});

describe("spansSlots", () => {
  it("true only for a flexible 1-mark multi-slot section that allows match", () => {
    expect(spansSlots(mcqSection(true))).toBe(true);
    expect(spansSlots(mcqSection(false))).toBe(false);
    expect(spansSlots(mcqSection(true, { marksEach: 2 }))).toBe(false);
    expect(spansSlots(mcqSection(true, { count: 1 }))).toBe(false);
    expect(spansSlots(mcqSection(true, { allowedTypesJson: '["MCQ"]' }))).toBe(false);
  });
});

describe("slotPlacement for a match in a flexible non-match section", () => {
  it("a 4-pair match takes 4 marks and 4 slots", () => {
    expect(slotPlacement(mcqSection(true), match(4))).toEqual({ marks: 4, subpartsCount: 4 });
  });
  it("class 9+ (not flexible) still counts it as one slot, one mark", () => {
    expect(slotPlacement(mcqSection(false), match(4))).toEqual({ marks: 1, subpartsCount: undefined });
  });
  it("a match whose pairs cannot be read counts as one slot, never 0 or NaN", () => {
    expect(slotPlacement(mcqSection(true), { type: "MATCH_COLUMN", text: "x", options: [] })).toEqual({ marks: 1, subpartsCount: undefined });
  });
  it("more pairs than the section has slots is capped at the section count", () => {
    expect(slotPlacement(mcqSection(true), match(9))).toEqual({ marks: 5, subpartsCount: 5 });
  });
});

describe("whyCannotAdd and paperStatus for spanning matches", () => {
  const bp = (flexible = true): BlueprintDef =>
    ({ sections: [mcqSection(flexible)], chapters: [{ chapterId: "c1", marks: 5 }] }) as unknown as BlueprintDef;
  const placed = (units: number) => ({ sectionId: "s1", chapterId: "c1", type: "MATCH_COLUMN", marks: units, subpartsCount: units }) as never;
  const cand = (n: number) => ({ sectionId: "s1", chapterId: "c1", type: "MATCH_COLUMN", ...slotPlacement(mcqSection(true), match(n)) });

  it("refuses a 4-pair match when only 2 slots are free", () => {
    const reason = whyCannotAdd(bp(), [placed(3)], cand(4));
    expect(reason).toMatch(/Section A/);
    expect(reason).toMatch(/slots/);
  });
  it("accepts it when 4 slots are free, with marks 4 on a 1-mark section", () => {
    expect(whyCannotAdd(bp(), [], cand(4))).toBeNull();
  });
  it("counts the match as 4 filled slots and 4 used marks", () => {
    const s = paperStatus(bp(), [placed(4)]);
    expect(s.sections[0]).toMatchObject({ needed: 5, filled: 4 });
    expect(s.usedMarks).toBe(4);
  });
});

describe("isFlexibleClass / withEffectiveAllowedTypes", () => {
  it("up to class 8 is flexible, class 9 is not", () => {
    expect(isFlexibleClass("Class 8", "MCQ")).toBe(true);
    expect(isFlexibleClass("Class 9", "MCQ")).toBe(false);
    expect(isFlexibleClass("Class 12", "MCQ")).toBe(false);
  });
  it("unreadable class (Nursery) is flexible except kindergarten-typed sections", () => {
    expect(isFlexibleClass("Nursery", "MCQ")).toBe(true);
    expect(isFlexibleClass("Nursery", "KDG_PICTURE_MATCH")).toBe(false);
  });
  it("withEffectiveAllowedTypes sets the flag from the book", () => {
    const sec: { type: string; marksEach: number; allowedTypesJson?: string | null; flexible?: boolean } = { type: "MCQ", marksEach: 1, allowedTypesJson: "[]" };
    expect(withEffectiveAllowedTypes(sec, { className: "Class 6", subject: "English" }).flexible).toBe(true);
    expect(withEffectiveAllowedTypes(sec, { className: "Class 10", subject: "English" }).flexible).toBe(false);
  });
});

import { sectionItemsFormula, spanningSectionTotals } from "./flexibleMarksPrint";

describe("printed section formula with a spanning match", () => {
  const sec = mcqSection(true);
  const mcq = { type: "MCQ", text: "q", options: ["a", "b"] };
  it("is the true count and marks, not 'count x marks each'", () => {
    expect(spanningSectionTotals(sec, [match(4), mcq])).toEqual({ count: 2, marks: 5 });
    expect(sectionItemsFormula(sec, [match(4), mcq], "5 questions × 1 mark = 5 marks")).toBe("2 Questions · 5 Marks");
  });
  it("leaves the usual formula when no match spans slots", () => {
    expect(spanningSectionTotals(sec, [mcq, mcq])).toBeNull();
    expect(sectionItemsFormula(sec, [mcq, mcq], "usual")).toBe("usual");
    expect(sectionItemsFormula(mcqSection(false), [match(4), mcq], "usual")).toBe("usual");
  });
});
